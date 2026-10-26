"""ORIGINAL_YOUTUBE_STRATEGY: rule-by-rule checks against the video.

Each scenario is a hand-built candle sequence that reproduces a situation the
creator explains or quizzes on, with his stated answer as the expected result.
Timestamps refer to youtu.be/DD9A9hHYqvc.
"""

import pandas as pd
import pytest

from trading.core.schemas import AssetClass, DataQualityStatus, MarketData, SignalAction
from trading.strategies import get_strategy, registered
from trading.strategies.original_youtube import (
    STRATEGY_NAME,
    OriginalParams,
    OriginalYoutubeScanner,
    SetupCategory,
    SetupStatus,
    StructureEngine,
    Trend,
    default_definition,
)
from trading.strategies.original_youtube.instruments import instrument_spec
from trading.strategies.original_youtube.structure import Phase
from trading.strategies.original_youtube.nowick import nowick_flags

UP6, DN3 = [+1] * 6, [-1] * 3
# low,high,HL,HH; bullish BOS on bar 12 (close 107 > body 106 of the bar-5 high)
BASE_UP = UP6 + DN3 + UP6


def path(steps, start=100.0, wick=0.25, scale=1.0, t0="2024-03-05 09:30", freq="5min", overrides=None):
    rows, p = [], start
    for s in steps:
        o, c = p, p + s * scale
        rows.append([o, max(o, c) + wick * scale, min(o, c) - wick * scale, c, 1000.0])
        p = c
    for i, (o, h, lo, c) in (overrides or {}).items():
        rows[i][:4] = [o, h, lo, c]
    idx = pd.date_range(t0, periods=len(rows), freq=freq, tz="America/New_York")
    return pd.DataFrame(rows, columns=["open", "high", "low", "close", "volume"], index=idx)


def scan(df, symbol="ES=F", interval="5m", **params):
    return OriginalYoutubeScanner(OriginalParams(**params)).scan(df, symbol, interval)


# --------------------------------------------------------------------- structure


def test_body_close_needed_for_bos():
    # 38:00 "I need the body to close above the body". Bar 11 wicks above the bar-5 body
    # (106) but closes at 106: no BOS. Bar 12 closes 107: BOS.
    df = path(BASE_UP, overrides={11: (105, 106.9, 104.75, 106)})
    r = StructureEngine().run(df)
    first = r.events[0]
    assert first.index == 12 and first.kind == "TREND_START" and first.level == 106


def test_wick_below_higher_low_is_not_choch():
    # 1:05:10 "If we wick below the higher low we don't count this as a change of character."
    steps = BASE_UP + [+1, +1] + [-1] * 4 + [+1] * 3
    hl_body = 103.0  # body bottom of the bar-9 higher low
    df = path(steps)
    i = 18  # a bearish bar whose wick pierces the HL but closes above its body
    df.iloc[i] = [104.5, 104.75, 102.0, 103.25, 1000.0]
    r = StructureEngine().run(df)
    assert not any(e.kind == "CHOCH" for e in r.events)
    assert r.trend.iloc[i] == Trend.UP
    assert hl_body < 103.25


def test_snake_method_picks_most_recent_higher_low():
    # 42:32 quiz Q2 / 46:26 Q5: the recent higher low is the last turn before the new high,
    # not the deeper swing low further back.
    steps = BASE_UP + [+1] * 2 + [-1] * 5 + [+1] * 3 + [-1] * 2 + [+1] * 6
    df = path(steps)
    r = StructureEngine().run(df)
    bos = [e for e in r.events if e.kind == "BOS" and e.direction == "bullish"][0]
    prot_idx = r.protective_index.iloc[bos.index]
    lows = [p for p in r.pivots if p.kind == "low" and p.index < bos.index]
    deepest = min(lows, key=lambda p: p.wick)
    assert prot_idx == lows[-1].index != deepest.index


def test_choch_is_not_a_confirmed_downtrend_and_three_steps_confirm_it():
    # 28:01 three steps; 53:30 quiz Q9 "not a confirmed downtrend" after CHoCH alone.
    steps = UP6 + DN3 + UP6 + DN3 + UP6 + DN3 + UP6 + [-1] * 8 + [+1] * 3 + [-1] * 6
    r = StructureEngine().run(path(steps))
    kinds = [(e.kind, e.direction) for e in r.events]
    choch = next(e for e in r.events if e.kind == "CHOCH")
    assert r.trend.iloc[choch.index] == Trend.NEUTRAL_AFTER_BEARISH_CHOCH
    assert ("BOS", "bearish") in kinds
    confirm = next(e for e in r.events if e.kind == "BOS" and e.direction == "bearish")
    assert confirm.index > choch.index and r.trend.iloc[confirm.index] == Trend.DOWN


