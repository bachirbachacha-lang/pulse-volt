"""Read-only view of the PAPER / SIMULATION state for the dashboard.

Everything here is read from the existing SQLite database and the validated
market-data cache. The database is opened read-only (``mode=ro``): the
dashboard can never create, change or delete trading state.
"""

from __future__ import annotations

import json
import math
import sqlite3
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from trading.config.settings import Settings
from trading.core.schemas import SIMULATION_LABEL, MarketData, AssetClass, ValidationReport
from trading.data.instruments import classify_symbol, interval_delta

ET = "America/New_York"


def _f(v: Any) -> Any:
    """JSON-safe floats (NaN/inf -> None)."""
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if isinstance(v, (np.floating,)):
        return _f(float(v))
    if isinstance(v, (np.integer,)):
        return int(v)
    return v


class StateReader:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.db_path = settings.database_path

    # ------------------------------------------------------------------ sqlite
    def _conn(self) -> sqlite3.Connection | None:
        if not self.db_path.exists():
            return None
        conn = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _rows(self, sql: str, params: tuple = ()) -> list[sqlite3.Row]:
        conn = self._conn()
        if conn is None:
            return []
        try:
            return conn.execute(sql, params).fetchall()
        except sqlite3.OperationalError:  # table not created yet
            return []
        finally:
            conn.close()

    def _payloads(self, sql: str, params: tuple = ()) -> list[dict]:
        return [json.loads(r["payload"]) for r in self._rows(sql, params)]

    # ------------------------------------------------------------------ account
    def account(self) -> dict[str, Any]:
        latest = self._payloads("SELECT payload FROM account_snapshots ORDER BY id DESC LIMIT 1")
        start = self.settings.account.starting_balance
        acct = latest[0] if latest else {"starting_balance": start, "cash": start, "realized_pnl": 0.0,
                                         "unrealized_pnl": 0.0, "total_commission": 0.0, "open_positions": 0,
                                         "trade_count": 0, "peak_equity": start, "daily_pnl": 0.0,
                                         "open_exposure": 0.0, "open_risk": 0.0, "timestamp": None}
        equity = acct["cash"] + acct.get("unrealized_pnl", 0.0)
        peak = max(acct.get("peak_equity") or acct["starting_balance"], equity)
        curve = self.equity_curve()
        max_dd = min((p["drawdown"] for p in curve), default=0.0)
        max_dd_pct = min((p["drawdown_pct"] for p in curve), default=0.0)
        stats = self.trade_stats(self.trades())
        return {
            "label": SIMULATION_LABEL,
            "has_state": bool(latest),
            "starting_balance": acct["starting_balance"],
            "balance": acct["cash"],
            "equity": equity,
            "unrealized_pnl": acct.get("unrealized_pnl", 0.0),
            "realized_pnl": acct.get("realized_pnl", 0.0),
            "today_pnl": acct.get("daily_pnl", 0.0),
            "total_pnl": equity - acct["starting_balance"],
            "drawdown": equity - peak,
            "drawdown_pct": (equity - peak) / peak if peak else 0.0,
            "max_drawdown": min(max_dd, equity - peak),
            "max_drawdown_pct": min(max_dd_pct, (equity - peak) / peak if peak else 0.0),
            "open_exposure": acct.get("open_exposure", 0.0),
            "open_risk": acct.get("open_risk", 0.0),
            "total_commission": acct.get("total_commission", 0.0),
            "as_of": acct.get("timestamp"),
            **stats,
        }

    @staticmethod
    def trade_stats(trades: list[dict]) -> dict[str, Any]:
        pnl = [t["net_pnl"] for t in trades]
        wins = [p for p in pnl if p > 0]
        losses = [p for p in pnl if p < 0]
        gp, gl = sum(wins), sum(losses)
        return {
            "total_trades": len(pnl), "wins": len(wins), "losses": len(losses),
            "breakeven": len(pnl) - len(wins) - len(losses),
            "win_rate": len(wins) / len(pnl) if pnl else None,
            "profit_factor": _f(gp / -gl) if gl < 0 else None,
            "profit_factor_infinite": bool(wins) and not losses,
            "avg_win": sum(wins) / len(wins) if wins else None,
            "avg_loss": sum(losses) / len(losses) if losses else None,
            "gross_profit": gp, "gross_loss": gl,
        }

    def equity_curve(self, max_points: int = 600) -> list[dict[str, Any]]:
        rows = self._rows("SELECT ts, payload FROM account_snapshots ORDER BY id")
        if not rows:
            return []
        out, peak = [], None
        for r in rows:
            p = json.loads(r["payload"])
            eq = p["cash"] + p.get("unrealized_pnl", 0.0)
            peak = eq if peak is None else max(peak, eq)
            out.append({"t": r["ts"], "equity": eq, "balance": p["cash"], "drawdown": eq - peak,
                        "drawdown_pct": (eq - peak) / peak if peak else 0.0})
        # Collapse repeated timestamps (one snapshot per symbol per bar), keep the last.
        dedup = {}
        for p in out:
            dedup[p["t"]] = p
        out = list(dedup.values())
        if len(out) > max_points:  # keep every k-th point plus the drawdown extremes
            step = math.ceil(len(out) / max_points)
            keep = set(range(0, len(out), step)) | {len(out) - 1}
            keep.add(min(range(len(out)), key=lambda i: out[i]["drawdown"]))
            out = [out[i] for i in sorted(keep)]
        return out

    # ------------------------------------------------------------------ positions / trades
    def positions(self) -> list[dict[str, Any]]:
        out = []
        for p in self._payloads("SELECT payload FROM positions ORDER BY symbol"):
            if p["side"] == "flat" or p["quantity"] <= 0:
                continue
            sign = 1 if p["side"] == "long" else -1
            last = p.get("last_price") or p["avg_price"]
            out.append({
                "symbol": p["symbol"], "direction": p["side"], "quantity": p["quantity"], "entry": p["avg_price"],
                "current": last, "stop": p.get("stop_loss"), "target": p.get("take_profit"),
                "unrealized_pnl": sign * (last - p["avg_price"]) * p["quantity"] * p.get("point_value", 1.0),
                "opened_at": p.get("opened_at"), "signal_id": p.get("signal_id"),
            })
        return out

    def _signals(self) -> dict[str, dict]:
        return {s["id"]: s for s in self._payloads("SELECT payload FROM signals")}

    def trades(self) -> list[dict[str, Any]]:
        sigs = self._signals()
        out = []
        for r in self._rows("SELECT id, payload FROM closed_trades ORDER BY exit_ts"):
            t = json.loads(r["payload"])
            sig = sigs.get(t.get("signal_id") or "", {})
            risk = abs(t["entry_price"] - (sig.get("stop") or t["entry_price"])) * t["quantity"] * t.get("point_value", 1)
            out.append({
                "id": t["id"], "symbol": t["symbol"], "strategy": sig.get("strategy", "?"),
                "setup": sig.get("reason", ""), "direction": t["side"], "quantity": t["quantity"],
                "entry": t["entry_price"], "exit": t["exit_price"], "entry_time": t["entry_time"],
                "exit_time": t["exit_time"], "gross_pnl": t["gross_pnl"], "commission": t["commission"],
                "net_pnl": t["net_pnl"], "r": t["net_pnl"] / risk if risk else None,
                "result": "win" if t["net_pnl"] > 0 else "loss" if t["net_pnl"] < 0 else "breakeven",
                "exit_reason": t["exit_reason"], "signal_id": t.get("signal_id"),
            })
        return out

    def pending_orders(self) -> list[dict]:
        return self._payloads("SELECT payload FROM orders WHERE status='pending' ORDER BY ts")

    # ------------------------------------------------------------------ decisions
    @staticmethod
    def _summarize_eval(e: dict) -> dict[str, Any]:
        agents = e.get("agents", {})

        def verdict(name: str) -> dict:
            a = agents.get(name, {})
            if not a or a.get("run") is False:
                return {"verdict": "not_run", "reason": a.get("reason", "not evaluated")}
            o = a.get("output", {})
            v = o.get("decision") or o.get("verdict")
            return {"verdict": v, "reason": o.get("reason", "")}

        return {
            "id": e["id"], "symbol": e["symbol"], "interval": e.get("interval"), "bar_time": e["bar_time"],
            "now": e.get("now"), "outcome": e["outcome"], "order_id": e.get("order_id"),
            "consensus_reason": (e.get("consensus") or {}).get("reason") or e.get("reason", ""),
            "signal": verdict("signal_analyst"), "risk": verdict("risk_manager"),
            "execution": verdict("execution_validator"),
            "setup": ((agents.get("signal_analyst") or {}).get("output") or {}).get("setup_category"),
            "direction": ((agents.get("signal_analyst") or {}).get("output") or {}).get("direction"),
        }

    def evaluations(self, symbol: str | None = None, limit: int = 40) -> list[dict[str, Any]]:
        if symbol:
            rows = self._payloads("SELECT payload FROM evaluations WHERE symbol=? ORDER BY bar_time DESC, "
                                  "created_at DESC LIMIT ?", (symbol, limit))
        else:
            rows = self._payloads("SELECT payload FROM evaluations ORDER BY bar_time DESC, created_at DESC LIMIT ?",
                                  (limit,))
        return [self._summarize_eval(e) for e in rows]

    def evaluation(self, evaluation_id: str) -> dict | None:
        rows = self._payloads("SELECT payload FROM evaluations WHERE id=?", (evaluation_id,))
        return rows[0] if rows else None

    def symbols(self) -> list[str]:
        syms = {r["symbol"] for r in self._rows("SELECT DISTINCT symbol FROM evaluations")}
        syms |= {k["request"]["symbol"] for k in self._cache_index().values()}
        return sorted(syms)

    def trade_detail(self, trade_id: str) -> dict | None:
        trade = next((t for t in self.trades() if t["id"] == trade_id), None)
        if trade is None:
            return None
        sig_id = trade["signal_id"]
        orders = self._payloads("SELECT payload FROM orders WHERE signal_id=? ORDER BY ts", (sig_id,))
        order_ids = [o["id"] for o in orders]
        fills = [f for f in self._payloads("SELECT payload FROM fills ORDER BY ts") if f["order_id"] in order_ids]
        evals = self._payloads("SELECT payload FROM evaluations WHERE signal_id=? ORDER BY created_at", (sig_id,))
        ev = next((e for e in evals if e.get("order_id")), evals[0] if evals else None)
        signal = self._signals().get(sig_id or "")
        chart = None
        if signal:
            md = self.latest_market(trade["symbol"], signal["interval"])
            if md is not None:
                chart = self.chart_payload(md, around=(pd.Timestamp(signal["timestamp"]),
                                                       pd.Timestamp(trade["exit_time"])))
        return {"trade": trade, "signal": signal, "orders": orders, "fills": fills, "evaluation": ev, "chart": chart}

    # ------------------------------------------------------------------ market data
    def _cache_index(self) -> dict:
        path = self.settings.cache_dir / "index.json"
        try:
            return json.loads(path.read_text()) if path.exists() else {}
        except json.JSONDecodeError:
            return {}

    def latest_market(self, symbol: str, interval: str | None = None) -> MarketData | None:
        """The most recently fetched validated dataset for this symbol (from the pipeline's cache)."""
        cands = [(k, v) for k, v in self._cache_index().items() if v["request"]["symbol"] == symbol
                 and (interval is None or v["request"]["interval"] == interval)]
        for key, meta in sorted(cands, key=lambda kv: kv[1]["fetched_at"], reverse=True):
            clean = self.settings.clean_dir / f"{key}.pkl"
            rep = self.settings.clean_dir / f"{key}.report.json"
            if not clean.exists() or not rep.exists():
                continue
            frame = pd.read_pickle(clean)
            report = ValidationReport.model_validate_json(rep.read_text())
            return MarketData(symbol=symbol, interval=meta["request"]["interval"], timezone=str(frame.index.tz),
                              asset_class=AssetClass(classify_symbol(symbol, self.settings).value), frame=frame,
                              is_clean=True, report=report, request_key=key)
        return None

    def chart_payload(self, md: MarketData, bars: int = 160,
                      around: tuple[pd.Timestamp, pd.Timestamp] | None = None) -> dict[str, Any]:
        from trading.strategies import get_strategy
        from trading.strategies.original_youtube import default_definition

        df = md.frame
        strat = get_strategy(default_definition([md.symbol], md.interval))
        scan = strat.scan(md)  # read-only strategy computation for display (indicators, setups)
        st = scan.structure
        if around is not None:
            a = max(df.index.searchsorted(around[0]) - 40, 0)
            b = min(df.index.searchsorted(around[1]) + 20, len(df))
        else:
            a, b = max(len(df) - bars, 0), len(df)
        view = df.iloc[a:b]
        t0, t1 = view.index[0], view.index[-1]
        candles = [{"t": str(t), "o": r.open, "h": r.high, "l": r.low, "c": r.close, "v": r.volume,
                    "flag": bool(getattr(r, "flag_any", False))} for t, r in zip(view.index, view.itertuples())]
        prot = [_f(float(x)) for x in st.protective_level.iloc[a:b]]
        setups = [{"t": str(s.nowick_time), "direction": s.direction, "category": s.category.value,
                   "s_setup": s.s_setup, "status": s.status.value, "entry": s.entry, "stop": s.stop,
                   "target": s.target, "reason": s.reason}
                  for s in scan.setups if t0 <= s.nowick_time <= t1]
        events = [{"t": str(df.index[e.index]), "kind": e.kind, "direction": e.direction, "level": e.level}
                  for e in st.events if t0 <= df.index[e.index] <= t1]
        sigs = [s for s in self._signals().values() if s["symbol"] == md.symbol and
                t0 <= pd.Timestamp(s["timestamp"]) <= t1]
        trades = [t for t in self.trades() if t["symbol"] == md.symbol and
                  pd.Timestamp(t["exit_time"]) >= t0 and pd.Timestamp(t["entry_time"]) <= t1]
        positions = [p for p in self.positions() if p["symbol"] == md.symbol]
        pending = [o for o in self.pending_orders() if o["symbol"] == md.symbol]
        return {
            "symbol": md.symbol, "interval": md.interval, "data_quality": md.report.status.value,
            "issues": [i.code for i in md.report.issues if i.severity.value != "info"],
            "last_bar": str(df.index[-1]), "bar_seconds": interval_delta(md.interval).total_seconds(),
            "candles": candles, "protective": prot, "setups": setups, "events": events,
            "signals": [{"t": s["timestamp"], "action": s["action"], "price": s["price"], "stop": s["stop"],
                         "target": s["target"], "reason": s["reason"], "id": s["id"]} for s in sigs],
            "trades": trades, "positions": positions, "pending": pending,
        }
