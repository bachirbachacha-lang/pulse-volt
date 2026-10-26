"""Strategy interface and registry (no strategies yet)."""

from trading.strategies.base import Strategy, get_strategy, register, registered

__all__ = ["Strategy", "get_strategy", "register", "registered"]
