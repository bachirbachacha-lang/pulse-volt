import numpy as np
import pandas as pd
import pytest

from trading.core.schemas import DataQualityStatus, IssueScope, Severity
from trading.data.instruments import estimated_roll_dates, session_for
from trading.data.validation import FLAG_COLUMNS, DataValidator
from trading.tests.factories import daily, equity_hourly, make_ohlcv, session_index


@pytest.fixture
def v(settings):
    return DataValidator(settings)


@pytest.fixture
def spy_1h(settings):
    return equity_hourly(session_for("SPY", settings))


@pytest.fixture
def es_1h(settings):
    # 2024-02-18 .. 2024-03-29 spans the March 2024 ES roll (est. 2024-03-07) and a DST change.
    idx = session_index(session_for("ES=F", settings), "2024-02-18", "2024-03-29", "1h")
    return make_ohlcv(idx, start_price=5000.0, vol=0.0008, seed=3)


def run(v, df, symbol="SPY", interval="1h", **kw):
    return v.validate(df, v.context_for(symbol, interval, **kw))


def test_clean_data_passes(v, spy_1h):
    clean, report = run(v, spy_1h)
    assert report.status == DataQualityStatus.OK
    assert report.rows_in == report.rows_out == len(spy_1h)
    assert set(FLAG_COLUMNS) <= set(clean.columns)
    assert not clean["flag_any"].any()


def test_empty_and_missing_columns_fail(v, spy_1h):
    _, r = run(v, spy_1h.iloc[0:0])
    assert r.status == DataQualityStatus.FAILED
    _, r = run(v, spy_1h.drop(columns="close"))
    assert r.status == DataQualityStatus.FAILED and "MISSING_COLUMNS" in r.codes()


def test_duplicates_removed(v, spy_1h):
    df = pd.concat([spy_1h, spy_1h.iloc[[5, 6]]])
    clean, r = run(v, df)
    assert r.issue("DUPLICATE_TIMESTAMPS").count == 2
    assert clean.index.is_unique and len(clean) == len(spy_1h)
    assert r.status == DataQualityStatus.WARNING


def test_non_monotonic_sorted(v, spy_1h):
    df = spy_1h.iloc[::-1]
    clean, r = run(v, df)
    assert "NON_MONOTONIC" in r.codes()
    assert clean.index.is_monotonic_increasing


def test_naive_timezone_flagged_and_converted(v, spy_1h, settings):
    df = spy_1h.copy()
    df.index = df.index.tz_convert("UTC").tz_localize(None)
    clean, r = run(v, df)
    assert "TIMEZONE_NAIVE" in r.codes() and r.status == DataQualityStatus.WARNING
    assert str(clean.index.tz) == settings.market_data.timezone


def test_timezone_conversion(v, spy_1h):
    df = spy_1h.tz_convert("Asia/Tokyo")
    clean, r = run(v, df, timezone_name="UTC")
    assert str(clean.index.tz) == "UTC"
    assert r.status == DataQualityStatus.OK  # same instants, different zone


def test_nan_rows_dropped(v, spy_1h):
    df = spy_1h.copy()
    df.iloc[10, df.columns.get_loc("close")] = np.nan
    df.iloc[11, df.columns.get_loc("volume")] = np.nan
    clean, r = run(v, df)
    assert r.issue("NAN_VALUES").count == 1
    assert r.issue("NAN_VOLUME").severity == Severity.INFO
    assert clean[["open", "high", "low", "close", "volume"]].notna().all().all()


def test_zero_negative_infinite_prices_dropped(v, spy_1h):
    df = spy_1h.copy()
    df.iloc[3, df.columns.get_loc("low")] = 0.0
    df.iloc[4, df.columns.get_loc("open")] = -1.0
    df.iloc[5, df.columns.get_loc("high")] = np.inf
    clean, r = run(v, df)
    assert r.issue("INVALID_PRICE").count == 3
    assert (clean[["open", "high", "low", "close"]] > 0).all().all()


