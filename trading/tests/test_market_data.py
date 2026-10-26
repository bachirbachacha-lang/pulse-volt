"""Market-data loading: yfinance adapter, normalisation, caching and the pipeline.

yfinance is replaced by a fake with the same call signature and output shape,
so these tests run offline and deterministically.
"""

import numpy as np
import pandas as pd
import pytest

from trading.core.schemas import AssetClass, DataQualityStatus
from trading.data.cache import DataStore
from trading.data.instruments import classify_symbol, interval_delta, session_for
from trading.data.pipeline import MarketDataPipeline
from trading.data.sources import DataRequest, DataSourceError, YFinanceSource, normalize_ohlcv
from trading.tests.conftest import FakeHistory
from trading.tests.factories import daily, equity_hourly, make_ohlcv


def test_classify_symbols():
    assert classify_symbol("ES=F") == AssetClass.FUTURES
    assert classify_symbol("EURUSD=X") == AssetClass.FOREX
    assert classify_symbol("BTC-USD") == AssetClass.CRYPTO
    assert classify_symbol("SPY") == AssetClass.EQUITY
    assert classify_symbol("^GSPC") == AssetClass.EQUITY


def test_unknown_interval_rejected():
    with pytest.raises(ValueError):
        interval_delta("7m")
    with pytest.raises(ValueError):
        DataRequest(symbol="SPY", interval="7m", period="5d")


def test_request_needs_period_xor_dates():
    with pytest.raises(ValueError):
        DataRequest(symbol="SPY")
    with pytest.raises(ValueError):
        DataRequest(symbol="SPY", period="5d", start="2024-01-01")
    a = DataRequest(symbol="SPY", interval="1h", period="5d")
    b = DataRequest(symbol="SPY", interval="1h", period="5d")
    c = DataRequest(symbol="SPY", interval="1h", period="1mo")
    assert a.key() == b.key() != c.key()


def test_normalize_yfinance_ticker_history_shape():
    df = make_ohlcv(pd.date_range("2024-01-02", periods=5, freq="D", tz="America/New_York"), yf_columns=True)
    df["Dividends"] = 0.0
    out = normalize_ohlcv(df)
    assert list(out.columns) == ["open", "high", "low", "close", "volume"]
    assert out.index.name == "timestamp"
    assert out.dtypes.eq("float64").all()


def test_normalize_yf_download_multiindex_shape():
    base = make_ohlcv(pd.date_range("2024-01-02", periods=5, freq="D", tz="UTC"), yf_columns=True)
    base["Adj Close"] = base["Close"] * 0.99
    multi = pd.concat({"SPY": base, "QQQ": base * 2}, axis=1).swaplevel(axis=1)  # (Price, Ticker)
    out = normalize_ohlcv(multi, "QQQ")
    assert np.allclose(out["close"], base["Close"] * 2)
    assert "adj_close" in out.columns


def test_normalize_missing_column_raises():
    df = make_ohlcv(pd.date_range("2024-01-02", periods=3, freq="D", tz="UTC")).drop(columns="volume")
    with pytest.raises(DataSourceError):
        normalize_ohlcv(df)


def test_yfinance_source_passes_safe_arguments():
    fake = FakeHistory(make_ohlcv(pd.date_range("2024-01-02", periods=5, freq="D", tz="UTC"), yf_columns=True))
    src = YFinanceSource(history_fn=fake)
    src.fetch(DataRequest(symbol="ES=F", interval="1d", start="2024-01-01", end="2024-02-01"))
    symbol, kwargs = fake.calls[0]
    assert symbol == "ES=F"
    assert kwargs["repair"] is False and kwargs["keepna"] is True and kwargs["auto_adjust"] is False
    assert kwargs["start"] == "2024-01-01" and "period" not in kwargs


def test_yfinance_source_errors_are_wrapped():
    def boom(symbol, **kw):
        raise ConnectionError("network down")

    with pytest.raises(DataSourceError):
        YFinanceSource(history_fn=boom).fetch(DataRequest(symbol="SPY", period="5d"))
    with pytest.raises(DataSourceError):
        YFinanceSource(history_fn=lambda s, **k: pd.DataFrame()).fetch(DataRequest(symbol="SPY", period="5d"))


def test_pipeline_loads_validates_and_caches(settings):
    raw = equity_hourly(session_for("SPY", settings), yf_columns=True)
    fake = FakeHistory(raw)
    pipe = MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=fake))
    md = pipe.load("SPY", interval="1h", start="2024-03-04", end="2024-03-16")
    assert md.is_clean and md.report.status == DataQualityStatus.OK
    assert str(md.frame.index.tz) == settings.market_data.timezone
    assert "flag_any" in md.frame.columns
    # Historical request: second load is served from disk, no new download.
    md2 = pipe.load("SPY", interval="1h", start="2024-03-04", end="2024-03-16")
    assert len(fake.calls) == 1
    pd.testing.assert_frame_equal(md.frame, md2.frame)
    # Raw and clean copies are both on disk.
    req = pipe.request("SPY", interval="1h", start="2024-03-04", end="2024-03-16")
    assert pipe.store.raw_path(req).exists() and pipe.store.clean_path(req).exists()


def test_pipeline_force_redownloads(settings):
    fake = FakeHistory(daily(yf_columns=True))
    pipe = MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=fake))
    pipe.load("SPY", interval="1d", start="2024-01-02", end="2024-06-01")
    pipe.load("SPY", interval="1d", start="2024-01-02", end="2024-06-01", force=True)
    assert len(fake.calls) == 2


def test_open_ended_request_expires(settings):
    fake = FakeHistory(daily(yf_columns=True))
    pipe = MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=fake))
    req = pipe.request("SPY", interval="1d", period="6mo")
    pipe.fetch_raw(req)
    assert pipe.store.is_fresh(req)
    later = pd.Timestamp.now(tz="UTC") + pd.Timedelta(days=2)
    assert not pipe.store.is_fresh(req, now=later.to_pydatetime())


def test_cache_disabled(settings):
    s = settings.model_copy(update={"market_data": settings.market_data.model_copy(update={"cache_enabled": False})})
    fake = FakeHistory(daily(yf_columns=True))
    pipe = MarketDataPipeline.from_settings(s, source=YFinanceSource(history_fn=fake))
    for _ in range(2):
        pipe.load("SPY", interval="1d", start="2024-01-02", end="2024-06-01")
    assert len(fake.calls) == 2


def test_corrupt_cache_file_is_a_miss(settings):
    store = DataStore(settings.raw_dir, settings.clean_dir, settings.cache_dir)
    req = DataRequest(symbol="SPY", interval="1d", start="2024-01-02", end="2024-06-01")
    store.save_raw(req, daily(), "test")
    store.raw_path(req).write_bytes(b"not a pickle")
    assert store.load_raw(req) is None


def test_pipeline_uses_default_interval_and_period(settings):
    fake = FakeHistory(daily(yf_columns=True))
    pipe = MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=fake))
    req = pipe.request("SPY")
    assert req.interval == settings.market_data.default_interval
    assert req.period == settings.market_data.default_period
