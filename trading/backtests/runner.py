"""Backtest runner for ORIGINAL_YOUTUBE_STRATEGY (and its experiments).

Pipeline: yfinance -> validated MarketData -> strategy scan with a realistic
FillConfig -> trade list -> chronological DEVELOPMENT / VALIDATION / TEST
labels -> metrics, regime tables, integrity checks.

Split discipline:

* The split boundaries are created once per split name from the data range
  available at that moment and frozen in ``backtest.splits_dir``. Later runs
  reuse them, so the TEST period never moves. Newer data is "post_test".
* TEST results are only computed when ``include_test=True``. Every such run is
  appended to ``backtest.test_ledger`` (who/what/when), so repeated peeking at
  the test period is visible.
* Experiments are compared on DEVELOPMENT and VALIDATION only.

Sizing: every trade risks the same amount (``risk_per_trade`` in account
currency), so P&L in money = net R x risk. Fixed-size P&L (1 futures contract)
is also reported where it is unambiguous.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import numpy as np
import pandas as pd

from trading.config.settings import CostEntry, Settings
from trading.core.log import get_logger, log_event
from trading.core.schemas import DataQualityStatus, MarketData
from trading.data.pipeline import MarketDataPipeline
from trading.execution.fills import FillConfig
from trading.backtests.metrics import compute_metrics, group_metrics
from trading.backtests.regimes import regime_features
from trading.strategies.base import get_strategy
from trading.strategies.original_youtube.instruments import instrument_spec
from trading.strategies.original_youtube.strategy import (
    ScanResult,
    SetupStatus,
    no_trade_mask,
)
from trading.core.schemas import StrategyDefinition

logger = get_logger("backtests")
PERIODS = ("development", "validation", "test", "post_test")
SUSPECT_FLAGS = ("flag_roll_suspect", "flag_large_gap", "flag_after_missing", "flag_suspicious_move")


# --------------------------------------------------------------------------- splits


@dataclass
class SplitPlan:
    name: str
    start: str
    dev_end: str
    val_end: str
    test_end: str
    created_at: str

    def label(self, ts: pd.Timestamp) -> str:
        ts = pd.Timestamp(ts)
        if ts < pd.Timestamp(self.start):
            return "pre_split"
        if ts < pd.Timestamp(self.dev_end):
            return "development"
        if ts < pd.Timestamp(self.val_end):
            return "validation"
        if ts <= pd.Timestamp(self.test_end):
            return "test"
        return "post_test"


def load_or_create_split(directory: Path, name: str, start: pd.Timestamp, end: pd.Timestamp,
                         dev_fraction: float, val_fraction: float) -> tuple[SplitPlan, bool]:
    path = directory / f"{name}.json"
    if path.exists():
        return SplitPlan(**json.loads(path.read_text())), False
    span = end - start
    plan = SplitPlan(
        name=name,
        start=start.isoformat(),
        dev_end=(start + span * dev_fraction).isoformat(),
        val_end=(start + span * (dev_fraction + val_fraction)).isoformat(),
        test_end=end.isoformat(),
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    directory.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(asdict(plan), indent=2))
    return plan, True


# --------------------------------------------------------------------------- results


@dataclass
class SymbolRun:
    symbol: str
    md: MarketData
    result: ScanResult
    costs: CostEntry
    skipped: str | None = None


@dataclass
class BacktestResult:
    strategy: str
    interval: str
    symbols: list[str]
    split: SplitPlan
    split_created: bool
    trades: pd.DataFrame  # every closed trade, all periods (test rows removed unless include_test)
    open_trades: pd.DataFrame
    metrics: dict[str, dict]  # period -> metrics
    metrics_clean_data: dict[str, dict]  # same, excluding trades that held through suspect bars
    integrity: list[dict]
    data_quality: list[dict]
    setup_funnel: pd.DataFrame
    runs: list[SymbolRun] = field(default_factory=list)
    include_test: bool = False
    warnings: list[str] = field(default_factory=list)

    @property
    def integrity_ok(self) -> bool:
        return all(c["passed"] for c in self.integrity)


# --------------------------------------------------------------------------- P&L


def _forex_quote_to_usd(symbol: str, price: float) -> float | None:
    """Multiply a quote-currency amount by this to get USD; None if a cross rate is needed."""
    pair = symbol.upper().replace("=X", "")
    base, quote = pair[:3], pair[3:6]
    if quote == "USD":
        return 1.0
    if base == "USD":
        return 1.0 / price
    return None


def trade_rows(run: SymbolRun, settings: Settings, risk_per_trade: float, split: SplitPlan) -> list[dict]:
    spec = instrument_spec(run.symbol)
    df = run.md.frame
    feats = regime_features(df)
    c = run.costs
    pv = settings.point_value(run.symbol)
    rows: list[dict] = []
    for s in run.result.setups:
        if s.fill_index is None:
            continue
        long = s.direction == "long"
        sign = 1 if long else -1
        risk_price = abs(s.fill_price - s.stop)
        row = {
            "symbol": run.symbol, "direction": s.direction, "category": s.category.value,
            "s_setup": s.s_setup, "entry_mode": s.entry_mode, "omar_entry": s.omar_entry,
            "clean_trend": s.clean_trend, "nowick_time": s.nowick_time, "entry_time": s.fill_time,
            "entry": s.fill_price, "stop": s.stop, "target": s.target, "exit_time": s.exit_time,
            "exit": s.exit_price, "exit_reason": s.exit_reason or s.reason, "status": s.status.value,
            "bars_to_fill": s.fill_index - s.nowick_index,
            "bars_held": (s.exit_index - s.fill_index) if s.exit_index is not None else None,
            "risk_units": spec.units(risk_price), "nowick_index": s.nowick_index,
            "fill_index": s.fill_index, "exit_index": s.exit_index,
            "period": split.label(s.fill_time),
        }
        # Smallest real position (1 contract / 1 micro lot) and whether the configured paper account
        # could place it. The backtest P&L is risk-normalised (fractional size); the paper engine
        # trades whole contracts and rejects trades it cannot size (audit fix H4).
        if spec.kind == "futures":
            min_risk = risk_price * pv
        elif run.symbol.upper().replace("=X", "")[3:6] == "USD":
            min_risk = risk_price * 1_000
        else:
            min_risk = np.nan
        row["min_size_risk"] = min_risk
        row["sizable_at_account"] = bool(min_risk <= risk_per_trade + 1e-9)
        row.update({k: feats[k].iat[s.nowick_index] for k in feats.columns})
        if s.exit_price is not None and risk_price > 0:
            move = sign * (s.exit_price - s.fill_price)
            if spec.kind == "futures":
                gross_fixed = move * pv * c.quantity
                comm_fixed = 2 * c.commission_per_unit_side * c.quantity
                net_r = (gross_fixed - comm_fixed) / (risk_price * pv * c.quantity)
                row.update(gross_fixed=gross_fixed, commission_fixed=comm_fixed,
                           net_pnl_fixed=gross_fixed - comm_fixed, pnl_currency="USD")
            else:
                units = c.quantity * c.lot_size
                conv = _forex_quote_to_usd(run.symbol, s.exit_price)
                comm_price = 0.0
                if c.commission_per_unit_side:
                    if conv is None:
                        raise ValueError(f"forex commission on cross {run.symbol} needs a USD rate")
                    comm_price = 2 * c.commission_per_unit_side * c.quantity / conv / units
                net_r = (move - comm_price) / risk_price
                net_fixed = (move - comm_price) * units * conv if conv is not None else np.nan
                row.update(gross_fixed=move * units * conv if conv is not None else np.nan,
                           commission_fixed=comm_price * units * conv if conv is not None else 0.0,
                           net_pnl_fixed=net_fixed, pnl_currency="USD" if conv is not None else "quote")
            row["gross_r"] = move / risk_price
            row["net_r"] = net_r
            row["net_pnl"] = net_r * risk_per_trade
            row["costs"] = (row["gross_r"] - net_r) * risk_per_trade
            window = df.iloc[s.fill_index:(s.exit_index or s.fill_index) + 1]
            row["data_suspect"] = bool(any(window[f].any() for f in SUSPECT_FLAGS if f in window))
        rows.append(row)
    return rows


# --------------------------------------------------------------------------- integrity


def integrity_checks(runs: Sequence[SymbolRun], trades: pd.DataFrame, settings: Settings) -> list[dict]:
    checks: list[dict] = []

    def add(name: str, passed: bool, detail: str = "") -> None:
        checks.append({"check": name, "passed": bool(passed), "detail": detail})

    for run in runs:
        if run.skipped:
            continue
        idx = run.md.frame.index
        add(f"{run.symbol}: timestamps tz-aware, unique, increasing",
            idx.tz is not None and idx.is_unique and idx.is_monotonic_increasing)
        add(f"{run.symbol}: data not FAILED", run.md.report.status != DataQualityStatus.FAILED,
            run.md.report.status.value)
        keys = [s.nowick_index for s in run.result.setups]
        add(f"{run.symbol}: one setup per no-wick candle (no duplicates)", len(keys) == len(set(keys)))

    if trades.empty:
        add("trades exist", False, "no trades to check")
        return checks
    for sym, g in trades.groupby("symbol"):
        g = g.sort_values("fill_index")
        add(f"{sym}: entry strictly after the no-wick candle (no same-bar entry)",
            bool((g["fill_index"] > g["nowick_index"]).all()))
        closed = g.dropna(subset=["exit_index"])
        add(f"{sym}: exit at or after entry", bool((closed["exit_index"] >= closed["fill_index"]).all()))
        overlaps = (g["fill_index"].iloc[1:].to_numpy() < g["exit_index"].iloc[:-1].fillna(np.inf).to_numpy())
        add(f"{sym}: never more than one open position", not overlaps.any(),
            f"{int(overlaps.sum())} overlaps" if overlaps.any() else "")
        run = next(r for r in runs if r.symbol == sym)
        df = run.md.frame
        spec = instrument_spec(sym)
        params = getattr(run, "params", None)
        tol = (run.costs.spread_ticks + run.costs.slippage_ticks + 1e-9) * spec.unit + 1e-9
        ok_entry = all(df["low"].iat[int(r.fill_index)] - tol <= r.entry <= df["high"].iat[int(r.fill_index)] + tol
                       for r in g.itertuples())
        add(f"{sym}: entry prices inside the fill bar's range (+costs)", ok_entry)
        ok_exit = all(df["low"].iat[int(r.exit_index)] - tol <= r.exit <= df["high"].iat[int(r.exit_index)] + tol
                      for r in closed.itertuples())
        add(f"{sym}: exit prices inside the exit bar's range (+costs)", ok_exit)
        if params is not None:
            buffer = params.futures_zone_buffer_minutes if spec.kind == "futures" else 0
            blocked = no_trade_mask(df.index, params, buffer)
            add(f"{sym}: no entries inside the no-trading zone",
                not blocked[g["fill_index"].astype(int).to_numpy()].any())
        if spec.kind == "futures" and not closed.empty:
            pv = settings.point_value(sym)
            sign = np.where(closed["direction"] == "long", 1, -1)
            expect = (sign * (closed["exit"] - closed["entry"]) * pv * run.costs.quantity
                      - 2 * run.costs.commission_per_unit_side * run.costs.quantity)
            risk_money = (closed["entry"] - closed["stop"]).abs() * pv * run.costs.quantity
            ok = np.allclose(expect, closed["net_pnl_fixed"]) and np.allclose(expect / risk_money, closed["net_r"])
            add(f"{sym}: P&L recomputed independently from prices matches", ok)
    return checks


# --------------------------------------------------------------------------- runner


def _ledger(settings: Settings, entry: dict) -> None:
    path = settings.resolve(settings.backtest.test_ledger)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as fh:
        fh.write(json.dumps(entry, default=str) + "\n")


def read_test_ledger(settings: Settings) -> list[dict]:
    path = settings.resolve(settings.backtest.test_ledger)
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def run_backtest(
    settings: Settings,
    definition: StrategyDefinition,
    symbols: Sequence[str],
    interval: str,
    *,
    period: str | None = None,
    start: str | None = None,
    end: str | None = None,
    split_name: str | None = None,
    include_test: bool = False,
    risk_per_trade: float | None = None,
    pipeline: MarketDataPipeline | None = None,
    force_download: bool = False,
) -> BacktestResult:
    pipeline = pipeline or MarketDataPipeline.from_settings(settings)
    strategy = get_strategy(definition)
    risk = risk_per_trade or settings.account.starting_balance * settings.risk.max_risk_per_trade_pct / 100
    warnings: list[str] = []
    runs: list[SymbolRun] = []
    quality: list[dict] = []

    for sym in symbols:
        md = pipeline.load(sym, interval=interval, period=period, start=start, end=end, force=force_download)
        spec = instrument_spec(sym)
        costs = settings.backtest.costs.for_symbol(sym, spec.kind)
        quality.append({"symbol": sym, "status": md.report.status.value, "rows_in": md.report.rows_in,
                        "rows_out": md.report.rows_out, "first": md.frame.index[0] if len(md.frame) else None,
                        "last": md.frame.index[-1] if len(md.frame) else None,
                        "issues": [{"code": i.code, "severity": i.severity.value, "count": i.count,
                                    "message": i.message} for i in md.report.issues]})
        if md.report.status == DataQualityStatus.FAILED:
            warnings.append(f"{sym}: data FAILED validation; not backtested")
            runs.append(SymbolRun(sym, md, None, costs, skipped="data FAILED"))  # type: ignore[arg-type]
            continue
        if md.report.status == DataQualityStatus.WARNING:
            warnings.append(f"{sym}: DATA QUALITY WARNING ({', '.join(sorted(md.report.codes()))})")
        fill = FillConfig(spread_ticks=costs.spread_ticks, slippage_ticks=costs.slippage_ticks,
                          limit_through_ticks=costs.limit_through_ticks,
                          commission_per_unit_side=costs.commission_per_unit_side, quantity=costs.quantity)
        result = strategy.scan(md, fill_config=fill)  # type: ignore[attr-defined]
        warnings += [f"{sym}: {w}" for w in result.warnings]
        run = SymbolRun(sym, md, result, costs)
        run.params = strategy.params  # type: ignore[attr-defined]
        runs.append(run)

    active = [r for r in runs if not r.skipped]
    if not active:
        raise RuntimeError("no symbol had usable data")
    data_start = min(r.md.frame.index[0] for r in active).tz_convert("UTC")
    data_end = max(r.md.frame.index[-1] for r in active).tz_convert("UTC")
    name = split_name or f"{interval}_{'_'.join(s.replace('=', '') for s in sorted(symbols))}"
    split, created = load_or_create_split(settings.resolve(settings.backtest.splits_dir), name, data_start,
                                          data_end, settings.backtest.dev_fraction, settings.backtest.val_fraction)

    rows: list[dict] = []
    for r in active:
        rows += trade_rows(r, settings, risk, split)
    all_trades = pd.DataFrame(rows)
    if not all_trades.empty:
        all_trades = all_trades.sort_values("entry_time").reset_index(drop=True)
    closed = all_trades[all_trades["exit_time"].notna()] if not all_trades.empty else all_trades
    open_trades = all_trades[all_trades["exit_time"].isna()] if not all_trades.empty else all_trades

    integrity = integrity_checks(active, closed, settings)
    visible = closed if include_test or closed.empty else closed[closed["period"] != "test"]

    def by_period(frame: pd.DataFrame) -> dict[str, dict]:
        out = {"all_visible": compute_metrics(frame, settings.account.starting_balance)}
        for p in PERIODS:
            if p == "test" and not include_test:
                continue
            sub = frame[frame["period"] == p] if not frame.empty else frame
            out[p] = compute_metrics(sub, settings.account.starting_balance)
        return out

    metrics = by_period(visible)
    clean = visible[~visible["data_suspect"].astype(bool)] if not visible.empty else visible
    metrics_clean = by_period(clean)

    funnel_rows = []
    for r in active:
        for s in r.result.setups:
            funnel_rows.append({"symbol": r.symbol, "category": s.category.value, "s_setup": s.s_setup,
                                "status": s.status.value, "reason": s.reason or s.exit_reason or "",
                                "period": split.label(s.nowick_time)})
    funnel = pd.DataFrame(funnel_rows)
    if not include_test and not funnel.empty:
        funnel = funnel[funnel["period"] != "test"]

    if include_test:
        params_hash = hashlib.sha256(json.dumps(definition.params, sort_keys=True, default=str).encode()).hexdigest()
        _ledger(settings, {"at": datetime.now(timezone.utc).isoformat(), "strategy": definition.name,
                           "version": definition.version, "params_sha256": params_hash[:16], "split": split.name,
                           "symbols": list(symbols), "interval": interval})
    log_event(logger, "backtest.completed", strategy=definition.name, symbols=list(symbols), interval=interval,
              trades=len(visible), include_test=include_test, integrity_ok=all(c["passed"] for c in integrity))
    return BacktestResult(
        strategy=definition.name, interval=interval, symbols=list(symbols), split=split, split_created=created,
        trades=visible.reset_index(drop=True) if not visible.empty else visible,
        open_trades=open_trades, metrics=metrics, metrics_clean_data=metrics_clean, integrity=integrity,
        data_quality=quality, setup_funnel=funnel, runs=runs, include_test=include_test, warnings=warnings,
    )


def regime_tables(trades: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """Performance grouped by condition. Buckets are descriptive (computed on the trades shown)."""
    if trades.empty:
        return {}
    t = trades.copy()
    t["stop_size_bucket"] = pd.qcut(t["risk_units"], 3, labels=["small stop", "mid stop", "large stop"],
                                    duplicates="drop").astype(object) if len(t) >= 6 else "n/a"
    t["bars_to_fill_bucket"] = pd.cut(t["bars_to_fill"], [0, 1, 3, 10], labels=["1", "2-3", "4-10"]).astype(object)
    t["exit_kind"] = t["exit_reason"].fillna("?").str.replace(r" \(.*\)", "", regex=True)
    cols = ["period", "symbol", "direction", "category", "s_setup", "entry_mode", "clean_trend", "trend_regime",
            "vol_regime", "session", "weekday", "hour_ny", "exit_kind", "stop_size_bucket", "bars_to_fill_bucket",
            "data_suspect"]
    return {c: group_metrics(t, c) for c in cols if c in t}


def cost_impact(trades: pd.DataFrame) -> dict[str, float]:
    if trades.empty:
        return {}
    return {"gross_r": float(trades["gross_r"].sum()), "net_r": float(trades["net_r"].sum()),
            "cost_r": float((trades["gross_r"] - trades["net_r"]).sum()),
            "median_cost_r_per_trade": float((trades["gross_r"] - trades["net_r"]).median())}
