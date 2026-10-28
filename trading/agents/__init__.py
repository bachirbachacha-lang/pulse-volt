"""Three-agent decision system (paper trading only).

AGENT 1 signal analyst -> AGENT 2 risk manager -> AGENT 3 execution validator
-> consensus controller -> paper broker. See ``controller.py``.
"""

from trading.agents.base import Agent, SignalAgent
from trading.agents.consensus import ConsensusEngine

__all__ = ["Agent", "ConsensusEngine", "SignalAgent"]