def test_structure_is_causal():
    steps = UP6 + DN3 + UP6 + DN3 + UP6 + DN3 + UP6 + [-1] * 8 + [+1] * 3 + [-1] * 6
    df = path(steps)
    full = StructureEngine().run(df).trend
    for cut in (15, 30, 45):
        part = StructureEngine().run(df.iloc[:cut]).trend
        assert part.tolist() == full.iloc[:cut].tolist()


# ---------------------------------------------------------------------- no-wick


def test_nowick_detection_exact_at_price_precision():
    idx = pd.date_range("2024-01-02 10:00", periods=5, freq="5min", tz="UTC")
    df = pd.DataFrame({
        "open": [100, 100, 101, 101, 100], "high": [101, 101, 101, 101.25, 100.25],
        "low": [100, 99.75, 100, 100, 100], "close": [100.75, 100.75, 100.25, 100.25, 100], "volume": 1.0,
    }, index=idx)
    f = nowick_flags(df, instrument_spec("ES=F").precision)
    assert f["nowick_bull"].tolist() == [True, False, False, False, False]  # bar 1 has a 1-tick bottom wick
    assert f["nowick_bear"].tolist() == [False, False, True, False, False]  # bar 3 has a top wick; bar 4 doji


# ------------------------------------------------------------------------ setups


def bull_setup_df(after):
    """Uptrend (BOS on bar 12), bullish no-wick on bar 14 (open 108 = low), then ``after``."""
    steps = BASE_UP + [+1, +1] + [0] * len(after)
    over = {14: (108.0, 109.25, 108.0, 109.0)}
    df = path(steps, overrides=over)
    for k, row in enumerate(after):
        df.iloc[15 + k, :4] = row
    return df


RALLY = [(109.0, 109.1, 107.9, 108.4)] + [(108.4 + k, 109.65 + k, 108.3 + k, 109.4 + k) for k in range(7)]


def test_long_setup_fills_on_tap_and_hits_one_to_one():
    r = scan(bull_setup_df(RALLY))
    s = r.setups[0]
    assert s.direction == "long" and s.entry == 108.0
    assert s.protective_level == pytest.approx(102.75)  # wick of the snake-method HL (bar 9)
    assert s.stop == pytest.approx(102.75 - 0.1 * (108 - 102.75))  # 10% breathing room (interpretation)
    assert s.target - s.entry == pytest.approx(s.entry - s.stop)  # fixed 1:1
    assert s.fill_index == 15 and s.status == SetupStatus.WON and s.r_multiple == pytest.approx(1.0)


def test_eleventh_candle_is_not_allowed():
    # 1:22:25 "11th, no, you're not allowed to take the trade anymore."
    flat = [(109.5, 109.75, 109.25, 109.5)] * 10
    df = bull_setup_df(flat + [(109.5, 109.6, 107.5, 108.2)])
    s = scan(df).setups[0]
    assert s.status == SetupStatus.CANCELLED and "10 candles" in s.reason
    df10 = bull_setup_df(flat[:9] + [(109.5, 109.6, 107.5, 108.2)])
    assert scan(df10).setups[0].fill_index == 24  # the 10th candle is allowed


def test_counter_trend_nowick_is_ignored():
    # 1:27:50 "We can ignore this bearish no-wick ... because we're still in an uptrend."
    df = bull_setup_df(RALLY)
    df.iloc[17, :4] = (110.4, 110.4, 109.3, 109.5)  # bearish no-wick in the uptrend
    assert all(s.direction == "long" for s in scan(df).setups)


def test_came_close_then_tp_invalidates():
    # 1:38:11 price comes close to the no-wick, then hits TP: not valid.
    after = [(109.0, 109.1, 108.3, 108.6)] + [(108.6 + k, 109.85 + k, 108.5 + k, 109.6 + k) for k in range(7)]
    s = scan(bull_setup_df(after)).setups[0]
    assert s.status == SetupStatus.CANCELLED and "came close" in s.reason


