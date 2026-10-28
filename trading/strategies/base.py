"""Strategy interface. No strategy is implemented or selected at this stage.

A strategy turns a window of clean market data into zero or more
:class:`~trading.core.schemas.Signal` objects. The backtester and the forward
paper-trading loop call exactly the same method with the same inputs, so a
strategy cannot tell (and must not care) which one is running it.

Rules every strategy must follow:

* Only read ``md.frame`` up to and including the last row (the window already
  ends at the evaluation bar; there is no future data in it).
* Read numbers (OHLCV + indicator columns), never chart images.
* Ignore or explicitly handle bars with ``flag_*`` columns set, especially
  ``flag_roll_suspect`` on futures.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import pandas as pd

from trading.core.schemas import MarketData, Signal, StrategyDefinition
from trading.indicators import compute


class Strategy(ABC):
    def __init__(self, definition: StrategyDefinition) -> None:
        self.definition = definition

    @property
    def name(self) -> str:
        return self.definition.name

    def indicators(self, md: MarketData) -> pd.DataFrame:
        return compute(md.frame, self.definition.indicators)

    @abstractmethod
    def evaluate(self, md: MarketData) -> list[Signal]:
        """Return signals for the last bar of ``md``."""


_REGISTRY: dict[str, type[Strategy]] = {}


def register(name: str):
    def deco(cls: type[Strategy]) -> type[Strategy]:
        if name in _REGISTRY:
            raise ValueError(f"strategy {name!r} already registered")
        _REGISTRY[name] = cls
        return cls

    return deco


def get_strategy(definition: StrategyDefinition) -> Strategy:
    try:
        return _REGISTRY[definition.name](definition)
    except KeyError as exc:
        raise LookupError(f"no strategy registered as {definition.name!r} (registered: {sorted(_REGISTRY)})") from exc


def registered() -> list[str]:
    return sorted(_REGISTRY)
