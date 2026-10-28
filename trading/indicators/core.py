"""Indicator calculations on clean OHLCV frames.

Pure functions: they take Series/DataFrames and return Series/DataFrames aligned
to the input index, using only current and past bars (no look-ahead). Values
before the warm-up period are NaN rather than guessed.
"""

from __future__ import annotations

from typing import Any, Callable

import numpy as np
import pandas as pd

from trading.core.schemas import IndicatorState, MarketData


def sma(series: pd.Series, length: int) -> pd.Series:
    return series.rolling(length, min_periods=length).mean()


def ema(series: pd.Series, length: int) -> pd.Series:
    """EMA seeded with the SMA of the first ``length`` values (TradingView style)."""
    alpha = 2.0 / (length + 1)
    return _seeded_ewm(series, length, alpha)


def rma(series: pd.Series, length: int) -> pd.Series:
    """Wilder's moving average (used by RSI and ATR)."""
    return _seeded_ewm(series, length, 1.0 / length)


def _seeded_ewm(series: pd.Series, length: int, alpha: float) -> pd.Series:
    values = series.to_numpy(dtype="float64")
    out = np.full(len(values), np.nan)
    valid = np.flatnonzero(~np.isnan(values))
    if len(valid) < length:
        return pd.Series(out, index=series.index)
    start = valid[0]
    seed_end = start + length
    if np.isnan(values[start:seed_end]).any():
        return pd.Series(out, index=series.index)
    out[seed_end - 1] = values[start:seed_end].mean()
    for i in range(seed_end, len(values)):
        v = values[i]
        out[i] = out[i - 1] if np.isnan(v) else alpha * v + (1 - alpha) * out[i - 1]
    return pd.Series(out, index=series.index)


def true_range(df: pd.DataFrame) -> pd.Series:
    prev_close = df["close"].shift(1)
    ranges = pd.concat(
        [df["high"] - df["low"], (df["high"] - prev_close).abs(), (df["low"] - prev_close).abs()], axis=1
    )
    tr = ranges.max(axis=1)
    tr.iloc[0] = df["high"].iloc[0] - df["low"].iloc[0]
    return tr


def atr(df: pd.DataFrame, length: int = 14) -> pd.Series:
    return rma(true_range(df), length)


def rsi(series: pd.Series, length: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = rma(gain.iloc[1:], length).reindex(series.index)
    avg_loss = rma(loss.iloc[1:], length).reindex(series.index)
    rs = avg_gain / avg_loss
    out = 100 - 100 / (1 + rs)
    out[(avg_loss == 0) & (avg_gain > 0)] = 100.0
    out[(avg_loss == 0) & (avg_gain == 0)] = 50.0
    return out


def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    line = ema(series, fast) - ema(series, slow)
    sig = ema(line, signal)
    return pd.DataFrame({"macd": line, "signal": sig, "hist": line - sig})


def bollinger(series: pd.Series, length: int = 20, mult: float = 2.0) -> pd.DataFrame:
    mid = sma(series, length)
    sd = series.rolling(length, min_periods=length).std(ddof=0)
    return pd.DataFrame({"mid": mid, "upper": mid + mult * sd, "lower": mid - mult * sd})


def vwap(df: pd.DataFrame, reset: str = "D") -> pd.Series:
    """Volume-weighted average price of typical price, reset each calendar period
    in the frame's timezone. Bars with zero cumulative volume yield NaN."""
    typical = (df["high"] + df["low"] + df["close"]) / 3
    local = df.index.tz_localize(None) if df.index.tz is not None else df.index  # wall-clock periods
    key = local.to_period(reset) if reset else np.zeros(len(df))
    pv = (typical * df["volume"]).groupby(key).cumsum()
    vol = df["volume"].groupby(key).cumsum()
    return pv / vol.replace(0, np.nan)


def rolling_high(series: pd.Series, length: int) -> pd.Series:
    return series.rolling(length, min_periods=length).max()


def rolling_low(series: pd.Series, length: int) -> pd.Series:
    return series.rolling(length, min_periods=length).min()


# ------------------------------------------------------------------- registry

IndicatorFn = Callable[..., pd.Series | pd.DataFrame]

REGISTRY: dict[str, tuple[IndicatorFn, str]] = {
    # name: (function, input) where input is "close" (a series) or "frame"
    "sma": (sma, "close"),
    "ema": (ema, "close"),
    "rsi": (rsi, "close"),
    "macd": (macd, "close"),
    "bollinger": (bollinger, "close"),
    "atr": (atr, "frame"),
    "true_range": (true_range, "frame"),
    "vwap": (vwap, "frame"),
    "rolling_high": (lambda s, length: rolling_high(s, length), "high"),
    "rolling_low": (lambda s, length: rolling_low(s, length), "low"),
}


def compute(df: pd.DataFrame, specs: dict[str, dict[str, Any]]) -> pd.DataFrame:
    """Compute named indicators from specs like ``{"ema_20": {"kind": "ema", "length": 20}}``.

    Multi-column indicators are expanded as ``<name>_<column>``.
    """
    out = pd.DataFrame(index=df.index)
    for name, spec in specs.items():
        params = dict(spec)
        kind = params.pop("kind", name)
        if kind not in REGISTRY:
            raise ValueError(f"unknown indicator kind {kind!r}; known: {sorted(REGISTRY)}")
        fn, inp = REGISTRY[kind]
        source = params.pop("source", None)
        arg = df if inp == "frame" else df[source or inp]
        result = fn(arg, **params)
        if isinstance(result, pd.DataFrame):
            for col in result.columns:
                out[f"{name}_{col}"] = result[col]
        else:
            out[name] = result
    return out


def indicator_state(md: MarketData, specs: dict[str, dict[str, Any]], at: int = -1) -> IndicatorState:
    """Snapshot of indicator values at bar ``at`` (default: latest) for agents to read."""
    values = compute(md.frame, specs)
    row = values.iloc[at]
    ts = values.index[at]
    return IndicatorState(
        symbol=md.symbol,
        interval=md.interval,
        timestamp=ts.to_pydatetime(),
        values={k: (None if pd.isna(v) else float(v)) for k, v in row.items()},
    )
