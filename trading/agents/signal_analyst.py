"""Agent 1: SIGNAL ANALYST.

Question: does the selected strategy have a valid signal on the latest closed bar?

It runs the strategy's own (read-only) scanner on validated data and checks
every condition the strategy requires, one by one. It cannot create a trade
the strategy does not produce: an APPROVE needs a strategy setup on the latest
bar that passes every condition.

Position-related rules (one position at a time) are left to the Risk Manager,
which sees the real paper account rather than the scanner's own simulation.
"""

from __future__ import annotations

from datetime import datetime

import numpy as np
import pandas as pd
from pydantic import Field

from trading.agents.common import Check, params_hash, summarize
from trading.core.log import get_logger, log_event
from trading.core.schemas import (
    OHLCV_COLUMNS,
    DataQualityStatus,
    MarketData,
    Model,
    OrderType,
    Signal,
    SignalAction,
    Verdict,
    new_id,
)
from trading.data.instruments import interval_delta
from trading.execution.fills import FillConfig
from trading.strategies.original_youtube.instruments import instrument_spec
from trading.strategies.original_youtube.strategy import (
    OriginalYoutubeStrategy,
    ScanResult,
    Setup,
    SetupCategory,
    SetupStatus,
    news_mask,
    no_trade_mask,
)

logger = get_logger("agents.signal_analyst")
POSITION_REASONS = ("already in a position", "another setup filled first")


class SignalAnalysis(Model):
    evaluation_id: str
    strategy: str
    symbol: str
    timeframe: str
    timestamp: datetime | None
    direction: str | None = None
    setup_category: str | None = None
    s_setup: bool | None = None
    entry_type: str | None = None
    conditions_checked: list[Check] = Field(default_factory=list)
    conditions_passed: list[str] = Field(default_factory=list)
    conditions_failed: list[str] = Field(default_factory=list)
    candidate_entry: float | None = None
    invalidation: float | None = None  # the structure level the stop sits behind (HL / LH)
    stop: float | None = None
    target: float | None = None
    expires_after_bars: int | None = None
    # Market entries: the target is re-anchored to the actual fill (1:1 from the entry, as the
    # backtester does). `target_level` is the S-setup wick fill when that target mode is on.
    target_rr: float | None = None
    target_level: float | None = None
    setup_key: str | None = None
    decision: Verdict = Verdict.REJECT
    reason: str = ""


def setup_key(symbol: str, interval: str, ts: pd.Timestamp, direction: str) -> str:
    return f"{symbol}|{interval}|{pd.Timestamp(ts).isoformat()}|{direction}"


