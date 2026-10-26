from datetime import datetime, timedelta, timezone

import pytest

from trading.core.schemas import Candle, ExitReason, OrderStatus, PaperOrder, PositionSide, Side
from trading.database import Database
from trading.paper_trading import PaperBroker, PaperTradingError

T0 = datetime(2024, 3, 4, 15, tzinfo=timezone.utc)


def bar(i, o, h, l, c):
    return Candle(timestamp=T0 + timedelta(hours=i), open=o, high=h, low=l, close=c, volume=100)


@pytest.fixture
def broker(settings):
    return PaperBroker(settings)


def test_market_order_fills_at_next_open(broker):
    broker.submit(PaperOrder(symbol="SPY", side=Side.BUY, quantity=10))
    assert broker.position("SPY").quantity == 0  # nothing until the next bar
    fills = broker.on_bar("SPY", bar(1, 100, 101, 99, 100.5))
    assert fills[0].price == 100 and broker.position("SPY").side == PositionSide.LONG
    assert broker.account_state().unrealized_pnl == pytest.approx(5.0)


def test_round_trip_pnl_with_costs(settings):
    s = settings.model_copy(update={"costs": settings.costs.model_copy(
        update={"commission_per_order": 2.0, "slippage_bps": 10.0})})
    b = PaperBroker(s)
    b.submit(PaperOrder(symbol="ES=F", side=Side.BUY, quantity=1))
    f1 = b.on_bar("ES=F", bar(1, 5000, 5005, 4995, 5002))[0]
    assert f1.price == pytest.approx(5005.0)  # 10 bps adverse
    b.submit(PaperOrder(symbol="ES=F", side=Side.SELL, quantity=1))
    f2 = b.on_bar("ES=F", bar(2, 5010, 5012, 5008, 5011))[0]
    assert f2.price == pytest.approx(5010 * 0.999)
    gross = (f2.price - f1.price) * 50
    a = b.account_state()
    assert a.realized_pnl == pytest.approx(gross)
    assert a.cash == pytest.approx(s.account.starting_balance + gross - 4.0)
    assert a.open_positions == 0 and a.trade_count == 1


def test_stop_loss_and_pessimistic_same_bar(broker):
    broker.submit(PaperOrder(symbol="SPY", side=Side.BUY, quantity=1, stop_loss=95, take_profit=110))
    broker.on_bar("SPY", bar(1, 100, 101, 99, 100))
    fills = broker.on_bar("SPY", bar(2, 100, 111, 94, 105))  # touches both
    assert fills[0].price == 95
    assert broker.trade_count == 1 and broker.position("SPY").side == PositionSide.FLAT


def test_gap_through_stop_fills_at_open(broker):
    broker.submit(PaperOrder(symbol="SPY", side=Side.SELL, quantity=1, stop_loss=105, take_profit=90))
    broker.on_bar("SPY", bar(1, 100, 101, 99, 100))
    fills = broker.on_bar("SPY", bar(2, 108, 109, 107, 108))
    assert fills[0].price == 108  # worse than the stop: gap
    assert broker.realized_pnl == pytest.approx(-8)


def test_take_profit(settings):
    db = Database(":memory:")
    b = PaperBroker(settings, db)
    b.submit(PaperOrder(symbol="SPY", side=Side.BUY, quantity=2, stop_loss=95, take_profit=104))
    b.on_bar("SPY", bar(1, 100, 101, 99, 100))
    b.on_bar("SPY", bar(2, 101, 105, 100, 104.5))
    trades = db.trades()
    assert len(trades) == 1 and trades[0].exit_reason == ExitReason.TARGET
    assert trades[0].net_pnl == pytest.approx(8.0)


def test_partial_close_and_reversal(broker):
    broker.submit(PaperOrder(symbol="SPY", side=Side.BUY, quantity=4))
    broker.on_bar("SPY", bar(1, 100, 100, 100, 100))
    broker.submit(PaperOrder(symbol="SPY", side=Side.SELL, quantity=1))
    broker.on_bar("SPY", bar(2, 102, 102, 102, 102))
    assert broker.position("SPY").quantity == 3 and broker.realized_pnl == pytest.approx(2)
    broker.submit(PaperOrder(symbol="SPY", side=Side.SELL, quantity=5))
    broker.on_bar("SPY", bar(3, 101, 101, 101, 101))
    p = broker.position("SPY")
    assert p.side == PositionSide.SHORT and p.quantity == 2 and p.avg_price == 101
    assert broker.realized_pnl == pytest.approx(2 + 3)


def test_rejects_out_of_order_bars_and_non_market_orders(broker):
    broker.on_bar("SPY", bar(5, 100, 100, 100, 100))
    with pytest.raises(PaperTradingError):
        broker.on_bar("SPY", bar(4, 100, 100, 100, 100))
    with pytest.raises(PaperTradingError):
        broker.submit(PaperOrder(symbol="SPY", side=Side.BUY, quantity=1, order_type="limit", limit_price=99))


def test_cancel(broker):
    o = broker.submit(PaperOrder(symbol="SPY", side=Side.BUY, quantity=1))
    assert broker.cancel(o.id).status == OrderStatus.CANCELLED
    assert broker.on_bar("SPY", bar(1, 100, 100, 100, 100)) == []
