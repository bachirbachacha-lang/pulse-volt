"""Strategy interface, registry and the registered strategies."""

from trading.strategies.base import Strategy, get_strategy, register, registered

# Importing the package registers the strategies it contains.
from trading.strategies import original_youtube  # noqa: E402,F401

__all__ = ["Strategy", "get_strategy", "register", "registered"]
