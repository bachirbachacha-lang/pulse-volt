"""Agent 3: EXECUTION VALIDATOR for proposed PAPER orders.

Checks that the order the controller built is exactly what the signal and the
risk decision say, that the signal is still current, the data is fresh and
clean, and that the same setup is not being ordered twice.
"""

from __future__ import annotations

import math

import pandas as pd

from trading.agents.common import Check, bar_close, data_age, stale_limit, summarize
from trading.config.settings import Settings
from trading.core.log import get_logger, log_event
from trading.core.schemas import (
    AgentDecision,
    MarketData,
    OrderType,
    PaperOrder,
    RiskDecision,
    Side,
    Signal,
    SignalAction,
    Verdict,
)
from trading.data.instruments import interval_delta
from trading.execution.validator import ExecutionValidator
from trading.strategies.original_youtube.instruments import instrument_spec

logger = get_logger("agents.execution_validator")


def _same(a: float | None, b: float | None) -> bool:
    return a is not None and b is not None and math.isclose(a, b, rel_tol=0, abs_tol=1e-9)


class PaperOrderValidator:
    name = "execution_validator"

    def __init__(self, settings: Settings, strategy_name: str, max_signal_age_bars: float = 1.0) -> None:
        self.settings = settings
        self.strategy_name = strategy_name
        self.max_signal_age_bars = max_signal_age_bars
        self._data_checks = ExecutionValidator(settings)

    def review(self, order: PaperOrder, signal: Signal, risk: RiskDecision, md: MarketData, now: pd.Timestamp,
               active_orders: list[PaperOrder], approved_setup_keys: set[str]) -> AgentDecision:
        checks: list[Check] = []
        checks.append(Check(name="paper_mode", passed=self.settings.mode == "paper", detail=self.settings.mode))

        missing = [f for f, v in {
            "symbol": order.symbol, "side": order.side, "quantity": order.quantity, "order_type": order.order_type,
            "stop_loss": order.stop_loss, "take_profit": order.take_profit, "signal_id": order.signal_id,
            "strategy": order.strategy, "setup_key": order.setup_key,
            "limit_price": order.limit_price if order.order_type == OrderType.LIMIT else True,
        }.items() if v in (None, "")]
        checks.append(Check(name="required_information_present", passed=not missing,
                            detail=f"missing {missing}" if missing else "complete"))
        checks.append(Check(name="correct_strategy",
                            passed=order.strategy == signal.strategy == self.strategy_name,
                            detail=f"order {order.strategy}, signal {signal.strategy}, active {self.strategy_name}"))
        checks.append(Check(name="correct_symbol",
                            passed=order.symbol == signal.symbol == md.symbol and signal.interval == md.interval,
                            detail=f"order {order.symbol}, signal {signal.symbol} {signal.interval}, "
                                   f"data {md.symbol} {md.interval}"))
        want_side = Side.BUY if signal.action == SignalAction.ENTER_LONG else Side.SELL
        checks.append(Check(name="correct_direction", passed=order.side == want_side,
                            detail=f"order {order.side.value}, signal {signal.action.value}"))

        spec = instrument_spec(order.symbol)
        whole = (float(order.quantity).is_integer() if spec.kind == "futures"
                 else order.quantity % 1000 == 0 if spec.kind == "forex" else True)
        checks.append(Check(name="correct_quantity",
                            passed=risk.verdict == Verdict.APPROVE and order.quantity > 0 and whole
                            and _same(order.quantity, risk.quantity),
                            detail=f"order {order.quantity:g}, risk-approved {risk.quantity:g}"
                                   + ("" if whole else " (not a whole contract / micro lot)")))
        entry_ok = order.order_type == signal.entry_type and (
            _same(order.limit_price, signal.price) if order.order_type == OrderType.LIMIT else order.limit_price is None)
        expiry_ok = order.expires_after_bars == signal.expires_after_bars
        checks.append(Check(name="correct_entry", passed=entry_ok and expiry_ok,
                            detail=f"{order.order_type.value} {order.limit_price} (signal {signal.entry_type.value} "
                                   f"{signal.price}); expiry {order.expires_after_bars} vs {signal.expires_after_bars}"))
        checks.append(Check(name="correct_stop", passed=_same(order.stop_loss, signal.stop)
                            and _same(order.stop_loss, risk.stop),
                            detail=f"order {order.stop_loss}, signal {signal.stop}, risk {risk.stop}"))
        checks.append(Check(name="correct_target", passed=_same(order.take_profit, signal.target)
                            and _same(order.take_profit, risk.target),
                            detail=f"order {order.take_profit}, signal {signal.target}, risk {risk.target}"))
        checks.append(Check(name="order_matches_signal", passed=order.signal_id == signal.id,
                            detail=f"order signal {order.signal_id}, signal {signal.id}"))

        latest = md.frame.index[-1] if len(md.frame) else None
        age = data_age(md, now) if latest is not None else None
        max_age = interval_delta(md.interval) * self.max_signal_age_bars
        current = latest is not None and pd.Timestamp(signal.timestamp) == latest and age <= max_age
        checks.append(Check(name="signal_still_current", passed=current,
                            detail=f"signal bar {signal.timestamp}, latest bar {latest}, closed {age} ago "
                                   f"(max {max_age})"))
        limit = stale_limit(md, self.settings.validation.stale_after_bars)
        checks.append(Check(name="data_not_stale", passed=age is not None and age <= limit,
                            detail=f"latest bar closed {age} ago (limit {limit})"))
        problems = self._data_checks.problems(signal, md)
        checks.append(Check(name="data_quality_ok", passed=not problems,
                            detail="; ".join(problems) if problems else "clean"))

        dup_orders = [o.id for o in active_orders if o.setup_key == order.setup_key or o.signal_id == order.signal_id]
        dup_key = order.setup_key in approved_setup_keys
        checks.append(Check(name="no_duplicate", passed=not dup_orders and not dup_key,
                            detail=(f"active order(s) {dup_orders} for this setup" if dup_orders else
                                    "this setup was already approved once" if dup_key else "none")))

        ok = all(c.passed for c in checks)
        decision = AgentDecision(agent=self.name, signal_id=signal.id, verdict=Verdict.APPROVE if ok else Verdict.REJECT,
                                 reason="order checks passed" if ok else summarize(checks),
                                 details={"checks": [c.model_dump() for c in checks], "bar_close": str(bar_close(md))
                                          if latest is not None else None})
        log_event(logger, "agent.execution_validator", signal_id=signal.id, decision=decision.verdict,
                  failed=[c.name for c in checks if not c.passed])
        return decision
