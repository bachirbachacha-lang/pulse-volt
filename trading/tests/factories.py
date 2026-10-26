"""Synthetic, yfinance-shaped OHLCV frames for tests. Never used as market data."""

from __future__ import annotations

import numpy as np
import pandas as pd

from trading.data.instruments import Session


def make_ohlcv(index: pd.DatetimeIndex, start_price: float = 100.0, vol: float = 0.001,
               seed: int = 7, yf_columns: bool = False) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rets = rng.normal(0, vol, len(index))
    close = start_price * np.exp(np.cumsum(rets))
    open_ = np.concatenate([[start_price], close[:-1]])
    spread = np.abs(rng.normal(0, vol, len(index))) * close
    high = np.maximum(open_, close) + spread
    low = np.minimum(open_, close) - spread
    volume = rng.integers(1_000, 10_000, len(index)).astype(float)
    df = pd.DataFrame({"open": open_, "high": high, "low": low, "close": close, "volume": volume}, index=index)
    df.index.name = "timestamp"
    if yf_columns:
        df.columns = ["Open", "High", "Low", "Close", "Volume"]
        df.index.name = "Datetime"
    return df


def session_index(session: Session, start: str, end: str, freq: str) -> pd.DatetimeIndex:
    """Every bar start inside ``session`` between two dates (bars aligned to session open)."""
    first = pd.Timestamp(start, tz=session.timezone)
    last = pd.Timestamp(end, tz=session.timezone)
    stamps: list[pd.Timestamp] = []
    for s, e in session.sessions_between(first, last):
        if s < first or s > last:
            continue
        stamps.extend(pd.date_range(s, e - pd.Timedelta(seconds=1), freq=freq))
    return pd.DatetimeIndex(stamps)


def equity_hourly(session: Session, start: str = "2024-03-04", end: str = "2024-03-15", **kw) -> pd.DataFrame:
    return make_ohlcv(session_index(session, start, end, "1h"), **kw)


def daily(start: str = "2024-01-02", periods: int = 120, tz: str = "America/New_York", **kw) -> pd.DataFrame:
    idx = pd.bdate_range(start, periods=periods, tz=tz)
    return make_ohlcv(idx, vol=0.01, **kw)
