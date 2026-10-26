"""Risk agent interface. Position sizing / limits are implemented with the strategy stage.

The configured limits live in ``[risk]`` in ``config/settings.toml``.
"""

from __future__ import annotations

from abc import abstractmethod

from trading.agents.base import Agent
from trading.config.settings import RiskSettings
from trading.core.schemas import AccountState, IndicatorState, MarketData, RiskDecision, Signal


class RiskAgent(Agent):
    name = "risk_agent"

    def __init__(self, limits: RiskSettings) -> None:
        self.limits = limits

    @abstractmethod
    def review(self, signal: Signal, md: MarketData, account: AccountState,
               indicators: IndicatorState | None = None) -> RiskDecision: ...