def test_new_structure_before_tap_invalidates():
    # 1:39:00 price creates structure (a new higher low) before tapping.
    up4 = [(109 + k, 110.25 + k, 108.75 + k, 110 + k) for k in range(4)]  # HH body 113
    dn2 = [(113 - k, 113.25 - k, 111.75 - k, 112 - k) for k in range(2)]  # new higher low ~110.75
    up2 = [(111, 112.25, 110.75, 112), (112, 113.25, 111.75, 113)]  # close 113 = body: not a BOS
    bos = [(113, 114.25, 112.75, 114)]  # body close above: BOS, new HL fixed after the no-wick
    s = scan(bull_setup_df(up4 + dn2 + up2 + bos + [(114, 114.1, 107.5, 108)])).setups[0]
    assert s.status == SetupStatus.CANCELLED and "structure" in s.reason


def test_c_setup_after_choch_without_structure_is_not_traded():
    # Video 1 1:48:08 avoid reversals; video 2 4:13 "C setup": CHoCH with no structure before it.
    steps = UP6 + DN3 + UP6 + DN3 + UP6 + [-1] * 8 + [+1] * 2
    df = path(steps)
    choch = next(e for e in StructureEngine().run(df).events if e.kind == "CHOCH")
    i = choch.index + 1
    o = df["close"].iloc[i - 1]
    df.iloc[i, :4] = (o, o, o - 1.25, o - 1)  # bearish no-wick right after the CHoCH
    setups = scan(df).setups
    assert setups and all(x.category == SetupCategory.C and x.status == SetupStatus.REJECTED for x in setups)


def test_nowick_inside_futures_no_trade_zone_is_rejected():
    # 1:40:16 no-trading zone; futures also 1 hour before/after (2:18:04).
    df = bull_setup_df(RALLY)
    df.index = pd.date_range("2024-03-05 14:50", periods=len(df), freq="5min", tz="America/New_York")
    s = scan(df).setups[0]  # bar 14 = 16:00 New York -> inside the buffered zone
    assert s.status == SetupStatus.REJECTED and "no-trading zone" in s.reason


def test_open_trade_closed_before_no_trade_zone():
    slow = [(109.0, 109.1, 107.9, 108.4)] + [(108.4, 108.9, 108.3, 108.6)] * 6
    df = bull_setup_df(slow)
    df.index = pd.date_range("2024-03-05 14:40", periods=len(df), freq="5min", tz="America/New_York")
    s = scan(df).setups[0]  # fills 15:55, zone (with buffer) starts 16:00
    assert s.status == SetupStatus.CLOSED and "no-trading zone" in s.exit_reason
    assert s.exit_time == pd.Timestamp("2024-03-05 15:55", tz="America/New_York")


def test_entry_and_stop_in_same_bar_counts_as_loss():
    s = scan(bull_setup_df([(109.0, 109.1, 100.0, 101.0)])).setups[0]
    assert s.status == SetupStatus.LOST and s.exit_price == s.stop


def test_forex_minimum_stop_and_omar_entry():
    # 1:35:26 minimum 5 pips before breathing room; 1:36:23 Omar entry if stop > 10 pips.
    def fx(scale):
        steps = BASE_UP + [+1, +1] + [0] * 3
        o = 150 + 9 * scale
        df = path(steps, start=150.0, scale=scale, freq="15min", t0="2024-03-05 02:00",
                  overrides={14: (o, o + 1.25 * scale, o, o + scale)})
        for k in range(15, 18):
            df.iloc[k, :4] = (o + scale, o + 1.1 * scale, o - 0.1 * scale, o + 0.4 * scale)
        return df

    small = scan(fx(0.008), symbol="USDJPY=X", interval="15m").setups[0]  # 5.25 * 0.8 pip = 4.2 pips
    assert small.status == SetupStatus.REJECTED and "minimum" in small.reason
    big = scan(fx(0.05), symbol="USDJPY=X", interval="15m").setups[0]  # 26.25 pips
    assert big.omar_entry and big.entry == pytest.approx(big.nowick_open + 0.02)
    mid = scan(fx(0.015), symbol="USDJPY=X", interval="15m").setups[0]  # 7.9 pips: normal entry
    assert not mid.omar_entry and mid.entry == mid.nowick_open


def test_timeframe_warnings():
    assert scan(bull_setup_df(RALLY), interval="1h").warnings
    assert not scan(bull_setup_df(RALLY)).warnings


# ----------------------------------------------------------- standard interface


