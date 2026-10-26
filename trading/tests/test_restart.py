"""Restart behaviour: a new process must pick up exactly where the last one stopped,
and must not re-download data it already has."""

from datetime import datetime, timedelta, timezone

import pytest

from trading.core.schemas import Candle, PaperOrder, PositionSide, Side
from trading.data.instruments import session_for
from trading.data.pipeline import MarketDataPipeline
from trading.data.sources import YFinanceSource
from trading.database import Database
from trading.paper_trading import PaperBroker
from trading.tests.conftest import FakeHistory
from trading.tests.factories import equity_hourly

T0 = datetime(2024, 3, 4, 15, tzinfo=timezone.utc)


def bar(i, price):
    return Candle(timestamp=T0 + timedelta(hours=i), open=price, high=price + 1, low=price - 1, close=price,
                  volume=1)


def test_broker_state_survives_restart(settings):
    with Database(settings.database_path) as db:
        b = PaperBroker(settings, db, require_consensus=False)
        b.submit(PaperOrder(symbol="ES=F", side=Side.BUY, quantity=2, stop_loss=4900, take_profit=5200))
        b.on_bar("ES=F", bar(1, 5000))
        b.submit(PaperOrder(symbol="ES=F", side=Side.SELL, quantity=1))
        b.on_bar("ES=F", bar(2, 5010))
        b.submit(PaperOrder(symbol="SPY", side=Side.BUY, quantity=5))  # still pending at "crash"
        before = b.account_state()

    with Database(settings.database_path) as db:
        b2 = PaperBroker(settings, db, require_consensus=False)
        after = b2.account_state()
        assert after.cash == pytest.approx(before.cash)
        assert after.realized_pnl == pytest.approx(before.realized_pnl)
        assert after.trade_count == before.trade_count == 1
        pos = b2.position("ES=F")
        assert pos.side == PositionSide.LONG and pos.quantity == 1
        assert pos.stop_loss == 4900 and pos.take_profit == 5200
        assert len(b2.pending) == 1
        # Continues trading normally; stale bars are refused.
        with pytest.raises(Exception):
            b2.on_bar("ES=F", bar(1, 5000))
        b2.on_bar("ES=F", bar(3, 5205))  # hits take-profit
        assert b2.position("ES=F").side == PositionSide.FLAT
        assert len(db.trades()) == 2


def test_fresh_database_starts_at_configured_balance(settings):
    with Database(settings.database_path) as db:
        b = PaperBroker(settings, db, require_consensus=False)
        assert b.account_state().cash == settings.account.starting_balance
        assert b.positions == {} and b.pending == {}


def test_cached_data_reused_after_restart(settings):
    raw = equity_hourly(session_for("SPY", settings), yf_columns=True)
    fake = FakeHistory(raw)
    p1 = MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=fake))
    md1 = p1.load("SPY", interval="1h", start="2024-03-04", end="2024-03-16")
    # "Restart": brand-new pipeline objects, same disk.
    p2 = MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=fake))
    md2 = p2.load("SPY", interval="1h", start="2024-03-04", end="2024-03-16")
    assert len(fake.calls) == 1
    assert md1.report.status == md2.report.status
    assert md1.frame.equals(md2.frame)
