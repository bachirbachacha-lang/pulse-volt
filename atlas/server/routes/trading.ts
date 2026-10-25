import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { json, now, tx } from "../db/index.js";
import { logActivity } from "../lib/activity.js";
import { badRequest, notConfigured, notFound } from "../lib/errors.js";
import { requireConfirm } from "../lib/security.js";
import { idParam, parse } from "../lib/validate.js";
import { backtest, parseCsv, syntheticBars, type Bar } from "../trading/engine.js";

const symbolRe = /^[A-Za-z0-9.\-_^=]{1,20}$/;

export function insertDataset(ctx: AppContext, symbol: string, name: string, source: string, bars: Bar[]) {
  return tx(ctx.db, () => {
    const id = Number(ctx.db.prepare("INSERT INTO datasets (symbol, name, source, created_at) VALUES (?, ?, ?, ?)").run(symbol.toUpperCase(), name, source, now()).lastInsertRowid);
    const ins = ctx.db.prepare("INSERT OR REPLACE INTO bars (dataset_id, ts, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)");
    for (const b of bars) ins.run(id, b.ts, b.open, b.high, b.low, b.close, b.volume);
    return id;
  });
}

interface Position {
  symbol: string;
  qty: number;
  avgCost: number;
  realized: number;
  price: number | null;
  value: number | null;
  unrealized: number | null;
}

export function accountState(ctx: AppContext, accountId: number) {
  const acct = ctx.db.prepare("SELECT * FROM paper_accounts WHERE id = ?").get(accountId) as any;
  if (!acct) throw notFound("Paper account");
  const orders = ctx.db.prepare("SELECT * FROM paper_orders WHERE account_id = ? ORDER BY id").all(accountId) as any[];
  const quotes = new Map((ctx.db.prepare("SELECT symbol, price, updated_at FROM paper_quotes WHERE account_id = ?").all(accountId) as any[]).map((q) => [q.symbol, q]));
  let cash = acct.starting_cash;
  const pos = new Map<string, { qty: number; cost: number; realized: number }>();
  for (const o of orders) {
    const p = pos.get(o.symbol) ?? { qty: 0, cost: 0, realized: 0 };
    if (o.side === "buy") {
      cash -= o.qty * o.price + o.fee;
      p.cost += o.qty * o.price + o.fee;
      p.qty += o.qty;
    } else {
      const avg = p.qty ? p.cost / p.qty : 0;
      cash += o.qty * o.price - o.fee;
      p.realized += o.qty * (o.price - avg) - o.fee;
      p.cost -= avg * o.qty;
      p.qty -= o.qty;
    }
    pos.set(o.symbol, p);
  }
  const positions: Position[] = [...pos.entries()].map(([symbol, p]) => {
    const q = quotes.get(symbol);
    const qty = Math.abs(p.qty) < 1e-9 ? 0 : p.qty;
    const avgCost = qty ? p.cost / qty : 0;
    return { symbol, qty, avgCost, realized: p.realized, price: q?.price ?? null, value: q ? qty * q.price : null, unrealized: q && qty ? qty * (q.price - avgCost) : qty ? null : 0, quotedAt: q?.updated_at ?? null } as Position;
  });
  const invested = positions.reduce((a, p) => a + (p.value ?? p.qty * p.avgCost), 0);
  return { account: acct, cash, positions, orders: orders.slice().reverse(), equity: cash + invested, missingQuotes: positions.filter((p) => p.qty && p.price === null).map((p) => p.symbol) };
}

