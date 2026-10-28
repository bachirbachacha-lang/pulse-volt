from __future__ import annotations

import pytest

from trading.config.settings import load_settings
from trading.core.log import setup_logging


@pytest.fixture
def settings(tmp_path):
    """Settings with every writable path redirected into a temp directory."""
    s = load_settings(
        environ={},
        root=tmp_path,
        # Most tests size real futures contracts, which needs more than the $1,000 default.
        overrides={"logging": {"console": False}, "costs": {"slippage_bps": 0.0, "commission_per_order": 0.0},
                   "account": {"starting_balance": 100000.0}},
    )
    setup_logging(s, force=True)
    return s


class FakeHistory:
    """Stands in for yfinance.Ticker(...).history and counts calls."""

    def __init__(self, frame):
        self.frame = frame
        self.calls: list[tuple[str, dict]] = []

    def __call__(self, symbol, **kwargs):
        self.calls.append((symbol, kwargs))
        return self.frame.copy()
