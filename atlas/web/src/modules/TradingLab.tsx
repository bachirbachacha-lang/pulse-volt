import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CandlestickChart, Database, Download, FlaskConical, Play, Plus, Trash2, Upload, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LineChart } from "../components/ui/charts";
import { Modal, useAction, useConfirm } from "../components/ui/overlay";
import { Badge, Button, Card, CardHeader, cx, EmptyState, ErrorNote, Field, Input, NeedsSetup, PageHeader, Select, Spinner, Stat, Tabs } from "../components/ui/primitives";
import { del, get, post } from "../lib/api";
import { ago, money, pct } from "../lib/format";

type Tab = "research" | "backtest" | "paper";

function ImportModal({ open, onClose, onDone, avReady }: { open: boolean; onClose: () => void; onDone: (id: number) => void; avReady: boolean }) {
  const [symbol, setSymbol] = useState("");
  const [csv, setCsv] = useState("");
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fn();
      onDone(r.id);
      setCsv("");
      setSymbol("");
      onClose();
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add price data" wide>
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">1. Import a CSV (works offline)</h3>
          <p className="text-sm text-muted">Columns: Date, Open, High, Low, Close, Volume. Download daily history as CSV from your broker or a finance site, then pick the file.</p>
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <Field label="Symbol" htmlFor="imp-sym"><Input id="imp-sym" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="AAPL" /></Field>
            <Field label="CSV file" htmlFor="imp-file">
              <div className="flex gap-2">
                <Button id="imp-file" icon={Upload} onClick={() => file.current?.click()}>{csv ? `${csv.split("\n").length - 1} rows loaded` : "Choose file"}</Button>
                <input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => setCsv((await e.target.files?.[0]?.text()) ?? "")} />
              </div>
            </Field>
          </div>
          <Button variant="primary" loading={busy} disabled={!symbol || !csv} onClick={() => run(() => post("/api/trading/datasets/csv", { symbol, csv }))}>Import CSV</Button>
        </section>
        <section className="space-y-3 border-t border-line pt-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">2. Download from Alpha Vantage {!avReady && <NeedsSetup what="ALPHAVANTAGE_API_KEY" />}</h3>
          <p className="text-sm text-muted">Last ~100 trading days for a stock symbol. Needs a free API key in <code>atlas/.env</code>.</p>
          <Button disabled={!avReady || !symbol} loading={busy} icon={Download} onClick={() => run(() => post("/api/trading/datasets/alphavantage", { symbol }))}>Download {symbol || "symbol"}</Button>
        </section>
        <section className="space-y-3 border-t border-line pt-4">
          <h3 className="text-sm font-semibold">3. Practice data</h3>
          <p className="text-sm text-muted">A computer-generated price series, clearly labelled <b>SYNTH</b>. Good for learning the tools. It is not real market data.</p>
          <Button loading={busy} onClick={() => run(() => post("/api/trading/datasets/sample"))}>Add synthetic sample</Button>
        </section>
        <ErrorNote error={err} />
      </div>
    </Modal>
  );
}

