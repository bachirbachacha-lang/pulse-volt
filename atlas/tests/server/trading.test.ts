import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { backtest, parseCsv, rsi, sma, syntheticBars, type Bar } from "../../server/trading/engine.js";
import { makeApp } from "./helpers.js";

const flat = (closes: number[]): Bar[] => closes.map((c, i) => ({ ts: new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10), open: c, high: c, low: c, close: c, volume: 0 }));

describe("indicators", () => {
  it("computes SMA", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
  it("RSI is 100 on a pure uptrend and in range otherwise", () => {
    const up = Array.from({ length: 30 }, (_, i) => i + 1);
    expect(rsi(up, 14)[20]).toBe(100);
    const vals = rsi(syntheticBars(200).map((b) => b.close), 14).filter((v): v is number => v !== null);
    expect(vals.every((v) => v >= 0 && v <= 100)).toBe(true);
  });
});

describe("backtest engine", () => {
  it("buy & hold with no costs matches the benchmark from the second bar's open", () => {
    const bars = flat(Array.from({ length: 60 }, (_, i) => 100 + i));
    const r = backtest(bars, { strategy: "buy_hold", params: {}, startingCash: 1000, feeBps: 0, slippageBps: 0 });
    // Entry at bar 1 open (101), final close 159.
    expect(r.metrics.finalEquity).toBeCloseTo((1000 / 101) * 159, 2);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].exitTs).toBeNull();
  });

  it("fills on the next bar (no look-ahead)", () => {
    // Price jumps on bar 40; a crossover strategy cannot have bought at the pre-jump price on that same bar.
    const closes = [...Array(40).fill(100), ...Array(30).fill(200)];
    const bars = closes.map((c, i) => ({ ts: new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10), open: i === 40 ? 200 : c, high: c, low: c, close: c, volume: 0 }));
    const r = backtest(bars, { strategy: "sma_cross", params: { fast: 3, slow: 10 }, startingCash: 1000, feeBps: 0, slippageBps: 0 });
    expect(r.trades[0].entryTs > bars[40].ts).toBe(true);
    expect(r.trades[0].entryPrice).toBe(200);
  });

  it("charges fees", () => {
    const bars = flat(Array.from({ length: 60 }, () => 100));
    const r = backtest(bars, { strategy: "buy_hold", params: {}, startingCash: 1000, feeBps: 100, slippageBps: 0 });
    expect(r.metrics.finalEquity).toBeLessThan(1000);
  });

  it("rejects bad parameters", () => {
    const bars = syntheticBars(100);
    expect(() => backtest(bars, { strategy: "sma_cross", params: { fast: 50, slow: 20 }, startingCash: 1000, feeBps: 0, slippageBps: 0 })).toThrow(/shorter/);
    expect(() => backtest(bars.slice(0, 10), { strategy: "buy_hold", params: {}, startingCash: 1000, feeBps: 0, slippageBps: 0 })).toThrow(/30 bars/);
  });

  it("parses CSV with Adj Close and sorts by date", () => {
    const csv = "Date,Open,High,Low,Close,Adj Close,Volume\n2024-01-03,2,3,1,2.5,2.5,100\n2024-01-02,1,2,0.5,1.5,1.5,50\nbad,row\n";
    const bars = parseCsv(csv);
    expect(bars.map((b) => b.ts)).toEqual(["2024-01-02", "2024-01-03"]);
    expect(bars[1].close).toBe(2.5);
  });
});

describe("trading API", () => {
  let t: Awaited<ReturnType<typeof makeApp>>;
  beforeAll(async () => (t = await makeApp()));
  afterAll(async () => t.close());

  it("runs a backtest on the synthetic sample and stores it", async () => {
    const ds = (await t.post("/api/trading/datasets/sample")).json;
    const r = await t.post("/api/trading/backtests", { dataset_id: ds.id, strategy: "rsi_reversion", params: { period: 14, buyBelow: 30, sellAbove: 55 } });
    expect(r.status).toBe(201);
    expect(r.json.equity.length).toBe(ds.bars);
    expect((await t.get(`/api/trading/backtests/${r.json.id}`)).json.trades.length).toBe(r.json.trades.length);
  });

  it("paper trading enforces cash and holdings", async () => {
    const acct = (await t.post("/api/trading/paper", { name: "Practice", starting_cash: 1000 })).json.account;
    expect((await t.post(`/api/trading/paper/${acct.id}/orders`, { symbol: "ABC", side: "buy", qty: 20, price: 100 })).status).toBe(400);
    const s1 = (await t.post(`/api/trading/paper/${acct.id}/orders`, { symbol: "abc", side: "buy", qty: 5, price: 100 })).json;
    expect(s1.cash).toBe(500);
    expect((await t.post(`/api/trading/paper/${acct.id}/orders`, { symbol: "ABC", side: "sell", qty: 6, price: 110 })).status).toBe(400);
    await t.post(`/api/trading/paper/${acct.id}/quotes`, { symbol: "ABC", price: 120 });
    const s2 = (await t.get(`/api/trading/paper/${acct.id}`)).json;
    expect(s2.equity).toBe(1100);
    const s3 = (await t.post(`/api/trading/paper/${acct.id}/orders`, { symbol: "ABC", side: "sell", qty: 5, price: 120 })).json;
    expect(s3.cash).toBe(1100);
    expect(s3.positions[0].realized).toBe(100);
  });
});
