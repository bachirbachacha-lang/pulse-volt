"""PAPER / SIMULATION trading engine: the forward loop.

YFINANCE DATA -> validation -> (for every NEW closed bar, oldest first)
strategy signal -> Agent 1 -> Agent 2 -> Agent 3 -> consensus -> paper order
-> simulated fill -> open position -> monitoring (stops, targets, strategy
exits) -> simulated exit -> P&L -> account update.

Rules:
* Each new bar is processed on its own, in time order, with only the bars up to
  it visible. If several bars arrived since the last run, they are caught up one
  by one; entries on catch-up bars are rejected as "signal no longer current",
  but stops and targets on those bars are still applied.
* If market data is missing or fails validation, nothing is processed for that
  symbol: open positions are left exactly as they were and the gap is recorded.
* All state lives in SQLite, so a restart restores the account, open positions,
  pending orders, the last processed bar and the setups already approved
  (no duplicate orders after a restart).

Discord notifications (optional) are sent after each step from the stored
state; they are fire-and-forget and can never change or stop the simulator.

There is no brokerage connection anywhere in this module.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable, Sequence

import pandas as pd

from trading.agents.common import bar_close
from trading.agents.controller import DecisionController, fill_models_from_settings
from trading.config.settings import Settings
from trading.core.log import get_logger, log_event
from trading.core.schemas import SIMULATION_LABEL, DataQualityStatus, new_id, utcnow
from trading.data.pipeline import MarketDataPipeline
from trading.database.store import Database
from trading.notifications.paper_events import PaperEventNotifier
from trading.paper_trading.engine import PaperBroker
from trading.strategies.base import get_strategy
from trading.strategies.original_youtube import default_definition

logger = get_logger("paper_trading.runner")
NO_DATA = "NO_DATA"


class PaperTradingEngine:
    label = SIMULATION_LABEL

    def __init__(self, settings: Settings, symbols: Sequence[str], interval: str, *, db: Database | None = None,
                 pipeline: MarketDataPipeline | None = None, period: str = "5d",
                 clock: Callable[[], datetime] | None = None,
                 notifier: PaperEventNotifier | None = None) -> None:
        if settings.mode != "paper":
            raise RuntimeError("PAPER / SIMULATION only")
        self.settings = settings
        self.symbols = list(symbols)
        self.interval = interval
        self.period = period
        self.clock = clock or (lambda: datetime.now(timezone.utc))
        self.db = db or Database(settings.database_path)
        self.pipeline = pipeline or MarketDataPipeline.from_settings(settings)
        self.broker = PaperBroker(settings, self.db, fill_models=fill_models_from_settings(settings, self.symbols))
        self.controller = DecisionController(settings, get_strategy(default_definition(self.symbols, interval)),
                                             self.broker, self.db)
        self.notifier = notifier or PaperEventNotifier(settings.discord)
        log_event(logger, "paper.engine_started", label=self.label, symbols=self.symbols, interval=interval,
                  cash=self.broker.cash, open_positions=list(self.broker.positions), pending=len(self.broker.pending))

    def run_once(self, now: pd.Timestamp | None = None) -> dict[str, Any]:
        """Fetch fresh data and process every new closed bar for every symbol."""
        now = pd.Timestamp(now) if now is not None else pd.Timestamp(self.clock())
        now = now.tz_localize("UTC") if now.tzinfo is None else now
        summary: dict[str, Any] = {"label": self.label, "now": str(now), "symbols": {}}
        for sym in self.symbols:
            summary["symbols"][sym] = self._run_symbol(sym, now)
        acct = self.broker.account_state()
        summary["account"] = {**acct.model_dump(mode="json"), "equity": acct.equity, "drawdown": acct.drawdown,
                              "drawdown_pct": acct.drawdown_pct}
        return summary

    def _record_no_data(self, sym: str, now: pd.Timestamp, reason: str) -> dict[str, Any]:
        rec = {"id": new_id("eval"), "created_at": utcnow().isoformat(), "now": str(now), "bar_time": str(now),
               "symbol": sym, "interval": self.interval, "strategy": self.controller.strategy.name,
               "label": self.label, "outcome": NO_DATA, "stage": "market_data", "reason": reason,
               "broker_processed": False, "open_positions_untouched": list(self.broker.positions)}
        self.db.save_evaluation(rec)
        log_event(logger, "paper.no_data", level=30, symbol=sym, reason=reason)
        return {"outcome": NO_DATA, "reason": reason, "bars_processed": 0}

    def _run_symbol(self, sym: str, now: pd.Timestamp) -> dict[str, Any]:
        try:
            md = self.pipeline.load(sym, interval=self.interval, period=self.period, force=True,
                                    now=now.to_pydatetime())
        except Exception as exc:  # network down, empty response, ...
            return self._record_no_data(sym, now, f"market data unavailable: {exc}")
        if md.report is None or md.report.status == DataQualityStatus.FAILED or md.frame.empty:
            return self._record_no_data(sym, now, f"market data failed validation "
                                                  f"({md.report.status.value if md.report else 'no report'})")
        # Only bars that have closed by `now`.
        closed = md.frame[md.frame.index + (bar_close(md) - md.frame.index[-1]) <= now]
        if closed.empty:
            return self._record_no_data(sym, now, "no closed bar yet")
        md = md.model_copy(update={"frame": closed})
        last = self.controller._last_bar.get(sym)
        new_idx = [i for i, t in enumerate(md.frame.index) if last is None or t > last]
        if last is None:
            new_idx = new_idx[-1:]  # first run: start from the latest bar, do not replay history
        outcomes = []
        for i in new_idx:
            window = md.window(end=md.frame.index[i])
            closed_before = len(self.broker.closed_trades)
            rec = self.controller.step(window, now=now)
            self._notify(rec, closed_before)
            outcomes.append({"bar": rec["bar_time"], "outcome": rec["outcome"], "reason": rec["consensus"]["reason"],
                             "order_id": rec["order_id"]})
        return {"outcome": outcomes[-1]["outcome"] if outcomes else "NO_NEW_BAR", "bars_processed": len(outcomes),
                "evaluations": outcomes}

    def _notify(self, rec: dict[str, Any], closed_before: int) -> None:
        """Hand the already-stored results to the notifier. Never raises."""
        if not self.notifier.enabled:
            return
        try:
            fills = [e["fill"] for e in rec.get("broker_events", []) if e.get("type") == "fill"]
            orders = {f["order_id"]: self.db.order(f["order_id"]) for f in fills}
            new_trades = list(self.broker.closed_trades[closed_before:])
            self.notifier.after_step(rec, fills, orders, new_trades, self.broker.cash)
        except Exception as exc:
            log_event(logger, "paper.notify_failed", level=40, error=repr(exc))

    def close(self) -> None:
        """Deliver queued notifications (bounded wait) and release resources."""
        self.notifier.close()
