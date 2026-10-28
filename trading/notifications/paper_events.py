"""Turns PAPER / SIMULATION engine events into Discord notifications.

The engine calls :meth:`PaperEventNotifier.after_step` once its state is
updated and stored. This class only *reads* that state (the evaluation record,
the broker's fills and closed trades) and formats messages. Any error here is
logged and swallowed: notifications can never affect trading.
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from trading.config.settings import DiscordSettings
from trading.core.log import get_logger, log_event
from trading.core.schemas import ClosedTrade, PaperOrder
from trading.notifications.discord import (
    DiscordNotifier,
    format_agent_decision,
    format_paper_signal,
    format_trade_closed,
    format_trade_opened,
)

logger = get_logger("notifications.paper_events")


def _et(ts: Any) -> str:
    try:
        return pd.Timestamp(ts).tz_convert("America/New_York").strftime("%Y-%m-%d %H:%M ET")
    except Exception:
        return str(ts)


class PaperEventNotifier:
    def __init__(self, settings: DiscordSettings, notifier: DiscordNotifier | None = None) -> None:
        self.settings = settings
        self.notifier = notifier or DiscordNotifier(settings, background=True)
        self._strategy_by_signal: dict[str, str] = {}

    @property
    def enabled(self) -> bool:
        return self.settings.enabled

    def after_step(self, record: dict[str, Any], new_fills: list[dict], orders: dict[str, PaperOrder],
                   new_trades: list[ClosedTrade], balance: float) -> None:
        if not self.enabled:
            return
        try:
            self._notify(record, new_fills, orders, new_trades, balance)
        except Exception as exc:  # never let a notification problem reach the engine
            log_event(logger, "notifications.error", level=40, error=repr(exc))

    def _notify(self, record, new_fills, orders, new_trades, balance) -> None:
        s = self.settings
        agents = record.get("agents") or {}
        a1 = (agents.get("signal_analyst") or {}).get("output") or {}
        strategy = record.get("strategy", "?")
        had_signal = a1.get("decision") == "approve"
        if record.get("signal_id"):
            self._strategy_by_signal[record["signal_id"]] = strategy

        # Fills and exits first: they happened on this bar, before the new decision.
        if s.notify_trades:
            for f in new_fills:
                order = orders.get(f["order_id"])
                if order is None or not order.setup_key:  # exits are reported as closed trades
                    continue
                self.notifier.send(format_trade_opened(
                    order.strategy or strategy, f["symbol"], "long" if f["side"] == "buy" else "short",
                    f["price"], order.stop_loss, order.take_profit, f["quantity"], balance))
            for t in new_trades:
                self.notifier.send(format_trade_closed(
                    t, balance, self._strategy_by_signal.get(t.signal_id or "", strategy)))

        if had_signal and s.notify_signals:
            setup = f"{a1.get('setup_category')}{' + S' if a1.get('s_setup') else ''}"
            self.notifier.send(format_paper_signal(strategy, record["symbol"], a1.get("direction") or "?",
                                                   _et(record.get("bar_time")), setup))
        if had_signal and s.notify_decisions:
            def verdict(name: str) -> str | None:
                a = agents.get(name) or {}
                if a.get("run") is False:
                    return None
                o = a.get("output") or {}
                return o.get("decision") or o.get("verdict")

            votes = {n: verdict(n) for n in ("signal_analyst", "risk_manager", "execution_validator")}
            approved = record.get("outcome") == "PAPER_TRADE_APPROVED"
            self.notifier.send(format_agent_decision(record["symbol"], _et(record.get("bar_time")), votes,
                                                     approved, (record.get("consensus") or {}).get("reason", "")))

    def close(self) -> None:
        try:
            self.notifier.close()
        except Exception as exc:
            log_event(logger, "notifications.error", level=40, error=repr(exc))
