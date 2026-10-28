"""Agent interfaces for the decision chain:

SIGNAL AGENT -> RISK AGENT -> EXECUTION VALIDATOR -> CONSENSUS ENGINE -> PAPER BROKER

Agents receive structured numbers (Signal, IndicatorState, MarketData,
AccountState), never screenshots, and return an AgentDecision that is logged and
stored so every decision can be reproduced later.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from trading.core.schemas import AccountState, AgentDecision, IndicatorState, MarketData, Signal


class Agent(ABC):
    name: str = "agent"

    @abstractmethod
    def review(self, signal: Signal, md: MarketData, account: AccountState,
               indicators: IndicatorState | None = None) -> AgentDecision: ...


class SignalAgent(Agent):
    """Second opinion on a strategy signal (rule-based or LLM-backed). Not implemented yet."""

    name = "signal_agent"
