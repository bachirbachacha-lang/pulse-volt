"""Market-structure engine for ORIGINAL_YOUTUBE_STRATEGY (Omar Nowick's model).

Implements the structure rules taught in "No Wick Strategy (85% Win Rate
Trading System + Live Backtest)" (youtu.be/DD9A9hHYqvc), chapters 6:10-40:41:

* Uptrend = higher highs + higher lows; downtrend = lower highs + lower lows.
* Break of structure (BOS) and change of character (CHoCH) need a candle
  BODY to close beyond the BODY of the reference candle. Wicks never count
  (35:52 "Body Closure", 1:05:10).
* After every BOS a new recent higher low (uptrend) / lower high (downtrend)
  is fixed with the "snake method": walk back from the new extreme to the first
  turn (14:17). Everything between the recent low and high is internal
  structure and is ignored.
* CHoCH = body close beyond the recent higher low / lower high (25:29).
* A trend reverses only after 3 steps: CHoCH, a lower high (or higher low),
  then a BOS (27:59). Between CHoCH and that BOS the market is "neutral".

From "How to Actually Achieve an 85% Win Rate Trading No Wick Strategy"
(youtu.be/VafqLoSOve8):

* A CHoCH preceded by internal counter-structure (high, low, lower high,
  lower low, then the CHoCH) already makes reversal setups tradeable: the
  "A setup" (10:52). A CHoCH without that structure is a "C setup" (4:13).
* A no-wick that forms right after the BOS, in the trend's last leg, is the
  clean "grandma" kind; one that forms in the retracement towards the
  potential higher low is "valid but not good" (20:27, 25:02).

DISCRETIONARY COMPONENT -> deterministic interpretation (NOT from the video):
the creator only counts "proper" pullbacks ("push, pullback, push"; small
candles do not count, 22:36). Here a swing turn counts only once price has
retraced at least ``swing_atr_mult x ATR(atr_length)`` from the extreme.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum

import numpy as np
import pandas as pd

from trading.indicators import atr


class Trend(StrEnum):
    UNKNOWN = "unknown"
    UP = "up"
    DOWN = "down"
    NEUTRAL_AFTER_BEARISH_CHOCH = "neutral_after_bearish_choch"  # was up, CHoCH down, not confirmed
    NEUTRAL_AFTER_BULLISH_CHOCH = "neutral_after_bullish_choch"  # was down, CHoCH up, not confirmed


class Phase(StrEnum):
    NONE = "none"
    IMPULSE = "impulse"  # from the BOS until the leg's extreme is confirmed by a real pullback
    RETRACEMENT = "retracement"  # pulling back / building the next leg before the next BOS
    REVERSAL_A = "reversal_a"  # neutral phase after a CHoCH that had internal structure before it
    REVERSAL_C = "reversal_c"  # neutral phase after a CHoCH with no internal structure


@dataclass(frozen=True)
class Pivot:
    kind: str  # "high" | "low"
    index: int  # bar position of the turning candle
    wick: float  # high (for "high") or low (for "low") of that candle
    body: float  # max(open, close) for highs, min(open, close) for lows
    confirmed_at: int  # bar position at which the turn became significant


@dataclass(frozen=True)
class StructureEvent:
    index: int
    kind: str  # "BOS" | "CHOCH" | "TREND_START"
    direction: str  # "bullish" | "bearish"
    level: float  # body level that was broken
    note: str = ""


@dataclass
class StructureState:
    trend: Trend = Trend.UNKNOWN
    # Uptrend references
    recent_high: Pivot | None = None  # HH whose body must be closed above for a bullish BOS
    recent_low: Pivot | None = None  # HL whose body must be closed below for a bearish CHoCH
    # Index of the bar at which the current recent_low / recent_high was fixed by a BOS.
    protective_set_at: int | None = None
    # Neutral-phase references (3-step reversal)
    choch_index: int | None = None
    pre_choch_extreme: Pivot | None = None  # HH (or LL) that existed before the CHoCH
    choch_leg_extreme: Pivot | None = None  # low (or high) made by the CHoCH leg
    a_quality: bool = False  # internal counter-structure formed before the CHoCH (A setup)
    a_stop: Pivot | None = None  # most recent internal lower high / higher low (A-setup stop)

    @property
    def protective(self) -> Pivot | None:
        """The structure level a trade's stop goes behind (HL in uptrend, LH in downtrend)."""
        if self.trend == Trend.UP:
            return self.recent_low
        if self.trend == Trend.DOWN:
            return self.recent_high
        if self.a_quality:
            return self.a_stop
        return None

    @property
    def phase(self) -> Phase:
        if self.trend == Trend.UP:
            return Phase.IMPULSE if self.recent_high is None else Phase.RETRACEMENT
        if self.trend == Trend.DOWN:
            return Phase.IMPULSE if self.recent_low is None else Phase.RETRACEMENT
        if self.trend in (Trend.NEUTRAL_AFTER_BEARISH_CHOCH, Trend.NEUTRAL_AFTER_BULLISH_CHOCH):
            return Phase.REVERSAL_A if self.a_quality else Phase.REVERSAL_C
        return Phase.NONE

    @property
    def tradeable_direction(self) -> str | None:
        """Direction no-wick setups may be taken in after this bar (None = no trading)."""
        if self.trend == Trend.UP or (self.trend == Trend.NEUTRAL_AFTER_BULLISH_CHOCH and self.a_quality):
            return "long"
        if self.trend == Trend.DOWN or (self.trend == Trend.NEUTRAL_AFTER_BEARISH_CHOCH and self.a_quality):
            return "short"
        return None


