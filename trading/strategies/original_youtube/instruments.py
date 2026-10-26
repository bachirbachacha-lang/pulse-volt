"""Instrument facts the strategy needs: pip/tick size and price precision.

The video gives forex rules in pips and futures rules in ticks. These are
standard contract specifications, not strategy choices.
"""

from __future__ import annotations

from dataclasses import dataclass

# Markets named in the video (1:48:08-1:57:40), as yfinance symbols.
FOREX_BEST = ["CADJPY=X", "USDCHF=X", "USDJPY=X", "AUDUSD=X", "AUDCAD=X"]
FOREX_SECONDARY = ["USDCAD=X", "AUDJPY=X", "GBPJPY=X", "EURUSD=X", "GBPUSD=X"]
FUTURES = ["ES=F", "MES=F", "NQ=F", "MNQ=F", "CL=F"]

_FUTURES_TICK = {"ES": 0.25, "MES": 0.25, "NQ": 0.25, "MNQ": 0.25, "CL": 0.01, "MCL": 0.01,
                 "YM": 1.0, "MYM": 1.0, "RTY": 0.1, "M2K": 0.1, "GC": 0.1, "MGC": 0.1}


@dataclass(frozen=True)
class InstrumentSpec:
    symbol: str
    kind: str  # "forex" | "futures" | "other"
    unit: float  # 1 pip (forex) or 1 tick (futures): the unit the video's rules are written in
    precision: float  # smallest quoted price step (forex pipette = pip / 10)

    def units(self, price_distance: float) -> float:
        return price_distance / self.unit


def instrument_spec(symbol: str) -> InstrumentSpec:
    s = symbol.upper()
    if s.endswith("=X"):
        pip = 0.01 if "JPY" in s else 0.0001
        return InstrumentSpec(symbol, "forex", pip, pip / 10)
    if s.endswith("=F"):
        root = s[:-2]
        tick = _FUTURES_TICK.get(root)
        if tick is None:
            raise ValueError(f"no tick size known for {symbol}; add it to _FUTURES_TICK")
        return InstrumentSpec(symbol, "futures", tick, tick)
    return InstrumentSpec(symbol, "other", 0.01, 0.01)