function Research({ datasets, onImport }: { datasets: any[]; onImport: () => void }) {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const act = useAction();
  const confirm = useConfirm();
  const id = Number(params.get("dataset")) || datasets[0]?.id;
  const ds = datasets.find((d) => d.id === id);
  const bars = useQuery({ queryKey: ["bars", id], queryFn: () => get<any[]>(`/api/trading/datasets/${id}/bars`), enabled: Boolean(id) });
  if (!datasets.length) return <Card><EmptyState icon={Database} title="No price data yet" action={<Button variant="primary" icon={Plus} onClick={onImport}>Add price data</Button>}>Import a CSV, download from Alpha Vantage, or add a synthetic practice series.</EmptyState></Card>;
  const b = bars.data ?? [];
  const closes = b.map((x) => x.close);
  const sma = (n: number) => closes.map((_, i) => (i < n - 1 ? NaN : closes.slice(i - n + 1, i + 1).reduce((a, c) => a + c, 0) / n));
  const sma50 = sma(50);
  const first = b.findIndex((_, i) => !Number.isNaN(sma50[i]));
  const last = b.at(-1);
  const change = b.length > 1 ? (last.close / b[0].close - 1) * 100 : null;
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card>
        <CardHeader title="Datasets" actions={<Button size="sm" icon={Plus} onClick={onImport}>Add</Button>} />
        <ul className="p-2">
          {datasets.map((d) => (
            <li key={d.id}>
              <button onClick={() => setParams({ tab: "research", dataset: String(d.id) })} className={cx("w-full rounded-lg px-3 py-2 text-left text-sm", d.id === id ? "bg-accent-soft" : "hover:bg-hover")}>
                <span className="flex items-center gap-2"><b className="font-mono">{d.symbol}</b>{d.source === "synthetic" && <Badge tone="warn">synthetic</Badge>}</span>
                <span className="block text-xs text-muted">{d.bars} bars · {d.first} → {d.last}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader
          title={ds ? `${ds.symbol} · ${ds.name}` : ""}
          subtitle={ds ? `Source: ${ds.source} · imported ${ago(ds.created_at)}` : ""}
          actions={ds && <Button variant="ghost" size="icon-sm" icon={Trash2} aria-label="Delete dataset" onClick={async () => { if (await confirm({ title: `Delete ${ds.symbol}?`, body: "Its price data and backtests are deleted.", danger: true, confirmLabel: "Delete" })) { await act(() => del(`/api/trading/datasets/${ds.id}`), "Deleted"); setParams({ tab: "research" }); qc.invalidateQueries({ queryKey: ["datasets"] }); } }} />}
        />
        {bars.isLoading ? <Spinner className="p-4" /> : (
          <div className="space-y-4 p-4">
            {ds?.source === "synthetic" && <p className="flex items-center gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn"><AlertTriangle className="size-4" /> Synthetic practice data, not a real market.</p>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Last close" value={money(last?.close)} hint={last?.ts} />
              <Stat label="Change (whole period)" value={pct(change)} tone={change == null ? undefined : change >= 0 ? "ok" : "danger"} />
              <Stat label="Period high" value={money(Math.max(...b.map((x) => x.high)))} />
              <Stat label="Period low" value={money(Math.min(...b.map((x) => x.low)))} />
            </div>
            {b.length > 1 && (
              <LineChart
                x={b.map((x) => x.ts)}
                series={[{ name: "Close", color: "var(--color-series-1)", values: closes }, ...(first >= 0 ? [{ name: "50-day average", color: "var(--color-series-2)", values: sma50.map((v, i) => (Number.isNaN(v) ? closes[i] : v)), dashed: true }] : [])]}
                format={(v) => v.toFixed(2)}
              />
            )}
            {first > 0 && <p className="text-xs text-muted">The 50-day average starts on bar 50; before that the line follows the close.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}

const STRATEGIES = {
  buy_hold: { label: "Buy and hold", help: "Buy on day one and never sell. The baseline every strategy must beat.", fields: [] as { key: string; label: string; def: number }[] },
  sma_cross: { label: "Moving-average crossover", help: "Hold while the fast average is above the slow average.", fields: [{ key: "fast", label: "Fast period (days)", def: 20 }, { key: "slow", label: "Slow period (days)", def: 50 }] },
  rsi_reversion: { label: "RSI mean reversion", help: "Buy when RSI drops below a level (oversold), sell when it recovers.", fields: [{ key: "period", label: "RSI period", def: 14 }, { key: "buyBelow", label: "Buy below", def: 30 }, { key: "sellAbove", label: "Sell above", def: 55 }] },
  breakout: { label: "Breakout", help: "Buy when price closes above the recent high; sell below the recent low.", fields: [{ key: "lookback", label: "Lookback (days)", def: 20 }] },
};

function Backtest({ datasets }: { datasets: any[] }) {
  const qc = useQueryClient();
  const act = useAction();
  const history = useQuery({ queryKey: ["backtests"], queryFn: () => get<any[]>("/api/trading/backtests") });
  const [f, setF] = useState<any>({ dataset_id: datasets[0]?.id ?? "", strategy: "sma_cross", starting_cash: 10000, fee_bps: 10, slippage_bps: 5, params: {} });
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!f.dataset_id && datasets[0]) setF((x: any) => ({ ...x, dataset_id: datasets[0].id }));
  }, [datasets, f.dataset_id]);
  const strat = STRATEGIES[f.strategy as keyof typeof STRATEGIES];
  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const params = Object.fromEntries(strat.fields.map((x) => [x.key, Number(f.params[x.key] ?? x.def)]));
      setResult(await post("/api/trading/backtests", { ...f, dataset_id: Number(f.dataset_id), params }));
      qc.invalidateQueries({ queryKey: ["backtests"] });
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  const open = (id: number) => act(async () => setResult(await get(`/api/trading/backtests/${id}`)));
  if (!datasets.length) return <Card><EmptyState icon={FlaskConical} title="Add price data first" >Backtests need a dataset (Research tab).</EmptyState></Card>;
  const m = result?.metrics;
  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Strategy" icon={FlaskConical} />
          <form className="space-y-3 p-4" onSubmit={(e) => (e.preventDefault(), void run())}>
            <Field label="Data" htmlFor="bt-ds"><Select id="bt-ds" value={f.dataset_id} onChange={(e) => setF({ ...f, dataset_id: e.target.value })}>{datasets.map((d) => <option key={d.id} value={d.id}>{d.symbol} ({d.bars} bars){d.source === "synthetic" ? " · synthetic" : ""}</option>)}</Select></Field>
            <Field label="Strategy" htmlFor="bt-s" hint={strat.help}><Select id="bt-s" value={f.strategy} onChange={(e) => setF({ ...f, strategy: e.target.value, params: {} })}>{Object.entries(STRATEGIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
            {strat.fields.map((x) => (
              <Field key={x.key} label={x.label} htmlFor={`bt-${x.key}`}><Input id={`bt-${x.key}`} type="number" value={f.params[x.key] ?? x.def} onChange={(e) => setF({ ...f, params: { ...f.params, [x.key]: e.target.value } })} /></Field>
            ))}
            <div className="grid grid-cols-3 gap-2">
              <Field label="Start cash" htmlFor="bt-cash"><Input id="bt-cash" type="number" value={f.starting_cash} onChange={(e) => setF({ ...f, starting_cash: Number(e.target.value) })} /></Field>
              <Field label="Fee (bps)" htmlFor="bt-fee"><Input id="bt-fee" type="number" value={f.fee_bps} onChange={(e) => setF({ ...f, fee_bps: Number(e.target.value) })} /></Field>
              <Field label="Slip (bps)" htmlFor="bt-slip"><Input id="bt-slip" type="number" value={f.slippage_bps} onChange={(e) => setF({ ...f, slippage_bps: Number(e.target.value) })} /></Field>
            </div>
            <p className="text-xs text-muted">Signals use each day's close; trades fill at the next day's open, with fees and slippage. 10 bps = 0.10%.</p>
            <Button type="submit" variant="primary" icon={Play} loading={busy} className="w-full">Run backtest</Button>
            <ErrorNote error={err} />
          </form>
        </Card>
        <Card>
          <CardHeader title="Past runs" />
          <ul className="max-h-72 overflow-y-auto p-2">
            {(history.data ?? []).map((h) => (
              <li key={h.id}><button onClick={() => open(h.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-hover"><b className="font-mono">{h.symbol}</b><span className="flex-1 truncate text-fg-2">{STRATEGIES[h.strategy as keyof typeof STRATEGIES]?.label}</span><span className={cx("font-mono", h.metrics.totalReturnPct >= 0 ? "text-ok" : "text-danger")}>{pct(h.metrics.totalReturnPct)}</span></button></li>
            ))}
            {!history.data?.length && <p className="p-2 text-sm text-muted">No runs yet.</p>}
          </ul>
        </Card>
      </div>
      <Card>
        {!result ? <EmptyState icon={CandlestickChart} title="Run a backtest to see results">Results compare your strategy with simply buying and holding.</EmptyState> : (
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{STRATEGIES[result.strategy as keyof typeof STRATEGIES]?.label ?? result.strategy} on {result.dataset?.symbol ?? result.symbol}</h2>
              {result.dataset?.source === "synthetic" && <Badge tone="warn">synthetic data</Badge>}
            </div>
            {result.warnings?.map((w: string) => <p key={w} className="flex items-center gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn"><AlertTriangle className="size-4 shrink-0" />{w}</p>)}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="Strategy return" value={pct(m.totalReturnPct)} tone={m.totalReturnPct >= m.benchmarkReturnPct ? "ok" : "danger"} hint={`Final ${money(m.finalEquity)}`} />
              <Stat label="Buy & hold return" value={pct(m.benchmarkReturnPct)} />
              <Stat label="Max drawdown" value={pct(m.maxDrawdownPct)} tone="danger" hint="Worst fall from a peak" />
              <Stat label="Sharpe ratio" value={m.sharpe ?? "—"} hint="Return per unit of risk" />
              <Stat label="Yearly (CAGR)" value={pct(m.cagrPct)} />
              <Stat label="Trades" value={m.trades} hint={m.winRatePct != null ? `${pct(m.winRatePct, 0)} winners` : undefined} />
              <Stat label="Avg trade" value={pct(m.avgTradePct, 2)} />
              <Stat label="Time in market" value={pct(m.exposurePct, 0)} />
            </div>
            <LineChart x={result.equity.map((e: any) => e.ts)} series={[{ name: "Strategy", color: "var(--color-series-1)", values: result.equity.map((e: any) => e.equity) }, { name: "Buy & hold", color: "var(--color-series-2)", values: result.equity.map((e: any) => e.benchmark), dashed: true }]} format={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
            <details className="rounded-lg border border-line">
              <summary className="px-3 py-2 text-sm">Trades ({result.trades.length})</summary>
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-raised text-muted"><tr><th className="px-3 py-1.5">Entry</th><th>Price</th><th>Exit</th><th>Price</th><th className="pr-3 text-right">Return</th></tr></thead>
                  <tbody className="font-mono">
                    {result.trades.map((t: any, i: number) => (
                      <tr key={i} className="border-t border-line"><td className="px-3 py-1">{t.entryTs}</td><td>{money(t.entryPrice)}</td><td>{t.exitTs ?? "open"}</td><td>{t.exitPrice ? money(t.exitPrice) : "—"}</td><td className={cx("pr-3 text-right", (t.returnPct ?? 0) >= 0 ? "text-ok" : "text-danger")}>{pct(t.returnPct, 2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <p className="text-xs text-muted">Past results don't predict future returns. Backtests ignore taxes, dividends and the fact that real fills can be worse.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function Paper({ datasets }: { datasets: any[] }) {
  const qc = useQueryClient();
  const act = useAction();
  const confirm = useConfirm();
  const accounts = useQuery({ queryKey: ["paper"], queryFn: () => get<any[]>("/api/trading/paper") });
  const [sel, setSel] = useState<number | null>(null);
  const id = sel ?? accounts.data?.[0]?.id;
  const st = useQuery({ queryKey: ["paper", id], queryFn: () => get(`/api/trading/paper/${id}`), enabled: Boolean(id) });
  const [newAcct, setNewAcct] = useState({ name: "Practice account", starting_cash: 10000 });
  const [order, setOrder] = useState({ symbol: "", side: "buy", qty: "", price: "", fee: "0" });
  const [quote, setQuote] = useState({ symbol: "", price: "", dataset_id: "" });
  const refresh = () => (qc.invalidateQueries({ queryKey: ["paper"] }));
  const setPriceFromData = (symbol: string) => {
    const d = datasets.find((x) => x.symbol === symbol.toUpperCase());
    if (d) setOrder((o) => ({ ...o, price: String(Number(d.last_close.toFixed(4))) }));
  };
  if (accounts.isLoading) return <Spinner />;
  if (!accounts.data?.length)
    return (
      <Card>
        <EmptyState icon={Wallet} title="Open a paper-trading account" action={
          <form className="flex flex-wrap justify-center gap-2" onSubmit={(e) => (e.preventDefault(), void act(async () => (await post("/api/trading/paper", newAcct), refresh()), "Account opened"))}>
            <Input value={newAcct.name} onChange={(e) => setNewAcct({ ...newAcct, name: e.target.value })} className="w-48" aria-label="Account name" />
            <Input type="number" value={newAcct.starting_cash} onChange={(e) => setNewAcct({ ...newAcct, starting_cash: Number(e.target.value) })} className="w-32" aria-label="Virtual starting cash" />
            <Button type="submit" variant="primary">Open</Button>
          </form>
        }>Practise with virtual money. Nothing is connected to a broker and no real money moves.</EmptyState>
      </Card>
    );
  const s = st.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={id} onChange={(e) => setSel(Number(e.target.value))} className="w-auto" aria-label="Paper account">{accounts.data.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
        <Button size="sm" icon={Plus} onClick={() => act(async () => { const r = await post("/api/trading/paper", { name: `Practice ${accounts.data!.length + 1}`, starting_cash: 10000 }); refresh(); setSel(r.account.id); }, "Account opened")}>New account</Button>
        {s && <Button size="sm" variant="ghost" icon={Trash2} onClick={async () => { if (await confirm({ title: `Delete “${s.account.name}”?`, body: "All its orders are deleted.", danger: true, confirmLabel: "Delete" })) { await act(() => del(`/api/trading/paper/${s.account.id}`), "Deleted"); setSel(null); refresh(); } }}>Delete account</Button>}
      </div>
      {!s ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Account value" value={money(s.equity)} hint={`Started with ${money(s.account.starting_cash)}`} />
            <Stat label="Profit / loss" value={money(s.equity - s.account.starting_cash)} tone={s.equity >= s.account.starting_cash ? "ok" : "danger"} hint={pct((s.equity / s.account.starting_cash - 1) * 100)} />
            <Stat label="Virtual cash" value={money(s.cash)} />
            <Stat label="Positions" value={s.positions.filter((p: any) => p.qty).length} />
          </div>
          {s.missingQuotes.length > 0 && <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">No current price for {s.missingQuotes.join(", ")}: value shown at cost. Update the price below.</p>}
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <Card>
              <CardHeader title="Positions" />
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted"><tr><th className="px-4 py-2">Symbol</th><th>Qty</th><th>Avg cost</th><th>Price</th><th>Value</th><th className="pr-4 text-right">Unrealised</th></tr></thead>
                  <tbody className="font-mono">
                    {s.positions.filter((p: any) => p.qty).map((p: any) => (
                      <tr key={p.symbol} className="border-t border-line"><td className="px-4 py-2 font-sans font-semibold">{p.symbol}</td><td>{+p.qty.toFixed(6)}</td><td>{money(p.avgCost)}</td><td>{money(p.price)}</td><td>{money(p.value)}</td><td className={cx("pr-4 text-right", (p.unrealized ?? 0) >= 0 ? "text-ok" : "text-danger")}>{money(p.unrealized)}</td></tr>
                    ))}
                  </tbody>
                </table>
                {!s.positions.some((p: any) => p.qty) && <p className="p-4 text-sm text-muted">No open positions.</p>}
              </div>
              <CardHeader title="Order history" />
              <ul className="max-h-64 divide-y divide-line overflow-y-auto text-sm">
                {s.orders.map((o: any) => <li key={o.id} className="flex gap-3 px-4 py-2 font-mono text-xs"><Badge tone={o.side === "buy" ? "ok" : "danger"}>{o.side}</Badge><span className="flex-1">{+o.qty.toFixed(6)} {o.symbol} @ {money(o.price)}</span><span className="text-muted">{ago(o.ts)}</span></li>)}
                {!s.orders.length && <li className="p-4 text-sm text-muted">No orders yet.</li>}
              </ul>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader title="Place a paper order" />
                <form className="space-y-3 p-4" onSubmit={(e) => (e.preventDefault(), void act(async () => { await post(`/api/trading/paper/${id}/orders`, { ...order, qty: Number(order.qty), price: Number(order.price), fee: Number(order.fee) }); setOrder({ ...order, qty: "" }); refresh(); }, "Order filled (paper)"))}>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Symbol" htmlFor="o-sym"><Input id="o-sym" value={order.symbol} onChange={(e) => setOrder({ ...order, symbol: e.target.value.toUpperCase() })} onBlur={(e) => !order.price && setPriceFromData(e.target.value)} list="ds-symbols" /></Field>
                    <Field label="Side" htmlFor="o-side"><Select id="o-side" value={order.side} onChange={(e) => setOrder({ ...order, side: e.target.value })}><option value="buy">Buy</option><option value="sell">Sell</option></Select></Field>
                    <Field label="Quantity" htmlFor="o-qty"><Input id="o-qty" type="number" step="any" value={order.qty} onChange={(e) => setOrder({ ...order, qty: e.target.value })} /></Field>
                    <Field label="Price" htmlFor="o-price"><Input id="o-price" type="number" step="any" value={order.price} onChange={(e) => setOrder({ ...order, price: e.target.value })} /></Field>
                  </div>
                  <datalist id="ds-symbols">{datasets.map((d) => <option key={d.id} value={d.symbol} />)}</datalist>
                  {order.qty && order.price && <p className="text-xs text-muted">Total {money(Number(order.qty) * Number(order.price))}</p>}
                  <Button type="submit" variant="primary" className="w-full" disabled={!order.symbol || !order.qty || !order.price}>Submit paper order</Button>
                  <p className="text-xs text-muted">You set the fill price (e.g. today's price from your broker app). No live prices are fetched.</p>
                </form>
              </Card>
              <Card>
                <CardHeader title="Update a price" />
                <form className="space-y-2 p-4" onSubmit={(e) => (e.preventDefault(), void act(async () => { await post(`/api/trading/paper/${id}/quotes`, { symbol: quote.symbol, price: quote.price ? Number(quote.price) : undefined, dataset_id: quote.dataset_id ? Number(quote.dataset_id) : undefined }); refresh(); }, "Price updated"))}>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={quote.symbol} onChange={(e) => setQuote({ ...quote, symbol: e.target.value.toUpperCase() })} placeholder="Symbol" aria-label="Symbol" />
                    <Input type="number" step="any" value={quote.price} onChange={(e) => setQuote({ ...quote, price: e.target.value })} placeholder="Price" aria-label="Price" />
                  </div>
                  <Select value={quote.dataset_id} onChange={(e) => setQuote({ ...quote, dataset_id: e.target.value })} aria-label="Or use latest close from dataset"><option value="">…or use latest close from a dataset</option>{datasets.map((d) => <option key={d.id} value={d.id}>{d.symbol} ({money(d.last_close)})</option>)}</Select>
                  <Button type="submit" size="sm" disabled={!quote.symbol || (!quote.price && !quote.dataset_id)}>Update</Button>
                </form>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function TradingLab() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const tab = (params.get("tab") as Tab) || "research";
  const datasets = useQuery({ queryKey: ["datasets"], queryFn: () => get<any[]>("/api/trading/datasets") });
  const integrations = useQuery({ queryKey: ["integrations"], queryFn: () => get<any[]>("/api/integrations") });
  const [importOpen, setImportOpen] = useState(false);
  return (
    <>
      <PageHeader title="Trading Lab" icon={CandlestickChart} description="Research price data, test strategies on history, and practise with paper money." actions={<Button variant="primary" icon={Plus} onClick={() => setImportOpen(true)}>Add price data</Button>} />
      <p className="mb-4 flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warn" />Education and practice only. Atlas never connects to a broker or moves real money, and nothing here is financial advice. Talk to a parent before investing real money.</p>
      <Tabs className="mb-4" value={tab} onChange={(t) => setParams({ tab: t })} tabs={[{ id: "research", label: "Research", icon: Database }, { id: "backtest", label: "Backtest", icon: FlaskConical }, { id: "paper", label: "Paper trading", icon: Wallet }]} />
      {datasets.isLoading ? <Spinner /> : (
        <>
          {tab === "research" && <Research datasets={datasets.data ?? []} onImport={() => setImportOpen(true)} />}
          {tab === "backtest" && <Backtest datasets={datasets.data ?? []} />}
          {tab === "paper" && <Paper datasets={datasets.data ?? []} />}
        </>
      )}
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} avReady={integrations.data?.find((i) => i.id === "alphavantage")?.status === "configured"} onDone={(id) => (qc.invalidateQueries({ queryKey: ["datasets"] }), setParams({ tab: "research", dataset: String(id) }))} />
    </>
  );
}
