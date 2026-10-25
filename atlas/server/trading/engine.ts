export interface Bar {
  ts: string; // ISO date
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type StrategyId = "buy_hold" | "sma_cross" | "rsi_reversion" | "breakout";

export interface StrategyParams {
  fast?: number;
  slow?: number;
  period?: number;
  buyBelow?: number;
  sellAbove?: number;
  lookback?: number;
}

export interface BacktestOptions {
  strategy: StrategyId;
  params: StrategyParams;
  startingCash: number;
  feeBps: number; // per side, e.g. 10 = 0.10%
  slippageBps: number; // per side, applied against you
}

export interface Trade {
  entryTs: string;
  entryPrice: number;
  exitTs: string | null;
  exitPrice: number | null;
  qty: number;
  pnl: number | null;
  returnPct: number | null;
}

export interface BacktestResult {
  equity: { ts: string; equity: number; benchmark: number }[];
  trades: Trade[];
  metrics: Record<string, number | null>;
  warnings: string[];
}

export function sma(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

/** Wilder's RSI. */
export function rsi(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= n) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= n;
  loss /= n;
  out[n] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = n + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

/**
 * Desired position (true = long) decided on the close of bar i.
 * The engine fills that decision at the NEXT bar's open, so strategies never trade on information they could not have had.
 */
function signals(bars: Bar[], s: StrategyId, p: StrategyParams): boolean[] {
  const close = bars.map((b) => b.close);
  const want: boolean[] = new Array(bars.length).fill(false);
  if (s === "buy_hold") return want.fill(true);
  if (s === "sma_cross") {
    const fast = sma(close, p.fast ?? 20);
    const slow = sma(close, p.slow ?? 50);
    for (let i = 0; i < bars.length; i++) want[i] = fast[i] !== null && slow[i] !== null && fast[i]! > slow[i]!;
    return want;
  }
  if (s === "rsi_reversion") {
    const r = rsi(close, p.period ?? 14);
    let inPos = false;
    for (let i = 0; i < bars.length; i++) {
      const v = r[i];
      if (v !== null) {
        if (!inPos && v < (p.buyBelow ?? 30)) inPos = true;
        else if (inPos && v > (p.sellAbove ?? 55)) inPos = false;
      }
      want[i] = inPos;
    }
    return want;
  }
  if (s === "breakout") {
    const n = p.lookback ?? 20;
    const exitN = Math.max(2, Math.floor(n / 2));
    let inPos = false;
    for (let i = 0; i < bars.length; i++) {
      if (i >= n) {
        const hi = Math.max(...bars.slice(i - n, i).map((b) => b.high));
        const lo = Math.min(...bars.slice(i - exitN, i).map((b) => b.low));
        if (!inPos && bars[i].close > hi) inPos = true;
        else if (inPos && bars[i].close < lo) inPos = false;
      }
      want[i] = inPos;
    }
    return want;
  }
  throw new Error(`Unknown strategy ${s}`);
}

export function validateParams(s: StrategyId, p: StrategyParams) {
  const int = (v: number | undefined, lo: number, hi: number, name: string) => {
    if (v === undefined) return;
    if (!Number.isInteger(v) || v < lo || v > hi) throw new Error(`${name} must be a whole number from ${lo} to ${hi}`);
  };
  int(p.fast, 2, 400, "Fast period");
  int(p.slow, 3, 500, "Slow period");
  int(p.period, 2, 100, "RSI period");
  int(p.lookback, 3, 400, "Lookback");
  if (s === "sma_cross" && (p.fast ?? 20) >= (p.slow ?? 50)) throw new Error("Fast period must be shorter than slow period");
  if (s === "rsi_reversion" && (p.buyBelow ?? 30) >= (p.sellAbove ?? 55)) throw new Error("Buy level must be below sell level");
}

export function backtest(bars: Bar[], o: BacktestOptions): BacktestResult {
  validateParams(o.strategy, o.params);
  const warnings: string[] = [];
  if (bars.length < 30) throw new Error("Need at least 30 bars of data to backtest");
  const want = signals(bars, o.strategy, o.params);
  const fee = o.feeBps / 10_000;
  const slip = o.slippageBps / 10_000;

  let cash = o.startingCash;
  let qty = 0;
  let open: Trade | null = null;
  let entryCost = 0;
  const trades: Trade[] = [];
  const equity: BacktestResult["equity"] = [];
  const benchQty = o.startingCash / bars[0].close;
  let barsInMarket = 0;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    // Fill yesterday's decision at today's open.
    if (i > 0) {
      const desired = want[i - 1];
      if (desired && qty === 0) {
        const px = bar.open * (1 + slip);
        qty = cash / (px * (1 + fee));
        entryCost = qty * px * (1 + fee);
        cash -= entryCost;
        open = { entryTs: bar.ts, entryPrice: px, exitTs: null, exitPrice: null, qty, pnl: null, returnPct: null };
      } else if (!desired && qty > 0 && open) {
        const px = bar.open * (1 - slip);
        const proceeds = qty * px * (1 - fee);
        cash += proceeds;
        open.exitTs = bar.ts;
        open.exitPrice = px;
        open.pnl = proceeds - entryCost;
        open.returnPct = (proceeds / entryCost - 1) * 100;
        trades.push(open);
        open = null;
        qty = 0;
      }
    }
    if (qty > 0) barsInMarket++;
    equity.push({ ts: bar.ts, equity: cash + qty * bar.close, benchmark: benchQty * bar.close });
  }
  if (open) {
    const last = bars[bars.length - 1];
    const value = qty * last.close * (1 - fee);
    open.pnl = value - entryCost;
    open.returnPct = (value / entryCost - 1) * 100;
    trades.push(open); // still open: exitTs stays null
  }

  const finalEq = equity[equity.length - 1].equity;
  const rets: number[] = [];
  for (let i = 1; i < equity.length; i++) rets.push(equity[i].equity / equity[i - 1].equity - 1);
  const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length - 1));
  let peak = -Infinity;
  let maxDD = 0;
  for (const e of equity) {
    peak = Math.max(peak, e.equity);
    maxDD = Math.min(maxDD, e.equity / peak - 1);
  }
  const days = (Date.parse(bars[bars.length - 1].ts) - Date.parse(bars[0].ts)) / 86_400_000;
  const years = days / 365.25;
  const closed = trades.filter((t) => t.exitTs);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
  const r2 = (v: number) => Math.round(v * 100) / 100;
  if (years < 1) warnings.push("Less than a year of data: annualised numbers are unreliable.");
  if (closed.length < 10 && o.strategy !== "buy_hold") warnings.push(`Only ${closed.length} completed trades: too few to judge the strategy.`);

  return {
    equity,
    trades,
    warnings,
    metrics: {
      startingCash: o.startingCash,
      finalEquity: r2(finalEq),
      totalReturnPct: r2((finalEq / o.startingCash - 1) * 100),
      benchmarkReturnPct: r2((equity[equity.length - 1].benchmark / o.startingCash - 1) * 100),
      cagrPct: years > 0 ? r2((Math.pow(finalEq / o.startingCash, 1 / years) - 1) * 100) : null,
      maxDrawdownPct: r2(maxDD * 100),
      sharpe: sd > 0 ? r2((mean / sd) * Math.sqrt(252)) : null,
      volatilityPct: r2(sd * Math.sqrt(252) * 100),
      trades: trades.length,
      winRatePct: closed.length ? r2((wins.length / closed.length) * 100) : null,
      avgTradePct: closed.length ? r2(closed.reduce((a, t) => a + (t.returnPct ?? 0), 0) / closed.length) : null,
      exposurePct: r2((barsInMarket / bars.length) * 100),
      bars: bars.length,
    },
  };
}