export function tradingRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db } = ctx;

  // ---- Datasets ----
  app.get("/api/trading/datasets", async () =>
    db.prepare("SELECT d.*, COUNT(b.ts) AS bars, MIN(b.ts) AS first, MAX(b.ts) AS last, (SELECT close FROM bars x WHERE x.dataset_id = d.id ORDER BY ts DESC LIMIT 1) AS last_close FROM datasets d LEFT JOIN bars b ON b.dataset_id = d.id GROUP BY d.id ORDER BY d.id DESC").all(),
  );
  app.get("/api/trading/datasets/:id/bars", async (req) => {
    const id = idParam(req.params);
    if (!db.prepare("SELECT 1 FROM datasets WHERE id = ?").get(id)) throw notFound("Dataset");
    return db.prepare("SELECT ts, open, high, low, close, volume FROM bars WHERE dataset_id = ? ORDER BY ts").all(id);
  });
  app.post("/api/trading/datasets/csv", async (req, reply) => {
    const b = parse(z.object({ symbol: z.string().regex(symbolRe, "Symbol: letters, numbers, . - _ only"), name: z.string().max(200).default(""), csv: z.string().min(10).max(20_000_000) }), req.body);
    let bars: Bar[];
    try {
      bars = parseCsv(b.csv);
    } catch (e) {
      throw badRequest(e instanceof Error ? e.message : "Could not read CSV");
    }
    const id = insertDataset(ctx, b.symbol, b.name || b.symbol, "csv", bars);
    logActivity(db, "trading", "dataset.imported", `Imported ${bars.length} bars of ${b.symbol.toUpperCase()} from CSV`);
    reply.code(201);
    return { id, bars: bars.length };
  });
  app.post("/api/trading/datasets/sample", async (_req, reply) => {
    const bars = syntheticBars();
    const id = insertDataset(ctx, "SYNTH", "Synthetic sample (not real market data)", "synthetic", bars);
    reply.code(201);
    return { id, bars: bars.length };
  });
  app.post("/api/trading/datasets/alphavantage", async (req, reply) => {
    const b = parse(z.object({ symbol: z.string().regex(symbolRe) }), req.body);
    const key = ctx.config.alphaVantageKey;
    if (!key) throw notConfigured("Add ALPHAVANTAGE_API_KEY to atlas/.env to download prices, or import a CSV instead.");
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&outputsize=compact&symbol=${encodeURIComponent(b.symbol)}&apikey=${encodeURIComponent(key)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = (await res.json()) as Record<string, any>;
    const series = data["Time Series (Daily)"];
    if (!series) throw badRequest(data["Error Message"] ?? data.Note ?? data.Information ?? "No data returned");
    const bars: Bar[] = Object.entries(series)
      .map(([ts, v]: [string, any]) => ({ ts, open: +v["1. open"], high: +v["2. high"], low: +v["3. low"], close: +v["4. close"], volume: +v["5. volume"] }))
      .sort((x, y) => x.ts.localeCompare(y.ts));
    const id = insertDataset(ctx, b.symbol, b.symbol.toUpperCase(), "alphavantage", bars);
    logActivity(db, "trading", "dataset.imported", `Downloaded ${bars.length} days of ${b.symbol.toUpperCase()} (Alpha Vantage)`);
    reply.code(201);
    return { id, bars: bars.length };
  });
  app.delete("/api/trading/datasets/:id", async (req) => {
    const id = idParam(req.params);
    const d = db.prepare("SELECT * FROM datasets WHERE id = ?").get(id) as any;
    if (!d) throw notFound("Dataset");
    requireConfirm(req, `delete dataset ${d.symbol} and its backtests`);
    db.prepare("DELETE FROM datasets WHERE id = ?").run(id);
    return { ok: true };
  });

  // ---- Backtests ----
  const btInput = z.object({
    dataset_id: z.number().int().positive(),
    strategy: z.enum(["buy_hold", "sma_cross", "rsi_reversion", "breakout"]),
    params: z.object({ fast: z.number().optional(), slow: z.number().optional(), period: z.number().optional(), buyBelow: z.number().min(1).max(99).optional(), sellAbove: z.number().min(1).max(99).optional(), lookback: z.number().optional() }).default({}),
    starting_cash: z.number().positive().max(1e12).default(10000),
    fee_bps: z.number().min(0).max(500).default(10),
    slippage_bps: z.number().min(0).max(500).default(5),
    from: z.string().optional(),
    to: z.string().optional(),
  });
  app.post("/api/trading/backtests", async (req, reply) => {
    const b = parse(btInput, req.body);
    const ds = db.prepare("SELECT * FROM datasets WHERE id = ?").get(b.dataset_id) as any;
    if (!ds) throw notFound("Dataset");
    const bars = db.prepare("SELECT ts, open, high, low, close, volume FROM bars WHERE dataset_id = ? AND (? IS NULL OR ts >= ?) AND (? IS NULL OR ts <= ?) ORDER BY ts").all(b.dataset_id, b.from ?? null, b.from ?? null, b.to ?? null, b.to ?? null) as unknown as Bar[];
    let result;
    try {
      result = backtest(bars, { strategy: b.strategy, params: b.params, startingCash: b.starting_cash, feeBps: b.fee_bps, slippageBps: b.slippage_bps });
    } catch (e) {
      throw badRequest(e instanceof Error ? e.message : "Backtest failed");
    }
    const params = { ...b.params, starting_cash: b.starting_cash, fee_bps: b.fee_bps, slippage_bps: b.slippage_bps, from: b.from, to: b.to };
    const id = Number(db.prepare("INSERT INTO backtests (dataset_id, strategy, params, metrics, equity, trades, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(b.dataset_id, b.strategy, JSON.stringify(params), JSON.stringify({ ...result.metrics, warnings: result.warnings }), JSON.stringify(result.equity), JSON.stringify(result.trades), now()).lastInsertRowid);
    logActivity(db, "trading", "backtest.run", `Backtested ${b.strategy} on ${ds.symbol}: ${result.metrics.totalReturnPct}% (buy & hold ${result.metrics.benchmarkReturnPct}%)`);
    reply.code(201);
    return { id, strategy: b.strategy, ...result, dataset: ds };
  });
  app.get("/api/trading/backtests", async () =>
    (db.prepare("SELECT b.id, b.dataset_id, d.symbol, b.strategy, b.params, b.metrics, b.created_at FROM backtests b JOIN datasets d ON d.id = b.dataset_id ORDER BY b.id DESC LIMIT 100").all() as any[]).map((r) => ({ ...r, params: json(r.params, {}), metrics: json(r.metrics, {}) })),
  );
  app.get("/api/trading/backtests/:id", async (req) => {
    const r = db.prepare("SELECT b.*, d.symbol FROM backtests b JOIN datasets d ON d.id = b.dataset_id WHERE b.id = ?").get(idParam(req.params)) as any;
    if (!r) throw notFound("Backtest");
    const metrics = json<Record<string, unknown>>(r.metrics, {});
    return { ...r, params: json(r.params, {}), metrics, warnings: (metrics.warnings as string[]) ?? [], equity: json(r.equity, []), trades: json(r.trades, []) };
  });
  app.delete("/api/trading/backtests/:id", async (req) => {
    requireConfirm(req, "delete this backtest");
    db.prepare("DELETE FROM backtests WHERE id = ?").run(idParam(req.params));
    return { ok: true };
  });

  // ---- Paper trading ----
  app.get("/api/trading/paper", async () =>
    (db.prepare("SELECT id FROM paper_accounts ORDER BY id").all() as any[]).map((a) => {
      const s = accountState(ctx, a.id);
      return { ...s.account, cash: s.cash, equity: s.equity, positions: s.positions.filter((p) => p.qty).length };
    }),
  );
  app.post("/api/trading/paper", async (req, reply) => {
    const b = parse(z.object({ name: z.string().trim().min(1).max(100), starting_cash: z.number().positive().max(1e12) }), req.body);
    const id = Number(db.prepare("INSERT INTO paper_accounts (name, starting_cash, created_at) VALUES (?, ?, ?)").run(b.name, b.starting_cash, now()).lastInsertRowid);
    logActivity(db, "trading", "paper.created", `Opened paper account "${b.name}" with ${b.starting_cash} virtual cash`);
    reply.code(201);
    return accountState(ctx, id);
  });
  app.get("/api/trading/paper/:id", async (req) => accountState(ctx, idParam(req.params)));
  app.delete("/api/trading/paper/:id", async (req) => {
    const id = idParam(req.params);
    const a = accountState(ctx, id).account;
    requireConfirm(req, `delete paper account "${a.name}" and its history`);
    db.prepare("DELETE FROM paper_accounts WHERE id = ?").run(id);
    return { ok: true };
  });
  app.post("/api/trading/paper/:id/quotes", async (req) => {
    const id = idParam(req.params);
    accountState(ctx, id);
    const b = parse(z.object({ symbol: z.string().regex(symbolRe), price: z.number().positive().optional(), dataset_id: z.number().int().optional() }), req.body);
    let price = b.price;
    if (!price && b.dataset_id) price = (db.prepare("SELECT close FROM bars WHERE dataset_id = ? ORDER BY ts DESC LIMIT 1").get(b.dataset_id) as any)?.close;
    if (!price) throw badRequest("Give a price or a dataset to take the latest close from");
    db.prepare("INSERT INTO paper_quotes (account_id, symbol, price, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(account_id, symbol) DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at").run(id, b.symbol.toUpperCase(), price, now());
    return accountState(ctx, id);
  });
  app.post("/api/trading/paper/:id/orders", async (req, reply) => {
    const id = idParam(req.params);
    const b = parse(z.object({ symbol: z.string().regex(symbolRe), side: z.enum(["buy", "sell"]), qty: z.number().positive().max(1e9), price: z.number().positive().max(1e9), fee: z.number().min(0).default(0), note: z.string().max(500).default("") }), req.body);
    const sym = b.symbol.toUpperCase();
    const st = accountState(ctx, id);
    if (b.side === "buy" && b.qty * b.price + b.fee > st.cash + 1e-9) throw badRequest(`Not enough virtual cash: need ${(b.qty * b.price + b.fee).toFixed(2)}, have ${st.cash.toFixed(2)}`);
    if (b.side === "sell") {
      const held = st.positions.find((p) => p.symbol === sym)?.qty ?? 0;
      if (b.qty > held + 1e-9) throw badRequest(`You hold ${held} ${sym}; short selling is not supported`);
    }
    tx(db, () => {
      db.prepare("INSERT INTO paper_orders (account_id, symbol, side, qty, price, fee, note, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, sym, b.side, b.qty, b.price, b.fee, b.note, now());
      db.prepare("INSERT INTO paper_quotes (account_id, symbol, price, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(account_id, symbol) DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at").run(id, sym, b.price, now());
    });
    logActivity(db, "trading", "paper.order", `Paper ${b.side} ${b.qty} ${sym} @ ${b.price}`);
    reply.code(201);
    return accountState(ctx, id);
  });
}
