import numpy as np
import pandas as pd
import pytest

from trading.core.schemas import AssetClass, MarketData
from trading.indicators import atr, bollinger, compute, ema, indicator_state, macd, rma, rsi, sma, true_range, vwap
from trading.tests.factories import daily, make_ohlcv


def s(values):
    return pd.Series(values, index=pd.date_range("2024-01-01", periods=len(values), freq="D", tz="UTC"),
                     dtype="float64")


def test_sma():
    out = sma(s([1, 2, 3, 4, 5]), 3)
    assert out.iloc[:2].isna().all()
    assert out.iloc[2:].tolist() == [2.0, 3.0, 4.0]


def test_ema_seeded_with_sma():
    out = ema(s(range(1, 11)), 3)  # alpha = 0.5
    assert out.iloc[:2].isna().all()
    assert out.iloc[2] == 2.0  # SMA seed of 1,2,3
    assert out.iloc[3] == pytest.approx(0.5 * 4 + 0.5 * 2)
    assert out.iloc[-1] == pytest.approx(9.0)  # linear input -> lags by (n-1)/2


def test_rma_matches_reference_loop():
    x = s(np.random.default_rng(1).normal(0, 1, 50).cumsum())
    n = 5
    ref = [np.nan] * (n - 1) + [x.iloc[:n].mean()]
    for v in x.iloc[n:]:
        ref.append(ref[-1] + (v - ref[-1]) / n)
    np.testing.assert_allclose(rma(x, n).to_numpy(), np.array(ref), equal_nan=True)


def test_rsi_extremes_and_reference():
    assert rsi(s(range(1, 30)), 14).iloc[-1] == 100.0
    assert rsi(s(range(30, 1, -1)), 14).iloc[-1] == pytest.approx(0.0)
    assert rsi(s([5.0] * 30), 14).iloc[-1] == 50.0
    # Wilder reference implementation
    x = s(np.random.default_rng(2).normal(0, 1, 60).cumsum() + 100)
    d = x.diff().iloc[1:]
    g, l = d.clip(lower=0).to_numpy(), (-d.clip(upper=0)).to_numpy()
    ag, al = g[:14].mean(), l[:14].mean()
    for i in range(14, len(g)):
        ag, al = (ag * 13 + g[i]) / 14, (al * 13 + l[i]) / 14
    assert rsi(x, 14).iloc[-1] == pytest.approx(100 - 100 / (1 + ag / al))
    assert rsi(x, 14).iloc[:14].isna().all()


def test_true_range_and_atr():
    idx = pd.date_range("2024-01-01", periods=4, freq="D", tz="UTC")
    df = pd.DataFrame({"open": [10, 11, 15, 14], "high": [11, 12, 16, 15], "low": [9, 10, 14, 12],
                       "close": [10.5, 11.5, 15.5, 13], "volume": 1.0}, index=idx)
    tr = true_range(df)
    assert tr.tolist() == [2.0, 2.0, 4.5, 3.5]  # gap up: high - prev close = 16 - 11.5
    a = atr(df, 2)
    assert np.isnan(a.iloc[0]) and a.iloc[1] == 2.0 and a.iloc[2] == pytest.approx(3.25)


def test_atr_constant_range():
    idx = pd.date_range("2024-01-01", periods=30, freq="D", tz="UTC")
    df = pd.DataFrame({"open": 100.0, "high": 101.0, "low": 99.0, "close": 100.0, "volume": 1.0}, index=idx)
    assert atr(df, 14).iloc[-1] == pytest.approx(2.0)


def test_bollinger_and_macd_shapes():
    flat = s([10.0] * 30)
    bb = bollinger(flat, 20)
    assert (bb["upper"].dropna() == 10).all() and (bb["lower"].dropna() == 10).all()
    m = macd(s(np.linspace(1, 50, 60)))
    assert list(m.columns) == ["macd", "signal", "hist"]
    assert m["macd"].iloc[-1] > 0
    np.testing.assert_allclose(m["hist"].dropna(), (m["macd"] - m["signal"]).dropna())


def test_vwap_resets_daily():
    idx = pd.DatetimeIndex(["2024-01-02 10:00", "2024-01-02 11:00", "2024-01-03 10:00"], tz="America/New_York")
    df = pd.DataFrame({"open": [1, 1, 1], "high": [12, 15, 30], "low": [9, 9, 24], "close": [9, 12, 27],
                       "volume": [100.0, 300.0, 50.0]}, index=idx)
    out = vwap(df)
    assert out.iloc[0] == pytest.approx(10.0)
    assert out.iloc[1] == pytest.approx((10 * 100 + 12 * 300) / 400)
    assert out.iloc[2] == pytest.approx(27.0)  # new day


def test_no_lookahead():
    df = daily(periods=120)
    specs = {"ema": {"kind": "ema", "length": 10}, "rsi": {"kind": "rsi", "length": 14},
             "atr": {"kind": "atr", "length": 14}, "bb": {"kind": "bollinger", "length": 20},
             "macd": {"kind": "macd"}, "vwap": {"kind": "vwap"}}
    full = compute(df, specs)
    for cut in (40, 77, 119):
        part = compute(df.iloc[:cut], specs)
        pd.testing.assert_frame_equal(part, full.iloc[:cut])


def test_compute_and_indicator_state():
    df = daily(periods=50)
    md = MarketData(symbol="SPY", interval="1d", timezone="America/New_York", asset_class=AssetClass.EQUITY, frame=df)
    specs = {"ema_20": {"kind": "ema", "length": 20}, "bb": {"kind": "bollinger", "length": 20},
             "hi": {"kind": "rolling_high", "length": 5}}
    out = compute(df, specs)
    assert {"ema_20", "bb_mid", "bb_upper", "bb_lower", "hi"} <= set(out.columns)
    st = indicator_state(md, specs)
    assert st.timestamp == df.index[-1]
    assert st.values["ema_20"] == pytest.approx(out["ema_20"].iloc[-1])
    first = indicator_state(md, specs, at=0)
    assert first.values["ema_20"] is None  # warm-up is None, not a guess
    with pytest.raises(ValueError):
        compute(df, {"x": {"kind": "nope"}})
