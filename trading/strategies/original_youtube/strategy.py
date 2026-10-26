"""ORIGINAL_YOUTUBE_STRATEGY: the No Wick strategy as taught by omarnowick.

Source: "No Wick Strategy (85% Win Rate Trading System + Live Backtest)",
youtu.be/DD9A9hHYqvc. See ``SPEC.md`` next to this file for every rule, its
timestamp, and whether it is explicit, inferred, discretionary or unknown.

This module is the reference ("original") implementation. Experimental
variants must live elsewhere and must not change these defaults.

Rules (video timestamps):
* Trade with the trend only: uptrend + bullish no-wick = buy; downtrend +
  bearish no-wick = sell (1:18:28, 1:34:14).
* Entry: limit at the no-wick candle's open, filled when price comes back and
  taps it (1:20:44, 1:26:46 "set a buy limit").
* Price must come back within max 10 candles; the 11th is not allowed (1:22:25).
* Stop: behind the most recent higher low (buys) / lower high (sells) plus
  breathing room (1:21:29, 1:35:11).
* Target: fixed 1:1 (1:21:41).
* Forex: no trade if the stop is under 5 pips before breathing room (1:35:26).
* Forex "Omar entry": if the stop is over 10 pips, enter 2 pips earlier (1:36:23).
* Not valid: price comes close (2 pips forex / a couple of ticks futures) and
  then hits TP without filling (1:38:11); price creates new structure before
  tapping (1:39:00); anything in the no-trading zone, and open trades are
  closed before it (1:40:16); trend reversals before the 3-step confirmation
  (1:48:08).
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import time
from enum import StrEnum
from typing import Sequence

import numpy as np
import pandas as pd

from trading.core.log import get_logger, log_event
from trading.core.schemas import DataQualityStatus, MarketData, Signal, SignalAction, StrategyDefinition
from trading.data.instruments import interval_delta
from trading.strategies.base import Strategy, register
from trading.strategies.original_youtube.instruments import InstrumentSpec, instrument_spec
from trading.strategies.original_youtube.nowick import nowick_flags
from trading.strategies.original_youtube.structure import StructureEngine, StructureResult, Trend

STRATEGY_NAME = "ORIGINAL_YOUTUBE_STRATEGY"
logger = get_logger("strategies.original_youtube")


@dataclass(frozen=True)
class OriginalParams:
    # --- explicit in the video
    max_return_candles: int = 10
    reward_risk: float = 1.0
    min_stop_pips_forex: float = 5.0  # before breathing room
    omar_entry_min_stop_pips: float = 10.0  # Omar entry only if stop is above this (forex)
    omar_entry_offset_pips: float = 2.0
    near_miss_pips_forex: float = 2.0  # "I would say two pips"
    news_blackout_minutes: int = 15  # close 15 min before, resume 15 min after red-folder news
    futures_zone_buffer_minutes: int = 60  # backtest 2:18:04: no trades 1h before/after the zone (futures)
    # --- inferred / interpretation (see SPEC.md); defaults are NOT optimised
    near_miss_ticks_futures: float = 2.0  # "a couple of ticks"
    min_stop_ticks_futures: float = 0.0  # video: "on futures I don't mind it as much"
    breathing_room_pct: float = 0.10  # DISCRETIONARY; creator mentions he "used to say 10%"
    swing_atr_mult: float = 1.0  # DISCRETIONARY "proper pullback" size
    atr_length: int = 14
    one_position_at_a_time: bool = True
    # No-trading zone: ASSUMPTION until confirmed from the creator's indicator.
    # Default = the CME / FX daily break 17:00-18:00 New York time.
    zone_start: str = "17:00"
    zone_end: str = "18:00"
    zone_timezone: str = "America/New_York"
    # System safeguard (not from the video): ignore no-wicks on bars the data validator flagged.
    skip_flagged_bars: bool = True


class SetupStatus(StrEnum):
    PENDING = "pending"
    REJECTED = "rejected"  # never became a valid order
    CANCELLED = "cancelled"  # valid order that was invalidated before filling
    OPEN = "open"
    WON = "won"
    LOST = "lost"
    CLOSED = "closed"  # closed early (no-trading zone / news) or still open at the end of data


@dataclass
class Setup:
    direction: str  # "long" | "short"
    nowick_index: int
    nowick_time: pd.Timestamp
    nowick_open: float
    entry: float
    stop: float
    target: float
    raw_risk: float  # entry-to-structure distance before breathing room (price units)
    raw_risk_units: float  # same in pips / ticks
    protective_level: float
    protective_index: int
    omar_entry: bool = False
    status: SetupStatus = SetupStatus.PENDING
    reason: str = ""
    came_close: bool = False
    fill_index: int | None = None
    fill_time: pd.Timestamp | None = None
    fill_price: float | None = None
    exit_index: int | None = None
    exit_time: pd.Timestamp | None = None
    exit_price: float | None = None
    exit_reason: str | None = None

    @property
    def r_multiple(self) -> float | None:
        if self.fill_price is None or self.exit_price is None:
            return None
        risk = abs(self.fill_price - self.stop)
        if risk == 0:
            return 0.0
        sign = 1 if self.direction == "long" else -1
        return sign * (self.exit_price - self.fill_price) / risk


@dataclass
class ScanResult:
    setups: list[Setup]
    structure: StructureResult
    flags: pd.DataFrame
    warnings: list[str] = field(default_factory=list)

    def by_status(self, *statuses: SetupStatus) -> list[Setup]:
        return [s for s in self.setups if s.status in statuses]

    def summary(self) -> dict[str, float | int]:
        won = len(self.by_status(SetupStatus.WON))
        lost = len(self.by_status(SetupStatus.LOST))
        closed = [s for s in self.by_status(SetupStatus.CLOSED) if s.r_multiple is not None]
        decided = won + lost
        return {
            "setups_detected": len(self.setups),
            "rejected": len(self.by_status(SetupStatus.REJECTED)),
            "cancelled": len(self.by_status(SetupStatus.CANCELLED)),
            "filled": won + lost + len(closed) + len(self.by_status(SetupStatus.OPEN)),
            "won": won,
            "lost": lost,
            "closed_early": len(closed),
            "win_rate": won / decided if decided else float("nan"),
            "total_r": float(sum(s.r_multiple or 0.0 for s in self.setups if s.r_multiple is not None)),
        }


def _parse_hhmm(v: str) -> time:
    hh, mm = v.split(":")
    return time(int(hh), int(mm))


def no_trade_mask(index: pd.DatetimeIndex, params: OriginalParams, buffer_minutes: int) -> np.ndarray:
    """True where a bar starts inside the no-trading zone (plus buffer on both sides)."""
    if len(index) == 0:
        return np.zeros(0, dtype=bool)
    local = index.tz_convert(params.zone_timezone)
    minutes = local.hour * 60 + local.minute
    s = _parse_hhmm(params.zone_start)
    e = _parse_hhmm(params.zone_end)
    start = (s.hour * 60 + s.minute - buffer_minutes) % 1440
    end = (e.hour * 60 + e.minute + buffer_minutes) % 1440
    m = np.asarray(minutes)
    if start == end:
        return np.ones(len(index), dtype=bool) if buffer_minutes > 0 else np.zeros(len(index), dtype=bool)
    if start < end:
        return (m >= start) & (m < end)
    return (m >= start) | (m < end)


def news_mask(index: pd.DatetimeIndex, events: Sequence[pd.Timestamp], minutes: int,
              bar: pd.Timedelta) -> np.ndarray:
    """True where a bar overlaps [event - minutes, event + minutes]."""
    out = np.zeros(len(index), dtype=bool)
    if not events:
        return out
    w = pd.Timedelta(minutes=minutes)
    for ev in events:
        ev = pd.Timestamp(ev)
        ev = ev.tz_localize("UTC") if ev.tzinfo is None else ev
        out |= (index + bar > ev - w) & (index < ev + w)
    return out


class OriginalYoutubeScanner:
    """Walks the clean OHLCV bar by bar (causal) and records every setup's life cycle.

    The fill/exit simulation exists so setups can be verified on charts; it is
    deliberately simple and pessimistic and is not the project's backtester.
    """

    def __init__(self, params: OriginalParams | None = None) -> None:
        self.params = params or OriginalParams()

    def scan(self, df: pd.DataFrame, symbol: str, interval: str,
             news_events: Sequence[pd.Timestamp] = ()) -> ScanResult:
        p = self.params
        spec = instrument_spec(symbol)
        warnings = self._timeframe_warnings(spec, interval)
        structure = StructureEngine(p.swing_atr_mult, p.atr_length).run(df)
        flags = nowick_flags(df, spec.precision)

        o, h, lo, c = (df[k].to_numpy(float) for k in ("open", "high", "low", "close"))
        idx = df.index
        n = len(df)
        trend = structure.trend.to_numpy(object)
        prot_lvl = structure.protective_level.to_numpy(float)
        prot_idx = structure.protective_index.to_numpy(int)
        prot_set = structure.protective_set_at.to_numpy(int)
        buffer = p.futures_zone_buffer_minutes if spec.kind == "futures" else 0
        blocked = no_trade_mask(idx, p, buffer) | news_mask(idx, news_events, p.news_blackout_minutes,
                                                            interval_delta(interval))
        flagged = (df["flag_any"].to_numpy(bool) if (p.skip_flagged_bars and "flag_any" in df.columns)
                   else np.zeros(n, dtype=bool))
        near = (p.near_miss_pips_forex if spec.kind == "forex" else p.near_miss_ticks_futures) * spec.unit

        setups: list[Setup] = []
        pending: list[Setup] = []
        open_pos: Setup | None = None

        def close(s: Setup, j: int, price: float, reason: str, status: SetupStatus) -> None:
            s.exit_index, s.exit_time, s.exit_price, s.exit_reason, s.status = j, idx[j], price, reason, status

        def cancel(s: Setup, reason: str) -> None:
            s.status, s.reason = SetupStatus.CANCELLED, reason

        for j in range(n):
            # 1) open position: forced close before the no-trading zone / news
            if open_pos is not None and blocked[j] and j > 0:
                close(open_pos, j - 1, c[j - 1], "closed before no-trading zone/news", SetupStatus.CLOSED)
                open_pos = None
            # 2) open position: stop / target on this bar (stop first if both)
            if open_pos is not None:
                self._manage(open_pos, j, o[j], h[j], lo[j], close)
                if open_pos.status != SetupStatus.OPEN:
                    open_pos = None

            # 3) pending orders
            for s in list(pending):
                age = j - s.nowick_index
                long = s.direction == "long"
                want = Trend.UP.value if long else Trend.DOWN.value
                if blocked[j]:
                    cancel(s, "reached the no-trading zone / news window before filling")
                elif age > p.max_return_candles:
                    cancel(s, f"price did not return within {p.max_return_candles} candles")
                elif trend[j - 1] != want:
                    cancel(s, f"trend changed before the tap ({trend[j - 1]})")
                elif prot_set[j - 1] > s.nowick_index:
                    cancel(s, "price created new structure before tapping")
                if s.status != SetupStatus.PENDING:
                    pending.remove(s)
                    continue

                touched = lo[j] <= s.entry if long else h[j] >= s.entry
                if touched and (open_pos is None or not p.one_position_at_a_time):
                    gapped_past_stop = o[j] <= s.stop if long else o[j] >= s.stop
                    if gapped_past_stop:
                        cancel(s, "bar opened beyond the stop (gap); no valid entry")
                        pending.remove(s)
                        continue
                    fill = min(s.entry, o[j]) if long else max(s.entry, o[j])
                    s.status, s.fill_index, s.fill_time, s.fill_price = SetupStatus.OPEN, j, idx[j], fill
                    pending.remove(s)
                    stop_hit = lo[j] <= s.stop if long else h[j] >= s.stop
                    if stop_hit:  # entry and stop in the same bar: pessimistic, count the loss
                        close(s, j, s.stop, "stop (same bar as entry)", SetupStatus.LOST)
                    else:
                        open_pos = s
                    if p.one_position_at_a_time:
                        for other in pending:
                            cancel(other, "another setup filled first (one position at a time)")
                        pending.clear()
                    log_event(logger, "strategy.setup_filled", symbol=symbol, direction=s.direction,
                              ts=idx[j], entry=fill, stop=s.stop, target=s.target)
                    break
                if not touched:
                    close_now = lo[j] <= s.entry + near if long else h[j] >= s.entry - near
                    s.came_close = s.came_close or close_now
                    reached_tp = h[j] >= s.target if long else lo[j] <= s.target
                    if s.came_close and reached_tp:
                        cancel(s, "price came close to the entry, then reached TP without filling")
                        pending.remove(s)

            # 4) new no-wick setups on this bar's close
            direction = ("long" if flags["nowick_bull"].iat[j] and trend[j] == Trend.UP.value else
                         "short" if flags["nowick_bear"].iat[j] and trend[j] == Trend.DOWN.value else None)
            if direction is None:
                continue
            s = self._build(direction, j, idx[j], o[j], prot_lvl[j], prot_idx[j], spec)
            setups.append(s)
            if blocked[j]:
                s.status, s.reason = SetupStatus.REJECTED, "no-wick formed in the no-trading zone / news window"
            elif flagged[j]:
                s.status, s.reason = SetupStatus.REJECTED, "bar flagged by the data validator"
            elif open_pos is not None and p.one_position_at_a_time:
                s.status, s.reason = SetupStatus.REJECTED, "already in a position (one position at a time)"
            if s.status == SetupStatus.PENDING:
                pending.append(s)
                log_event(logger, "strategy.setup_detected", symbol=symbol, direction=direction, ts=idx[j],
                          entry=s.entry, stop=s.stop, target=s.target, omar_entry=s.omar_entry)

        for s in pending:
            s.reason = "still pending at the end of the data"
        if open_pos is not None:
            open_pos.reason = "still open at the end of the data"
        return ScanResult(setups=setups, structure=structure, flags=flags, warnings=warnings)

    # ------------------------------------------------------------------ helpers
    def _build(self, direction: str, j: int, ts: pd.Timestamp, nowick_open: float, prot: float,
               prot_i: int, spec: InstrumentSpec) -> Setup:
        p = self.params
        long = direction == "long"
        raw = (nowick_open - prot) if long else (prot - nowick_open)
        s = Setup(direction=direction, nowick_index=j, nowick_time=ts, nowick_open=nowick_open,
                  entry=nowick_open, stop=prot, target=nowick_open, raw_risk=raw,
                  raw_risk_units=spec.units(raw) if not np.isnan(raw) else float("nan"),
                  protective_level=prot, protective_index=int(prot_i))
        if np.isnan(raw) or raw <= 0:
            s.status, s.reason = SetupStatus.REJECTED, "stop level is not beyond the entry"
            return s
        min_units = p.min_stop_pips_forex if spec.kind == "forex" else p.min_stop_ticks_futures
        if s.raw_risk_units < min_units:
            s.status = SetupStatus.REJECTED
            s.reason = f"stop {s.raw_risk_units:.1f} {'pips' if spec.kind == 'forex' else 'ticks'} is below the minimum"
            return s
        sign = 1 if long else -1
        breathing = raw * p.breathing_room_pct
        s.stop = prot - sign * breathing
        if spec.kind == "forex" and s.raw_risk_units > p.omar_entry_min_stop_pips:
            s.entry = nowick_open + sign * p.omar_entry_offset_pips * spec.unit
            s.omar_entry = True
        risk = abs(s.entry - s.stop)
        s.target = s.entry + sign * p.reward_risk * risk
        return s

    @staticmethod
    def _manage(s: Setup, j: int, o: float, h: float, lo: float, close) -> None:
        long = s.direction == "long"
        if long:
            if lo <= s.stop:
                close(s, j, min(s.stop, o), "stop", SetupStatus.LOST)
            elif h >= s.target:
                close(s, j, max(s.target, o), "target", SetupStatus.WON)
        else:
            if h >= s.stop:
                close(s, j, max(s.stop, o), "stop", SetupStatus.LOST)
            elif lo <= s.target:
                close(s, j, min(s.target, o), "target", SetupStatus.WON)

    @staticmethod
    def _timeframe_warnings(spec: InstrumentSpec, interval: str) -> list[str]:
        mins = interval_delta(interval).total_seconds() / 60
        if spec.kind == "forex" and mins < 15:
            return [f"video: forex should be traded on 15m or higher, not {interval}"]
        if spec.kind == "futures" and mins not in (5, 15):
            return [f"video: futures are traded on the 5m or 15m, not {interval}"]
        if spec.kind == "other":
            return [f"{spec.symbol} is not one of the markets named in the video"]
        return []


def default_definition(symbols: list[str] | None = None, interval: str = "5m",
                       params: OriginalParams | None = None) -> StrategyDefinition:
    return StrategyDefinition(
        name=STRATEGY_NAME,
        version="1.0.0",
        symbols=symbols or ["ES=F"],
        interval=interval,
        params=asdict(params or OriginalParams()),
        warmup_bars=100,
        description="No Wick strategy as taught in youtu.be/DD9A9hHYqvc (original, unoptimised).",
    )


@register(STRATEGY_NAME)
class OriginalYoutubeStrategy(Strategy):
    """Standard-interface wrapper: emits a limit-entry signal when the last bar is a valid no-wick setup."""

    def __init__(self, definition: StrategyDefinition) -> None:
        super().__init__(definition)
        self.params = OriginalParams(**definition.params) if definition.params else OriginalParams()
        self.scanner = OriginalYoutubeScanner(self.params)

    def scan(self, md: MarketData, news_events: Sequence[pd.Timestamp] = ()) -> ScanResult:
        return self.scanner.scan(md.frame, md.symbol, md.interval, news_events)

    def evaluate(self, md: MarketData) -> list[Signal]:
        if len(md.frame) < 2:
            return []
        result = self.scan(md)
        last = len(md.frame) - 1
        quality = md.quality or DataQualityStatus.WARNING
        out: list[Signal] = []
        for s in result.setups:
            if s.nowick_index != last or s.status != SetupStatus.PENDING:
                continue
            out.append(Signal(
                strategy=self.name,
                symbol=md.symbol,
                interval=md.interval,
                timestamp=md.frame.index[last].to_pydatetime(),
                action=SignalAction.ENTER_LONG if s.direction == "long" else SignalAction.ENTER_SHORT,
                price=s.entry,
                stop=s.stop,
                target=s.target,
                reason=(f"{'bullish' if s.direction == 'long' else 'bearish'} no-wick in "
                        f"{'up' if s.direction == 'long' else 'down'}trend; LIMIT entry"
                        f"{' (Omar entry)' if s.omar_entry else ''}; valid for "
                        f"{self.params.max_return_candles} candles"),
                indicators={"raw_risk_units": s.raw_risk_units, "protective_level": s.protective_level,
                            "expires_after_bars": float(self.params.max_return_candles)},
                data_quality=quality if isinstance(quality, DataQualityStatus) else DataQualityStatus.WARNING,
            ))
        return out
