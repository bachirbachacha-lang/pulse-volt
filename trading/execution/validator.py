"""Execution validator: the last mechanical gate before the consensus engine.

It does not judge whether a trade is a good idea. It checks that acting on the
signal is *safe and well-formed*:

* the system is in paper mode,
* the market data was validated and is not FAILED,
* the dataset has no dataset-level warnings (wrong interval, naive timezone,
  stale feed, too many missing candles, ...),
* none of the last ``flag_lookback`` bars up to the signal bar is flagged
  (possible futures roll, unexplained gap, suspicious move, out of session,
  bar after missing candles),
* the signal refers to the latest bar and a sane price.
"""

from __future__ import annotations

import pandas as pd

from trading.agents.base import Agent
from trading.config.settings import Settings
from trading.core.log import get_logger, log_event
from trading.core.schemas import (
    AccountState,
    AgentDecision,
    DataQualityStatus,
    IndicatorState,
    IssueScope,
    MarketData,
    Severity,
    Signal,
    SignalAction,
    Verdict,
)

logger = get_logger("execution.validator")


class ExecutionValidator(Agent):
    name = "execution_validator"

    def __init__(self, settings: Settings, flag_lookback: int = 3, max_price_deviation: float = 0.02) -> None:
        self.settings = settings
        self.flag_lookback = flag_lookback
        self.max_price_deviation = max_price_deviation

    def review(self, signal: Signal, md: MarketData, account: AccountState,
               indicators: IndicatorState | None = None) -> AgentDecision:
        problems = self.problems(signal, md)
        verdict = Verdict.REJECT if problems else Verdict.APPROVE
        decision = AgentDecision(agent=self.name, signal_id=signal.id, verdict=verdict,
                                 reason="; ".join(problems) if problems else "checks passed",
                                 details={"problems": problems,
                                          "data_quality": md.quality.value if md.quality else None})
        log_event(logger, "execution.validated", signal_id=signal.id, verdict=verdict, problems=problems)
        return decision

    def problems(self, signal: Signal, md: MarketData) -> list[str]:
        out: list[str] = []
        if self.settings.mode != "paper":
            out.append("not in paper mode")
        if signal.symbol != md.symbol or signal.interval != md.interval:
            out.append("signal and market data refer to different symbol/interval")
        if not md.is_clean or md.report is None:
            out.append("market data has not been validated")
            return out
        if md.report.status == DataQualityStatus.FAILED:
            out.append("market data FAILED validation")
            return out
        dataset_warnings = [i.code for i in md.report.issues
                            if i.scope == IssueScope.DATASET and i.severity != Severity.INFO]
        if dataset_warnings:
            out.append(f"{DataQualityStatus.WARNING.value}: {', '.join(dataset_warnings)}")
        df = md.frame
        if df.empty:
            out.append("no bars")
            return out
        sig_ts = pd.Timestamp(signal.timestamp)
        if sig_ts != df.index[-1]:
            out.append(f"signal bar {sig_ts} is not the latest bar {df.index[-1]}")
        recent = df.loc[:sig_ts].iloc[-self.flag_lookback:]
        if "flag_any" in recent.columns and recent["flag_any"].any():
            flags = sorted({c for c in recent.columns if c.startswith("flag_") and c not in ("flag_any", "flag_roll_window")
                            and recent[c].any()})
            out.append(f"{DataQualityStatus.WARNING.value}: recent bars flagged {flags}")
        if signal.action in (SignalAction.ENTER_LONG, SignalAction.ENTER_SHORT):
            last_close = float(df["close"].iloc[-1])
            if abs(signal.price - last_close) / last_close > self.max_price_deviation:
                out.append(f"signal price {signal.price} is far from last close {last_close}")
        if signal.data_quality != DataQualityStatus.OK:
            out.append(f"signal itself carries {signal.data_quality.value}")
        return out
