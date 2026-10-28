"""Regime labels for failure analysis.

Every feature at bar i uses bars <= i only, so a label never leaks future
information. Labels describe market conditions for analysis; they are not
trading rules.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from trading.indicators import atr

SESSIONS = [  # New York local time
    ("asia", 18 * 60, 24 * 60), ("asia", 0, 2 * 60), ("london", 2 * 60, 8 * 60),
    ("ny_am", 8 * 60, 12 * 60), ("ny_pm", 12 * 60, 18 * 60),
]


def efficiency_ratio(close: pd.Series, length: int) -> pd.Series:
    """Kaufman efficiency ratio: 1 = straight line (trend), ~0 = noise (range)."""
    change = (close - close.shift(length)).abs()
    path = close.diff().abs().rolling(length, min_periods=length).sum()
    return change / path.replace(0, np.nan)


def trailing_rank(series: pd.Series, window: int) -> pd.Series:
    """Percentile of the current value within the trailing ``window`` values (past only)."""
    return series.rolling(window, min_periods=max(20, window // 5)).apply(
        lambda x: (x[:-1] < x[-1]).mean() if len(x) > 1 else np.nan, raw=True)


def regime_features(df: pd.DataFrame, er_length: int = 48, vol_window: int = 500) -> pd.DataFrame:
    er = efficiency_ratio(df["close"], er_length)
    natr = atr(df, 14) / df["close"]
    vol_rank = trailing_rank(natr, vol_window)
    local = df.index.tz_convert("America/New_York")
    minutes = local.hour * 60 + local.minute
    session = np.empty(len(df), dtype=object)
    for name, a, b in SESSIONS:
        session[(minutes >= a) & (minutes < b)] = name
    return pd.DataFrame({
        "er": er.to_numpy(),
        "trend_regime": pd.cut(er, [-np.inf, 0.2, 0.4, np.inf], labels=["range", "mixed", "trend"]).astype(object),
        "vol_rank": vol_rank.to_numpy(),
        "vol_regime": pd.cut(vol_rank, [-np.inf, 1 / 3, 2 / 3, np.inf], labels=["low", "mid", "high"]).astype(object),
        "session": session,
        "weekday": local.day_name(),
        "hour_ny": local.hour,
    }, index=df.index)