@dataclass
class StructureResult:
    trend: pd.Series  # Trend value after each bar closed
    protective_level: pd.Series  # wick price of HL (up) / LH (down), NaN otherwise
    protective_index: pd.Series  # bar position of that pivot (-1 if none)
    protective_set_at: pd.Series  # bar position where it was fixed by a BOS (-1 if none)
    phase: pd.Series = None  # Phase value after each bar
    tradeable: pd.Series = None  # "long" / "short" / None after each bar
    pivots: list[Pivot] = field(default_factory=list)
    events: list[StructureEvent] = field(default_factory=list)


def _body_top(o: float, c: float) -> float:
    return max(o, c)


def _body_bottom(o: float, c: float) -> float:
    return min(o, c)


class StructureEngine:
    """Causal, bar-by-bar structure reader. ``run`` never looks at future bars."""

    def __init__(self, swing_atr_mult: float = 1.0, atr_length: int = 14) -> None:
        if swing_atr_mult <= 0:
            raise ValueError("swing_atr_mult must be positive")
        self.swing_atr_mult = swing_atr_mult
        self.atr_length = atr_length

    def run(self, df: pd.DataFrame) -> StructureResult:
        o = df["open"].to_numpy(float)
        h = df["high"].to_numpy(float)
        lo = df["low"].to_numpy(float)
        c = df["close"].to_numpy(float)
        n = len(df)
        a = atr(df, self.atr_length).to_numpy(float)

        pivots: list[Pivot] = []
        events: list[StructureEvent] = []
        st = StructureState()

        trend_out = np.empty(n, dtype=object)
        lvl_out = np.full(n, np.nan)
        pidx_out = np.full(n, -1, dtype=int)
        pset_out = np.full(n, -1, dtype=int)
        phase_out = np.empty(n, dtype=object)
        trade_out = np.empty(n, dtype=object)

        # Zig-zag state
        direction = 0  # +1 tracking a high, -1 tracking a low, 0 undecided
        ext_hi_i = ext_lo_i = 0

        def make(kind: str, i: int, at: int) -> Pivot:
            if kind == "high":
                return Pivot("high", i, h[i], _body_top(o[i], c[i]), at)
            return Pivot("low", i, lo[i], _body_bottom(o[i], c[i]), at)

        def last_pivot(kind: str, before: int, after: int = -1) -> Pivot | None:
            for p in reversed(pivots):
                if p.kind == kind and after < p.index < before:
                    return p
            return None

        def snake(kind: str, bar: int, after: int) -> Pivot | None:
            """Most recent significant turn of ``kind`` between ``after`` and ``bar``.

            Falls back to the lowest low / highest high in that span when no
            confirmed pivot exists yet (the turn is still forming)."""
            p = last_pivot(kind, before=bar + 1, after=after)
            if p is not None:
                return p
            lo_i = max(after + 1, 0)
            if lo_i > bar:
                return None
            span = range(lo_i, bar + 1)
            i = min(span, key=lambda k: lo[k]) if kind == "low" else max(span, key=lambda k: h[k])
            return make(kind, i, bar)

        def extreme(kind: str, start: int | None, bar: int) -> Pivot:
            """Highest high / lowest low candle from ``start`` to ``bar`` (the unfinished leg)."""
            span = range(start if start is not None else 0, bar + 1)
            k = max(span, key=lambda j: h[j]) if kind == "high" else min(span, key=lambda j: lo[j])
            return make(kind, k, bar)

        def internal_structure(bearish: bool, extreme: Pivot, bar: int) -> Pivot | None:
            """Counter-structure between the trend extreme and the CHoCH bar.

            Bearish case: a swing low L1, then a lower high H2 (below the HH), then a
            body close below L1's body (a lower low) before ``bar``. Returns H2 (the
            A-setup stop reference) or None."""
            first, second = ("low", "high") if bearish else ("high", "low")
            for p2 in reversed([q for q in pivots if q.kind == second and extreme.index < q.index < bar]):
                lower = p2.wick < extreme.wick if bearish else p2.wick > extreme.wick
                if not lower:
                    continue
                p1 = last_pivot(first, before=p2.index, after=extreme.index)
                if p1 is None:
                    continue
                broke = any((c[k] < p1.body) if bearish else (c[k] > p1.body) for k in range(p2.index + 1, bar))
                if broke:
                    return last_pivot(second, before=bar, after=extreme.index) or p2
            return None

        for i in range(n):
            # ---------------------------------------------------- zig-zag pivots
            thr = self.swing_atr_mult * (a[i] if not np.isnan(a[i]) else (h[i] - lo[i]))
            if direction == 0:
                if h[i] >= h[ext_hi_i]:
                    ext_hi_i = i
                if lo[i] <= lo[ext_lo_i]:
                    ext_lo_i = i
                if thr > 0 and h[ext_hi_i] - lo[i] >= thr and ext_hi_i < i:
                    pivots.append(make("high", ext_hi_i, i))
                    direction, ext_lo_i = -1, i
                elif thr > 0 and h[i] - lo[ext_lo_i] >= thr and ext_lo_i < i:
                    pivots.append(make("low", ext_lo_i, i))
                    direction, ext_hi_i = 1, i
            elif direction == 1:
                if h[i] >= h[ext_hi_i]:
                    ext_hi_i = i
                elif h[ext_hi_i] - lo[i] >= thr:
                    pivots.append(make("high", ext_hi_i, i))
                    direction, ext_lo_i = -1, i
            else:
                if lo[i] <= lo[ext_lo_i]:
                    ext_lo_i = i
                elif h[i] - lo[ext_lo_i] >= thr:
                    pivots.append(make("low", ext_lo_i, i))
                    direction, ext_hi_i = 1, i

            new_pivot = pivots[-1] if pivots and pivots[-1].confirmed_at == i else None

            # ---------------------------------------------------- structure
            if st.trend == Trend.UNKNOWN:
                # Warm-up: first body close beyond the latest swing high/low sets the trend.
                ph = last_pivot("high", before=i)
                pl = last_pivot("low", before=i)
                if ph is not None and c[i] > ph.body:
                    hl = snake("low", i, after=ph.index)
                    if hl is not None:
                        st = StructureState(trend=Trend.UP, recent_low=hl, protective_set_at=i)
                        events.append(StructureEvent(i, "TREND_START", "bullish", ph.body, "warm-up"))
                elif pl is not None and c[i] < pl.body:
                    lh = snake("high", i, after=pl.index)
                    if lh is not None:
                        st = StructureState(trend=Trend.DOWN, recent_high=lh, protective_set_at=i)
                        events.append(StructureEvent(i, "TREND_START", "bearish", pl.body, "warm-up"))

            elif st.trend == Trend.UP:
                if new_pivot is not None and new_pivot.kind == "high" and st.recent_high is None:
                    st.recent_high = new_pivot  # the BOS leg finished: this is the HH
                if c[i] < st.recent_low.body:
                    hh = st.recent_high or extreme("high", st.protective_set_at, i)
                    a_stop = internal_structure(True, hh, i)
                    events.append(StructureEvent(i, "CHOCH", "bearish", st.recent_low.body,
                                                 "A (structure before CHoCH)" if a_stop else "C (no structure)"))
                    st = StructureState(trend=Trend.NEUTRAL_AFTER_BEARISH_CHOCH, choch_index=i,
                                        pre_choch_extreme=hh, a_quality=a_stop is not None, a_stop=a_stop,
                                        protective_set_at=i)
                elif st.recent_high is not None and c[i] > st.recent_high.body:
                    events.append(StructureEvent(i, "BOS", "bullish", st.recent_high.body))
                    hl = snake("low", i, after=st.recent_high.index)
                    st.recent_low = hl or st.recent_low
                    st.recent_high = None
                    st.protective_set_at = i

            elif st.trend == Trend.DOWN:
                if new_pivot is not None and new_pivot.kind == "low" and st.recent_low is None:
                    st.recent_low = new_pivot
                if c[i] > st.recent_high.body:
                    ll = st.recent_low or extreme("low", st.protective_set_at, i)
                    a_stop = internal_structure(False, ll, i)
                    events.append(StructureEvent(i, "CHOCH", "bullish", st.recent_high.body,
                                                 "A (structure before CHoCH)" if a_stop else "C (no structure)"))
                    st = StructureState(trend=Trend.NEUTRAL_AFTER_BULLISH_CHOCH, choch_index=i,
                                        pre_choch_extreme=ll, a_quality=a_stop is not None, a_stop=a_stop,
                                        protective_set_at=i)
                elif st.recent_low is not None and c[i] < st.recent_low.body:
                    events.append(StructureEvent(i, "BOS", "bearish", st.recent_low.body))
                    lh = snake("high", i, after=st.recent_low.index)
                    st.recent_high = lh or st.recent_high
                    st.recent_low = None
                    st.protective_set_at = i

            elif st.trend == Trend.NEUTRAL_AFTER_BEARISH_CHOCH:
                if st.a_quality and new_pivot is not None and new_pivot.kind == "high" \
                        and new_pivot.wick < st.pre_choch_extreme.wick:
                    st.a_stop, st.protective_set_at = new_pivot, i  # newer lower high (snake method)
                # Step 1 done (CHoCH). Step 2: the CHoCH leg's low, then a lower high.
                if st.choch_leg_extreme is None and new_pivot is not None and new_pivot.kind == "low" \
                        and new_pivot.index >= st.choch_index:
                    st.choch_leg_extreme = new_pivot
                leg = st.choch_leg_extreme
                lower_high = leg is not None and last_pivot("high", before=i + 1, after=leg.index) is not None
                if leg is not None and lower_high and c[i] < leg.body:
                    # Step 3: bearish BOS -> confirmed downtrend.
                    events.append(StructureEvent(i, "BOS", "bearish", leg.body, "3-step reversal confirmed"))
                    lh = snake("high", i, after=leg.index)
                    st = StructureState(trend=Trend.DOWN, recent_high=lh, protective_set_at=i)
                elif st.pre_choch_extreme is not None and c[i] > st.pre_choch_extreme.body:
                    # Not covered by the video: body close back above the old HH. Treated as the
                    # uptrend resuming (bullish BOS), with the snake-method higher low.
                    events.append(StructureEvent(i, "BOS", "bullish", st.pre_choch_extreme.body,
                                                 "uptrend resumed after failed CHoCH (interpretation)"))
                    hl = snake("low", i, after=st.choch_index - 1)
                    st = StructureState(trend=Trend.UP, recent_low=hl, protective_set_at=i)

            elif st.trend == Trend.NEUTRAL_AFTER_BULLISH_CHOCH:
                if st.a_quality and new_pivot is not None and new_pivot.kind == "low" \
                        and new_pivot.wick > st.pre_choch_extreme.wick:
                    st.a_stop, st.protective_set_at = new_pivot, i
                if st.choch_leg_extreme is None and new_pivot is not None and new_pivot.kind == "high" \
                        and new_pivot.index >= st.choch_index:
                    st.choch_leg_extreme = new_pivot
                leg = st.choch_leg_extreme
                higher_low = leg is not None and last_pivot("low", before=i + 1, after=leg.index) is not None
                if leg is not None and higher_low and c[i] > leg.body:
                    events.append(StructureEvent(i, "BOS", "bullish", leg.body, "3-step reversal confirmed"))
                    hl = snake("low", i, after=leg.index)
                    st = StructureState(trend=Trend.UP, recent_low=hl, protective_set_at=i)
                elif st.pre_choch_extreme is not None and c[i] < st.pre_choch_extreme.body:
                    events.append(StructureEvent(i, "BOS", "bearish", st.pre_choch_extreme.body,
                                                 "downtrend resumed after failed CHoCH (interpretation)"))
                    lh = snake("high", i, after=st.choch_index - 1)
                    st = StructureState(trend=Trend.DOWN, recent_high=lh, protective_set_at=i)

            trend_out[i] = st.trend.value
            phase_out[i] = st.phase.value
            trade_out[i] = st.tradeable_direction
            prot = st.protective
            if prot is not None:
                lvl_out[i] = prot.wick
                pidx_out[i] = prot.index
                pset_out[i] = st.protective_set_at if st.protective_set_at is not None else -1

        idx = df.index
        return StructureResult(
            trend=pd.Series(trend_out, index=idx, name="trend"),
            protective_level=pd.Series(lvl_out, index=idx, name="protective_level"),
            protective_index=pd.Series(pidx_out, index=idx, name="protective_index"),
            protective_set_at=pd.Series(pset_out, index=idx, name="protective_set_at"),
            phase=pd.Series(phase_out, index=idx, name="phase"),
            tradeable=pd.Series(trade_out, index=idx, name="tradeable"),
            pivots=pivots,
            events=events,
        )