def test_registered_and_emits_limit_signal_on_setup_bar():
    assert STRATEGY_NAME in registered()
    strat = get_strategy(default_definition(["ES=F"], "5m"))
    df = bull_setup_df(RALLY)
    md = MarketData(symbol="ES=F", interval="5m", timezone="America/New_York", asset_class=AssetClass.FUTURES,
                    frame=df.iloc[:15])
    sigs = strat.evaluate(md)
    assert len(sigs) == 1
    sig = sigs[0]
    assert sig.action == SignalAction.ENTER_LONG and sig.price == 108.0 and "LIMIT" in sig.reason
    assert sig.data_quality == DataQualityStatus.WARNING  # unvalidated frame is never "OK"
    md_later = md.model_copy(update={"frame": df.iloc[:17]})
    assert strat.evaluate(md_later) == []  # only on the no-wick bar itself


def test_default_params_are_the_documented_original():
    p = OriginalParams()
    assert (p.max_return_candles, p.reward_risk, p.min_stop_pips_forex, p.omar_entry_min_stop_pips,
            p.omar_entry_offset_pips) == (10, 1.0, 5.0, 10.0, 2.0)


# ------------------------------------------------------------- video 2: setup grades
# youtu.be/VafqLoSOve8


def a_setup_df():
    """Uptrend, then internal structure (L1, lower high H2, body close below L1), then CHoCH."""
    steps = BASE_UP + [-1] * 3 + [+1] * 2 + [-1] * 6
    return path(steps + [0] * 14)


def test_a_setup_reversal_after_internal_structure_is_tradeable():
    # 10:52 "we made structure and then ... the change of character. I would take this trade."
    df = a_setup_df()
    r = StructureEngine().run(df)
    choch = next(e for e in r.events if e.kind == "CHOCH")
    assert choch.note.startswith("A")
    assert r.phase.iloc[choch.index] == Phase.REVERSAL_A and r.tradeable.iloc[choch.index] == "short"
    i = choch.index + 1
    o = df["close"].iloc[choch.index]
    df.iloc[i, :4] = (o, o, o - 1.25, o - 1)  # bearish no-wick (small bottom wick: not an S setup)
    df.iloc[i + 1, :4] = (o - 1, o + 0.1, o - 1.1, o - 0.5)  # taps the no-wick open
    for k in range(i + 2, len(df)):
        prev = df["close"].iloc[k - 1]
        df.iloc[k, :4] = (prev, prev + 0.25, prev - 1.25, prev - 1)
    s = scan(df).setups[0]
    assert s.category == SetupCategory.A and s.direction == "short"
    assert s.protective_level == pytest.approx(108.25)  # the internal lower high ("stop loss at the high")
    assert s.fill_index == i + 1 and s.status == SetupStatus.WON


def test_retracement_nowick_is_valid_but_not_good():
    # 25:02 "If the no-wick shows up in the retracement, I don't like to take these trades."
    steps = BASE_UP + [-1] * 3 + [+1] + [0] * 6
    df = path(steps)
    i = 18
    o = df["close"].iloc[17]
    df.iloc[i, :4] = (o, o + 1.25, o, o + 1)  # bullish no-wick at the potential higher low
    s = scan(df).setups[0]
    assert s.category == SetupCategory.VALID_NOT_GOOD and s.status == SetupStatus.REJECTED


def test_s_setup_upgrades_valid_not_good_and_enters_at_next_open():
    # 16:51 S = wick bigger than body; 18:25 enter directly after the candle closes; 29:30 upgrade.
    steps = BASE_UP + [-1] * 3 + [+1] + [0] * 6
    df = path(steps)
    o = df["close"].iloc[17]
    df.iloc[18, :4] = (o, o + 2.5, o, o + 0.5)  # top wick 2.0 > body 0.5
    df.iloc[19, :4] = (o + 0.6, o + 1.0, o + 0.4, o + 0.8)
    s = scan(df).setups[0]
    assert s.category == SetupCategory.VALID_NOT_GOOD and s.s_setup and s.entry_mode == "market"
    assert s.fill_index == 19 and s.fill_price == pytest.approx(o + 0.6)
    assert s.target - s.fill_price == pytest.approx(s.fill_price - s.stop)


def test_grandma_setup_is_the_post_bos_nowick():
    # 26:11 grandma: the no-wick came right after the break of structure, not in a retracement.
    s = scan(bull_setup_df(RALLY)).setups[0]
    assert s.category == SetupCategory.GRANDMA and not s.s_setup and s.entry_mode == "limit"


def test_s_setup_wick_fill_target_option():
    df = bull_setup_df(RALLY)
    df.iloc[14, :4] = (108.0, 125.0, 108.0, 109.0)  # huge top wick
    s = scan(df, s_setup_target="wick_fill").setups[0]
    assert s.s_setup and s.target == 125.0
