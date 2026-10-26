"""Backtester (next stage).

Planned design: replay clean MarketData bar by bar, call
``Strategy.evaluate(md.window(end=bar))`` (the same call the forward loop makes),
route signals through the same agents, and fill through
:class:`trading.paper_trading.PaperBroker`, so backtest and paper results are
produced by identical code.
"""