class SignalAnalyst:
    name = "signal_analyst"

    def __init__(self, strategy: OriginalYoutubeStrategy) -> None:
        self.strategy = strategy

    def analyze(self, md: MarketData, evaluation_id: str | None = None, news_events=(),
                scan: ScanResult | None = None, fill_config: FillConfig | None = None,
                ) -> tuple[SignalAnalysis, Signal | None, ScanResult | None, dict]:
        """Returns (analysis, signal if approved, the scan used, strategy state snapshot).

        ``fill_config`` must be the paper broker's fill rules for this symbol: the scan decides
        whether earlier setups filled, were invalidated or are still pending, and with other
        rules (e.g. touch = fill) it disagrees with the broker and the backtester (audit fix H6)."""
        p = self.strategy.params
        eid = evaluation_id or new_id("eval")
        checks: list[Check] = []
        out = SignalAnalysis(evaluation_id=eid, strategy=self.strategy.name, symbol=md.symbol,
                             timeframe=md.interval, timestamp=None)

        def finish(state: dict, scan_used: ScanResult | None) -> tuple:
            out.conditions_checked = checks
            out.conditions_passed = [c.name for c in checks if c.passed]
            out.conditions_failed = [c.name for c in checks if not c.passed]
            approve = bool(checks) and all(c.passed for c in checks)
            out.decision = Verdict.APPROVE if approve else Verdict.REJECT
            out.reason = "every strategy condition passed" if approve else summarize(checks)
            signal = self._signal(md, out) if approve else None
            log_event(logger, "agent.signal_analyst", symbol=md.symbol, ts=out.timestamp, decision=out.decision,
                      failed=out.conditions_failed)
            return out, signal, scan_used, state

        # --- data presence / validation
        df = md.frame
        present = len(df) > 0 and all(c in df.columns for c in OHLCV_COLUMNS) and \
            not df[list(OHLCV_COLUMNS)].iloc[-1].isna().any()
        checks.append(Check(name="market_data_present", passed=present,
                            detail=f"{len(df)} bars" if present else "no usable OHLCV on the latest bar"))
        if not present:
            return finish({"available": False}, None)
        out.timestamp = df.index[-1].to_pydatetime()
        validated = md.is_clean and md.report is not None
        checks.append(Check(name="market_data_validated", passed=validated,
                            detail="validated by the data pipeline" if validated else "raw / unvalidated data"))
        if not validated:
            return finish({"available": False}, None)
        not_failed = md.report.status != DataQualityStatus.FAILED
        checks.append(Check(name="data_quality_not_failed", passed=not_failed, detail=md.report.status.value))
        if not not_failed:
            return finish({"available": False}, None)
        last_flagged = bool(df["flag_any"].iat[-1]) if "flag_any" in df else False
        flags = [c for c in df.columns if c.startswith("flag_") and c not in ("flag_any", "flag_roll_window")
                 and bool(df[c].iat[-1])]
        checks.append(Check(name="latest_bar_not_flagged", passed=not last_flagged,
                            detail=", ".join(flags) if flags else "clean"))

        # --- strategy state on the latest bar (read-only scan)
        scan = scan or self.strategy.scan(md, news_events, fill_config=fill_config)
        st = scan.structure
        j = len(df) - 1
        trend, phase, tradeable = st.trend.iat[j], st.phase.iat[j], st.tradeable.iat[j]
        bull, bear = bool(scan.flags["nowick_bull"].iat[j]), bool(scan.flags["nowick_bear"].iat[j])
        state = {
            "available": True, "strategy": self.strategy.name, "params_hash": params_hash(p),
            "trend": trend, "phase": phase, "tradeable_direction": tradeable,
            "protective_level": None if np.isnan(st.protective_level.iat[j]) else float(st.protective_level.iat[j]),
            "protective_index": int(st.protective_index.iat[j]),
            "nowick_bull": bull, "nowick_bear": bear,
            "recent_events": [{"time": str(df.index[e.index]), "kind": e.kind, "direction": e.direction,
                               "level": e.level, "note": e.note} for e in st.events[-5:]],
        }
        checks.append(Check(name="strategy_trend_tradeable", passed=tradeable is not None,
                            detail=f"trend={trend}, phase={phase}, tradeable={tradeable}"))
        nowick_dir = "long" if bull else "short" if bear else None
        checks.append(Check(name="nowick_candle_on_latest_bar", passed=nowick_dir is not None,
                            detail={"long": "bullish no-wick (open = low)", "short": "bearish no-wick (open = high)",
                                    None: "latest candle is not a no-wick candle"}[nowick_dir]))
        if nowick_dir is None:
            return finish(state, scan)
        checks.append(Check(name="nowick_matches_trend_direction", passed=nowick_dir == tradeable,
                            detail=f"no-wick {nowick_dir}, strategy allows {tradeable}"))
        out.direction = nowick_dir
        setup: Setup | None = next((s for s in scan.setups if s.nowick_index == j), None)
        if setup is None:
            checks.append(Check(name="strategy_setup_exists", passed=False,
                                detail="the strategy produced no setup on this bar"))
            return finish(state, scan)
        state["setup"] = {"category": setup.category.value, "s_setup": setup.s_setup, "status": setup.status.value,
                          "reason": setup.reason, "entry": setup.entry, "stop": setup.stop, "target": setup.target}
        out.setup_category, out.s_setup, out.entry_type = setup.category.value, setup.s_setup, setup.entry_mode
        out.candidate_entry, out.stop, out.target = setup.entry, setup.stop, setup.target
        out.invalidation = None if np.isnan(setup.protective_level) else float(setup.protective_level)
        out.setup_key = setup_key(md.symbol, md.interval, df.index[j], nowick_dir)
        out.expires_after_bars = p.max_return_candles if setup.entry_mode == "limit" else None
        if setup.entry_mode == "market":
            out.target_rr = p.reward_risk
            if setup.s_setup and p.s_setup_target == "wick_fill":
                out.target_level = setup.nowick_high if nowick_dir == "long" else setup.nowick_low

        grade_ok = (setup.category == SetupCategory.GRANDMA
                    or (setup.category == SetupCategory.A and p.trade_a_setups)
                    or (setup.category == SetupCategory.VALID_NOT_GOOD and setup.s_setup
                        and p.trade_valid_not_good_with_s))
        checks.append(Check(name="setup_grade_tradeable", passed=grade_ok,
                            detail=f"{setup.category.value}{' + S' if setup.s_setup else ''}"))
        stop_ok = out.invalidation is not None and setup.raw_risk > 0
        checks.append(Check(name="stop_beyond_entry", passed=stop_ok,
                            detail=f"invalidation {out.invalidation}, entry {setup.entry}"))
        spec = instrument_spec(md.symbol)
        min_units = p.min_stop_pips_forex if spec.kind == "forex" else p.min_stop_ticks_futures
        size_ok = stop_ok and setup.raw_risk_units >= min_units
        checks.append(Check(name="minimum_stop_size", passed=size_ok,
                            detail=f"{setup.raw_risk_units:.1f} {'pips' if spec.kind == 'forex' else 'ticks'} "
                                   f"(minimum {min_units})"))
        buffer = p.futures_zone_buffer_minutes if spec.kind == "futures" else 0
        blocked = bool(no_trade_mask(df.index[-1:], p, buffer)[0]
                       or news_mask(df.index[-1:], news_events, p.news_blackout_minutes,
                                    interval_delta(md.interval))[0])
        checks.append(Check(name="outside_no_trade_zone_and_news", passed=not blocked,
                            detail="inside the no-trading zone / news window" if blocked else "ok"))
        engine_ok = setup.status == SetupStatus.PENDING or (
            setup.status == SetupStatus.REJECTED and any(r in setup.reason for r in POSITION_REASONS))
        checks.append(Check(name="strategy_engine_accepts_setup", passed=engine_ok,
                            detail=f"{setup.status.value}: {setup.reason}" if not engine_ok else
                            ("pending" if setup.status == SetupStatus.PENDING else
                             "position rule deferred to the risk manager")))
        return finish(state, scan)

    def _signal(self, md: MarketData, a: SignalAnalysis) -> Signal:
        market = a.entry_type == "market"
        return Signal(
            strategy=a.strategy, symbol=a.symbol, interval=a.timeframe, timestamp=a.timestamp,
            action=SignalAction.ENTER_LONG if a.direction == "long" else SignalAction.ENTER_SHORT,
            price=a.candidate_entry, stop=a.stop, target=a.target,
            reason=f"{a.setup_category}{' + S' if a.s_setup else ''} setup",
            entry_type=OrderType.MARKET if market else OrderType.LIMIT,
            expires_after_bars=a.expires_after_bars, setup_key=a.setup_key,
            indicators={"invalidation": a.invalidation,
                        **({"target_rr": a.target_rr} if a.target_rr is not None else {}),
                        **({"target_level": a.target_level} if a.target_level is not None else {})},
            data_quality=signal_data_quality(md),
        )


def signal_data_quality(md: MarketData) -> DataQualityStatus:
    """OK unless the dataset as a whole is in doubt or the latest bars are flagged.

    Bar-level findings far in the past (e.g. an old contract roll) do not taint
    a signal on today's bars; dataset-level warnings and recent flags do."""
    if md.report is None or md.report.status == DataQualityStatus.FAILED:
        return DataQualityStatus.FAILED
    dataset_level = [i for i in md.report.issues if i.scope.value == "dataset" and i.severity.value != "info"]
    recent = md.frame["flag_any"].iloc[-3:].any() if "flag_any" in md.frame else False
    return DataQualityStatus.WARNING if dataset_level or recent else DataQualityStatus.OK
