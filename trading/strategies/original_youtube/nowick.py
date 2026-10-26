"""No-wick candle detection (video 1, 1:11:20 "No Wick Candles").

* Bullish no-wick: a bullish candle with no bottom wick (flat bottom: open == low).
* Bearish no-wick: a bearish candle with no top wick (flat top: open == high).

The creator's TradingView indicator is "100% accurate" when zoomed in, i.e.
the equality is exact at the broker's price precision. Floating-point prices
from yfinance are compared with a tolerance of half the instrument's smallest
price step, which is the same as exact equality at quoted precision.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def nowick_flags(df: pd.DataFrame, precision: float) -> pd.DataFrame:
    tol = precision / 2
    o, h, lo, c = (df[k] for k in ("open", "high", "low", "close"))
    bullish = (c > o + tol) & ((o - lo).abs() <= tol)
    bearish = (c < o - tol) & ((h - o).abs() <= tol)
    return pd.DataFrame({"nowick_bull": bullish.to_numpy(bool), "nowick_bear": bearish.to_numpy(bool)},
                        index=df.index)


def nowick_share(df: pd.DataFrame, precision: float) -> float:
    """Fraction of candles that are no-wick candles (the video says roughly 6%)."""
    f = nowick_flags(df, precision)
    return float(np.mean(f["nowick_bull"] | f["nowick_bear"])) if len(f) else 0.0
