"""PAPER / SIMULATION trading: simulated broker and forward engine. No live-broker code exists."""

from trading.paper_trading.engine import PaperBroker, PaperTradingError

__all__ = ["PaperBroker", "PaperTradingError"]
