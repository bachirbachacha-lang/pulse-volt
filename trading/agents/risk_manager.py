"""Agent 2: RISK MANAGER.

Its only job is risk validation for the simulated account. It never changes
the trade idea: the stop must be exactly the strategy's invalidation-based
stop (no widening), and the target is passed through unchanged. It sizes the
position from the configured risk and rejects the trade if any limit is hit.
"""

from __future__ import annotations

import math

import pandas as pd

from trading.agents.common import Check, data_age, exposure_key, stale_limit, summarize
from trading.agents.signal_analyst import SignalAnalysis
from trading.config.settings import Settings
from trading.core.log import get_logger, log_event
from trading.core.schemas import (
    AccountState,
    ClosedTrade,
    MarketData,
    PaperOrder,
    PaperPosition,
    RiskDecision,
    Signal,
    SignalAction,
    Verdict,
)
from trading.strategies.original_youtube.instruments import instrument_spec

logger = get_logger("agents.risk_manager")
FOREX_UNIT_STEP = 1_000  # micro lot


class RiskContext(dict):
    """Everything the risk manager looked at (stored verbatim in the audit trail)."""


class RiskManager:
    name = "risk_manager"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.limits = settings.risk

    # ----------------------------------------------------------------- sizing
    def size(self, signal: Signal, risk_budget: float) -> tuple[float, float, str]:
        """Return (quantity, money at risk for that quantity, note)."""
        spec = instrument_spec(signal.symbol)
        dist = abs(signal.price - signal.stop)
        if spec.kind == "futures":
            per_contract = dist * self.settings.point_value(signal.symbol)
            qty = math.floor(risk_budget / per_contract) if per_contract > 0 else 0
            return float(qty), qty * per_contract, f"{per_contract:,.2f} per contract"
        if spec.kind == "forex":
            pair = signal.symbol.upper().replace("=X", "")
            if pair[3:6] != "USD":
                # P&L in the paper account is only correct in USD for XXX/USD pairs.
                return 0.0, 0.0, f"{pair}: account-currency conversion for non-USD-quote pairs is not implemented"
            units = math.floor(risk_budget / dist / FOREX_UNIT_STEP) * FOREX_UNIT_STEP if dist > 0 else 0
            return float(units), units * dist, f"{dist:.5f} USD per unit"
        return 0.0, 0.0, f"{signal.symbol}: not a supported instrument"

    # ----------------------------------------------------------------- review
    def review(
        self,
        signal: Signal,
        analysis: SignalAnalysis,
        md: MarketData,
        account: AccountState,
        positions: dict[str, PaperPosition],
        pending: list[PaperOrder],
        closed_trades: list[ClosedTrade],
        now: pd.Timestamp,
    ) -> tuple[RiskDecision, RiskContext]:
        lim = self.limits
        checks: list[Check] = []
        long = signal.action == SignalAction.ENTER_LONG
        equity = account.equity

        checks.append(Check(name="virtual_balance_positive", passed=equity > 0, detail=f"equity {equity:,.2f}"))

        same_as_strategy = (signal.stop is not None and analysis.stop is not None
                            and math.isclose(signal.stop, analysis.stop, rel_tol=0, abs_tol=1e-9))
        checks.append(Check(name="stop_from_strategy_invalidation", passed=same_as_strategy,
                            detail=f"signal stop {signal.stop}, strategy stop {analysis.stop}, "
                                   f"invalidation {analysis.invalidation}"))
        beyond = analysis.invalidation is not None and signal.stop is not None and (
            signal.stop <= analysis.invalidation if long else signal.stop >= analysis.invalidation)
        checks.append(Check(name="stop_behind_invalidation_level", passed=beyond,
                            detail="stop sits beyond the structure level that invalidates the setup"
                            if beyond else "stop is inside the invalidation level"))
        dist = abs(signal.price - signal.stop) if signal.stop else 0.0
        correct_side = signal.stop is not None and (signal.stop < signal.price if long else signal.stop > signal.price)
        checks.append(Check(name="stop_distance_valid", passed=dist > 0 and correct_side,
                            detail=f"{dist:.5f} price units"))

        budget = equity * lim.max_risk_per_trade_pct / 100
        qty, money_at_risk, note = self.size(signal, budget) if dist > 0 and correct_side else (0.0, 0.0, "no stop")
        checks.append(Check(name="configured_risk", passed=budget > 0,
                            detail=f"{lim.max_risk_per_trade_pct}% of {equity:,.2f} = {budget:,.2f}"))
        size_ok = qty > 0 and money_at_risk <= budget + 1e-9
        checks.append(Check(name="position_size", passed=size_ok,
                            detail=f"quantity {qty:g}, risk {money_at_risk:,.2f} ({note})" if qty > 0 else
                            f"position size rounds to zero: {note}; stop too wide for the risk budget"))

        open_pos = {s: p for s, p in positions.items() if p.is_open}
        open_risk = sum(abs(p.avg_price - p.stop_loss) * p.quantity * p.point_value
                        for p in open_pos.values() if p.stop_loss is not None)
        # Same basis as the per-trade budget (current equity). Using the starting balance here
        # rejected every correctly sized trade once the account was in profit (audit fix C1).
        max_total = budget * max(lim.max_open_positions, 1)
        exposure_ok = len(open_pos) < lim.max_open_positions and open_risk + money_at_risk <= max_total + 1e-9
        checks.append(Check(name="current_exposure", passed=exposure_ok,
                            detail=f"{len(open_pos)} open (max {lim.max_open_positions}); open risk "
                                   f"{open_risk:,.2f} + new {money_at_risk:,.2f} vs limit {max_total:,.2f}"))

        day = pd.Timestamp(now).tz_convert("America/New_York").date()
        realized_today = sum(t.net_pnl for t in closed_trades
                             if pd.Timestamp(t.exit_time).tz_convert("America/New_York").date() == day)
        # Entry commissions of open positions are already paid (audit fix M2).
        unrealized = sum(p.unrealized_pnl - p.entry_commission for p in open_pos.values())
        loss_limit = account.starting_balance * lim.max_daily_loss_pct / 100
        day_pnl = realized_today + unrealized
        checks.append(Check(name="daily_loss_limit", passed=day_pnl > -loss_limit,
                            detail=f"today {day_pnl:,.2f} vs limit -{loss_limit:,.2f}"))

        key = exposure_key(signal.symbol)
        same_market = [s for s in open_pos if exposure_key(s) == key]
        checks.append(Check(name="no_existing_position", passed=not same_market,
                            detail=f"open position in {same_market}" if same_market else "none"))
        # Pending entries on the SAME symbol for other setups are allowed: the strategy keeps every
        # valid no-wick pending and takes whichever is tapped first, and the broker cancels the
        # others when one fills (one position at a time). Rejecting them here made the paper
        # engine trade a different set of setups than the strategy (audit fix H7).
        dup = [o.id for o in pending if (exposure_key(o.symbol) == key and o.symbol != signal.symbol) or
               (signal.setup_key and o.setup_key == signal.setup_key)]
        checks.append(Check(name="no_duplicate_exposure", passed=not dup,
                            detail=f"pending order(s) {dup} on a related market or the same setup" if dup
                            else "none"))

        age = data_age(md, now)
        limit = stale_limit(md, self.settings.validation.stale_after_bars)
        checks.append(Check(name="data_not_stale", passed=age <= limit, detail=f"latest bar closed {age} ago "
                                                                                f"(limit {limit})"))

        ok = all(c.passed for c in checks)
        decision = RiskDecision(
            agent=self.name, signal_id=signal.id, verdict=Verdict.APPROVE if ok else Verdict.REJECT,
            reason="risk checks passed" if ok else summarize(checks),
            quantity=qty if ok else 0.0, risk_amount=money_at_risk if ok else 0.0,
            stop=signal.stop, target=signal.target,
            details={"checks": [c.model_dump() for c in checks], "risk_budget": budget, "sizing_note": note},
        )
        context = RiskContext(
            equity=equity, cash=account.cash, open_positions={s: p.model_dump(mode="json") for s, p in open_pos.items()},
            pending_orders=[o.model_dump(mode="json") for o in pending], realized_today=realized_today,
            unrealized=unrealized, now=str(now), limits=lim.model_dump(),
        )
        log_event(logger, "agent.risk_manager", signal_id=signal.id, decision=decision.verdict, quantity=qty,
                  failed=[c.name for c in checks if not c.passed])
        return decision, context