def test_invalid_ohlc_dropped(v, spy_1h):
    df = spy_1h.copy()
    i = df.index[7]
    df.loc[i, "high"] = df.loc[i, ["open", "close"]].min() - 0.5  # high below body
    clean, r = run(v, df)
    assert r.issue("INVALID_OHLC").count == 1
    assert i not in clean.index


def test_missing_candles_reported_and_flagged(v, spy_1h):
    df = spy_1h.drop(spy_1h.index[[8, 9, 10]])
    clean, r = run(v, df)
    issue = r.issue("MISSING_CANDLES")
    assert issue.count == 3 and issue.scope == IssueScope.BARS
    assert issue.severity == Severity.WARNING  # 3/70 > 2%
    assert clean.loc[spy_1h.index[11], "flag_after_missing"]


def test_few_missing_candles_are_info(v, settings):
    df = equity_hourly(session_for("SPY", settings), start="2024-01-02", end="2024-03-29")
    clean, r = run(v, df.drop(df.index[50]))
    assert r.issue("MISSING_CANDLES").severity == Severity.INFO


def test_whole_missing_session_is_info(v, spy_1h):
    day = spy_1h.index[spy_1h.index.normalize() == spy_1h.index[20].normalize()]
    _, r = run(v, spy_1h.drop(day))
    assert r.issue("MISSING_SESSIONS").count == 1
    assert "MISSING_CANDLES" not in r.codes()


def test_out_of_session_bars_flagged(v, spy_1h):
    extra = spy_1h.iloc[[0]].copy()
    extra.index = [spy_1h.index[0] - pd.Timedelta(hours=3)]  # 06:30 ET
    clean, r = run(v, pd.concat([extra, spy_1h]))
    assert r.issue("OUT_OF_SESSION").count == 1
    assert clean["flag_out_of_session"].sum() == 1


def test_out_of_session_info_when_prepost_requested(v, spy_1h):
    extra = spy_1h.iloc[[0]].copy()
    extra.index = [spy_1h.index[0] - pd.Timedelta(hours=3)]
    _, r = run(v, pd.concat([extra, spy_1h]), prepost=True)
    assert r.issue("OUT_OF_SESSION").severity == Severity.INFO


def test_wrong_interval_fails(v, settings):
    df = make_ohlcv(session_index(session_for("SPY", settings), "2024-03-04", "2024-03-15", "30min"))
    _, r = run(v, df, interval="1h")
    assert "INTERVAL_MISMATCH" in r.codes() and r.status == DataQualityStatus.FAILED


def test_unexpected_interval_change_flagged(v, spy_1h):
    extra = spy_1h.iloc[[12]].copy()
    extra.index = [spy_1h.index[12] + pd.Timedelta(minutes=30)]
    _, r = run(v, pd.concat([spy_1h, extra]))
    assert "UNEXPECTED_INTERVAL" in r.codes()


def test_suspicious_move_flagged(v, spy_1h):
    df = spy_1h.copy()
    i = 40
    for c in ("open", "high", "low", "close"):
        df.iloc[i:, df.columns.get_loc(c)] *= 1.08  # 8% jump on a ~0.1%-vol series
    df.iloc[i, df.columns.get_loc("open")] = df.iloc[i - 1]["close"]
    df.iloc[i, df.columns.get_loc("low")] = min(df.iloc[i]["low"], df.iloc[i]["open"])
    clean, r = run(v, df)
    assert "SUSPICIOUS_MOVE" in r.codes()
    assert clean["flag_suspicious_move"].iloc[i]


def test_stale_data(v, spy_1h):
    now = pd.Timestamp("2024-03-20 12:00", tz="America/New_York")  # market open, data ended 03-15
    _, r = run(v, spy_1h, check_staleness=True, now=now.to_pydatetime())
    assert "STALE_DATA" in r.codes()
    fresh_now = spy_1h.index[-1] + pd.Timedelta(hours=1, minutes=5)
    _, r = run(v, spy_1h, check_staleness=True, now=fresh_now.to_pydatetime())
    assert "STALE_DATA" not in r.codes()