/** Parses OHLCV CSV with a header row (Date,Open,High,Low,Close[,Adj Close][,Volume]). */
export function parseCsv(text: string): Bar[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV has no data rows");
  const delim = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const head = lines[0].split(delim).map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const iDate = col("date", "time", "timestamp", "datetime");
  const iO = col("open", "o");
  const iH = col("high", "h");
  const iL = col("low", "l");
  const iC = col("close", "c", "price");
  const iV = col("volume", "vol", "v");
  if (iDate < 0 || iC < 0) throw new Error("CSV needs at least Date and Close columns");
  const bars: Bar[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
    const rawDate = cells[iDate];
    const d = /^\d{10,13}$/.test(rawDate) ? new Date(Number(rawDate) * (rawDate.length === 10 ? 1000 : 1)) : new Date(rawDate);
    const close = Number(cells[iC]);
    if (Number.isNaN(d.getTime()) || !Number.isFinite(close) || close <= 0) continue;
    const num = (i: number) => (i >= 0 && Number.isFinite(Number(cells[i])) && Number(cells[i]) > 0 ? Number(cells[i]) : close);
    bars.push({ ts: d.toISOString().slice(0, 10), open: num(iO), high: num(iH), low: num(iL), close, volume: iV >= 0 ? Number(cells[iV]) || 0 : 0 });
  }
  if (bars.length < 2) throw new Error("No valid rows found in CSV");
  bars.sort((a, b) => a.ts.localeCompare(b.ts));
  // Drop duplicate dates (keep last).
  return bars.filter((b, i) => i === bars.length - 1 || bars[i + 1].ts !== b.ts);
}

/** Deterministic synthetic price series for trying the tools. Clearly not real market data. */
export function syntheticBars(days = 750, seed = 42, start = 100): Bar[] {
  let s = seed >>> 0;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  const bars: Bar[] = [];
  let price = start;
  const d = new Date(Date.UTC(2023, 0, 2));
  let regime = 0.0004;
  while (bars.length < days) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) {
      if (rand() < 0.01) regime = (rand() - 0.45) * 0.002;
      const ret = regime + gauss() * 0.017;
      const open = price * (1 + gauss() * 0.004);
      const close = Math.max(1, open * (1 + ret));
      const high = Math.max(open, close) * (1 + Math.abs(gauss()) * 0.006);
      const low = Math.min(open, close) * (1 - Math.abs(gauss()) * 0.006);
      bars.push({ ts: d.toISOString().slice(0, 10), open, high, low, close, volume: Math.round(1e6 * (0.5 + rand())) });
      price = close;
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return bars;
}