def test_stale_not_reported_when_market_closed(v, spy_1h):
    saturday = pd.Timestamp("2024-03-16 12:00", tz="America/New_York")
    _, r = run(v, spy_1h, check_staleness=True, now=saturday.to_pydatetime())
    assert "STALE_DATA" not in r.codes()


def test_daily_holiday_vs_long_gap(v):
    df = daily(periods=60)
    _, r = run(v, df.drop(df.index[10]), interval="1d")
    assert r.issue("MISSING_CANDLES").severity == Severity.INFO
    _, r = run(v, df.drop(df.index[10:20]), interval="1d")
    assert r.issue("MISSING_CANDLES").severity == Severity.WARNING


# ------------------------------------------------------------------ futures


def test_estimated_roll_dates_es():
    rolls = estimated_roll_dates("ES=F", pd.Timestamp("2024-01-01"), pd.Timestamp("2024-12-31"))
    assert pd.Timestamp("2024-03-07").date() in rolls  # 3rd Fri 2024-03-15 minus 8 days
    assert pd.Timestamp("2024-06-13").date() in rolls


def test_clean_futures_is_ok_but_noted_as_continuous(v, es_1h):
    clean, r = run(v, es_1h, symbol="ES=F")
    assert r.status == DataQualityStatus.OK
    assert r.issue("CONTINUOUS_CONTRACT").severity == Severity.INFO
    assert clean["flag_roll_window"].any()  # bars near 2024-03-07 are marked...
    assert not clean["flag_any"].any()  # ...but that alone does not block anything


def _inject_gap(df, ts, pct):
    pos = df.index.get_loc(ts)
    out = df.copy()
    for c in ("open", "high", "low", "close"):
        out.iloc[pos:, out.columns.get_loc(c)] *= 1 + pct
    return out


def test_roll_gap_is_flagged_not_signal(v, es_1h):
    ts = es_1h.index[(es_1h.index >= pd.Timestamp("2024-03-07 10:00", tz="America/New_York"))][0]
    df = _inject_gap(es_1h, ts, 0.012)
    clean, r = run(v, df, symbol="ES=F")
    assert "POSSIBLE_ROLL" in r.codes()
    assert r.status == DataQualityStatus.WARNING
    assert clean.loc[ts, "flag_roll_suspect"] and clean.loc[ts, "flag_any"]


def test_unexplained_gap_outside_roll_window(v, es_1h):
    ts = es_1h.index[(es_1h.index >= pd.Timestamp("2024-02-22 11:00", tz="America/New_York"))][0]
    clean, r = run(v, _inject_gap(es_1h, ts, -0.01), symbol="ES=F")
    assert "LARGE_UNEXPLAINED_GAP" in r.codes()
    assert clean.loc[ts, "flag_large_gap"] and not clean.loc[ts, "flag_roll_suspect"]


def test_gap_across_session_break_is_info(v, es_1h):
    # First bar of the Sunday 2024-02-25 18:00 session, after the weekend.
    ts = pd.Timestamp("2024-02-25 18:00", tz="America/New_York")
    clean, r = run(v, _inject_gap(es_1h, ts, 0.006), symbol="ES=F")
    assert r.issue("SESSION_BREAK_GAP").severity == Severity.INFO
    assert "LARGE_UNEXPLAINED_GAP" not in r.codes()
    assert clean.loc[ts, "flag_large_gap"]


def test_futures_maintenance_break_bar_is_out_of_session(v, es_1h):
    extra = es_1h.iloc[[30]].copy()
    extra.index = [pd.Timestamp("2024-02-21 17:00", tz="America/New_York")]
    clean, r = run(v, pd.concat([es_1h, extra]), symbol="ES=F")
    assert "OUT_OF_SESSION" in r.codes()
