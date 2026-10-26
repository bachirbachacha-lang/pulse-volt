"""PAPER / SIMULATION engine: full lifecycle from market data to account update.

All market data here is synthetic and fed through the real yfinance adapter,
validator and pipeline; nothing touches a brokerage.
"""

import pandas as pd
import pytest

from trading.agents.controller import APPROVED, NO_TRADE
from trading.core.schemas import SIMULATION_LABEL, ExitReason, OrderStatus
from trading.data.pipeline import MarketDataPipeline
from trading.data.sources import YFinanceSource
from trading.database import Database
from trading.paper_trading.runner import NO_DATA, PaperTradingEngine
from trading.tests.test_original_youtube import BASE_UP, path

SETUP = 14  # bullish no-wick (Grandma setup), limit entry 108, stop ~102.225, target ~113.775
NOWICK = (108.0, 109.25, 108.0, 109.0)
TAP = (109.0, 109.25, 107.75, 108.5)
RALLY = [(108.5 + k, 109.75 + k, 108.25 + k, 109.5 + k) for k in range(8)]
DROP = [(108.5 - 2 * k, 108.75 - 2 * k, 106.25 - 2 * k, 106.5 - 2 * k) for k in range(5)]  # through the stop


def raw(after, t0="2024-02-13 09:30"):
    df = path(BASE_UP + [0] * len(after), t0=t0, overrides={SETUP: NOWICK})
    for k, row in enumerate(after):
        df.iloc[SETUP + 1 + k, :4] = row
    df.columns = ["Open", "High", "Low", "Close", "Volume"]
    return df


class Feed:
    """Serves the bars 'available so far' like yfinance would (can also fail)."""

    def __init__(self, df):
        self.df, self.upto, self.fail = df, SETUP, False

    def __call__(self, symbol, **kw):
        if self.fail:
            raise ConnectionError("yahoo unreachable")
        return self.df.iloc[: self.upto + 1].copy()


def close_of(df, i):
    return df.index[i] + pd.Timedelta(minutes=5)


def make_engine(settings, feed, db=None):
    pipe = MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=feed))
    return PaperTradingEngine(settings, ["ES=F"], "5m", db=db or Database(settings.database_path), pipeline=pipe)


def run_through(engine, feed, last):
    out = None
    while feed.upto < last:
        feed.upto += 1
        out = engine.run_once(now=close_of(feed.df, feed.upto))
    return out


def costs(settings, **kw):
    fut = settings.backtest.costs.futures_default.model_copy(update=kw)
    return settings.model_copy(update={"backtest": settings.backtest.model_copy(
        update={"costs": settings.backtest.costs.model_copy(update={"futures_default": fut})})})


@pytest.fixture
def started(settings):
    feed = Feed(raw([TAP] + RALLY))
    engine = make_engine(settings, feed)
    first = engine.run_once(now=close_of(feed.df, SETUP))
    return engine, feed, first


# ------------------------------------------------------------------ lifecycle


def test_winner_full_lifecycle_and_state_separation(settings, started):
    engine, feed, first = started
    assert first["label"] == SIMULATION_LABEL and first["account"]["label"] == SIMULATION_LABEL
    assert first["symbols"]["ES=F"]["outcome"] == APPROVED
    run_through(engine, feed, len(feed.df) - 1)
    db, broker = engine.db, engine.broker
    (trade,) = db.trades()
    assert trade.exit_reason == ExitReason.TARGET and trade.net_pnl > 0
    # Signal, order, fill, position and closed trade are stored separately.
    assert db.count("signals") >= 1
    entry, exit_ = sorted(db.orders(), key=lambda o: o.created_at)
    assert entry.status == OrderStatus.FILLED and entry.filled_at and entry.fill_price == 108.0
    assert len(db.fills()) == 2 and db.positions()[0].quantity == 0
    a = broker.account_state()
    assert a.cash == pytest.approx(settings.account.starting_balance + trade.net_pnl)
    assert a.realized_pnl == pytest.approx(trade.gross_pnl) and a.open_positions == 0


def test_target_fills_at_target_without_slippage(settings, started):
    engine, feed, _ = started
    run_through(engine, feed, len(feed.df) - 1)
    (trade,) = engine.db.trades()
    assert trade.exit_price == pytest.approx(engine.db.orders()[0].take_profit)


def test_loser_stop_with_slippage_and_commission(settings):
    feed = Feed(raw([TAP] + DROP))
    engine = make_engine(settings, feed)
    engine.run_once(now=close_of(feed.df, SETUP))
    run_through(engine, feed, len(feed.df) - 1)
    (trade,) = engine.db.trades()
    stop = engine.db.orders()[0].stop_loss
    assert trade.exit_reason == ExitReason.STOP and trade.net_pnl < 0
    assert trade.exit_price == pytest.approx(stop - 0.25)  # 1 tick slippage beyond the stop
    gross = (trade.exit_price - 108.0) * 50
    assert trade.gross_pnl == pytest.approx(gross)
    assert trade.net_pnl == pytest.approx(gross - 2 * 2.25)  # commission on both sides
    a = engine.broker.account_state()
    assert a.daily_pnl == pytest.approx(trade.net_pnl)
    # Drawdown is measured from peak equity, which included the open profit after the fill bar.
    assert a.drawdown == pytest.approx(a.equity - a.peak_equity) and a.drawdown < trade.net_pnl


def test_gap_through_stop_fills_at_the_open_not_the_stop(settings):
    gap = [TAP, (108.5, 108.75, 107.75, 108.0), (100.0, 100.5, 99.0, 99.5)]  # opens far below ~102.2
    feed = Feed(raw(gap))
    engine = make_engine(settings, feed)
    engine.run_once(now=close_of(feed.df, SETUP))
    run_through(engine, feed, len(feed.df) - 1)
    (trade,) = engine.db.trades()
    assert trade.exit_price == pytest.approx(100.0 - 0.25)  # open minus slippage, worse than the stop
    assert trade.exit_price < engine.db.orders()[0].stop_loss


def test_slippage_and_commission_are_configurable(settings):
    free = costs(settings, slippage_ticks=0.0, commission_per_unit_side=0.0)
    feed = Feed(raw([TAP] + DROP))
    engine = make_engine(free, feed)
    engine.run_once(now=close_of(feed.df, SETUP))
    run_through(engine, feed, len(feed.df) - 1)
    (trade,) = engine.db.trades()
    assert trade.exit_price == pytest.approx(engine.db.orders()[0].stop_loss)
    assert trade.commission == 0 and trade.net_pnl == pytest.approx(trade.gross_pnl)


def test_breakeven_exit(settings):
    free = costs(settings, slippage_ticks=0.0, commission_per_unit_side=0.0)
    flat = [(109.0, 109.25, 107.75, 108.0)] + [(108.0, 108.25, 107.75, 108.0)] * 3
    feed = Feed(raw(flat, t0="2024-02-13 14:35"))  # last bar ends before the 16:00 zone (futures buffer)
    engine = make_engine(free, feed)
    engine.run_once(now=close_of(feed.df, SETUP))
    run_through(engine, feed, len(feed.df) - 1)
    (trade,) = engine.db.trades()
    assert trade.exit_reason == ExitReason.MANUAL  # closed before the no-trading zone
    assert trade.net_pnl == pytest.approx(0.0)
    assert engine.broker.account_state().cash == pytest.approx(free.account.starting_balance)


def test_limit_order_not_filled_without_trade_through(settings):
    touch_only = [(109.0, 109.25, 108.0, 108.5)] + RALLY  # touches 108, never trades through
    feed = Feed(raw(touch_only))
    engine = make_engine(settings, feed)
    engine.run_once(now=close_of(feed.df, SETUP))
    run_through(engine, feed, len(feed.df) - 1)
    assert engine.db.trades() == [] and engine.db.fills() == []


# ------------------------------------------------------------------ safety


def test_duplicate_signal_and_rerun(settings, started):
    engine, feed, _ = started
    again = engine.run_once(now=close_of(feed.df, SETUP))  # same bar, same data
    assert again["symbols"]["ES=F"]["bars_processed"] == 0
    restarted = make_engine(settings, feed, db=Database(settings.database_path))
    assert restarted.run_once(now=close_of(feed.df, SETUP))["symbols"]["ES=F"]["bars_processed"] == 0
    assert engine.db.count("orders") == 1


def test_restart_with_open_position(settings):
    feed = Feed(raw([TAP] + RALLY))
    engine = make_engine(settings, feed)
    engine.run_once(now=close_of(feed.df, SETUP))
    run_through(engine, feed, SETUP + 2)  # filled, position open
    assert engine.broker.positions["ES=F"].is_open
    cash_before = engine.broker.cash
    engine.db.close()  # "crash"

    revived = make_engine(settings, feed, db=Database(settings.database_path))
    pos = revived.broker.positions["ES=F"]
    assert pos.is_open and pos.quantity == 1 and pos.stop_loss and pos.take_profit
    assert revived.broker.cash == pytest.approx(cash_before)
    assert revived.controller._last_bar["ES=F"] == feed.df.index[SETUP + 2]
    run_through(revived, feed, len(feed.df) - 1)
    (trade,) = revived.db.trades()
    assert trade.exit_reason == ExitReason.TARGET
    assert revived.db.count("signals") == 1  # no duplicate signal / order after the restart
    assert len([o for o in revived.db.orders() if o.setup_key]) == 1


def test_missing_market_data_leaves_positions_untouched(settings):
    feed = Feed(raw([TAP] + RALLY))
    engine = make_engine(settings, feed)
    engine.run_once(now=close_of(feed.df, SETUP))
    run_through(engine, feed, SETUP + 1)
    pos_before = engine.broker.positions["ES=F"].model_copy()
    feed.fail = True
    out = engine.run_once(now=close_of(feed.df, SETUP + 2))
    assert out["symbols"]["ES=F"]["outcome"] == NO_DATA and "unavailable" in out["symbols"]["ES=F"]["reason"]
    assert engine.broker.positions["ES=F"] == pos_before
    assert engine.db.evaluations(outcome=NO_DATA)
    feed.fail = False  # data returns: the missed bar is caught up in order
    feed.upto = SETUP + 3
    out = engine.run_once(now=close_of(feed.df, SETUP + 3))
    assert out["symbols"]["ES=F"]["bars_processed"] == 2


def test_failed_validation_is_treated_as_missing_data(settings):
    idx = pd.date_range("2024-02-13 09:30", periods=40, freq="30min", tz="America/New_York")
    bad = pd.DataFrame({"Open": 100.0, "High": 101.0, "Low": 99.0, "Close": 100.5, "Volume": 1.0}, index=idx)
    pipe = MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=lambda s, **k: bad))
    engine = PaperTradingEngine(settings, ["ES=F"], "5m", db=Database(":memory:"), pipeline=pipe)
    out = engine.run_once(now=idx[-1] + pd.Timedelta(minutes=30))
    assert out["symbols"]["ES=F"]["outcome"] == NO_DATA and "failed validation" in out["symbols"]["ES=F"]["reason"]


def test_never_uses_bars_after_now(settings):
    feed = Feed(raw([TAP] + RALLY))
    feed.upto = len(feed.df) - 1  # the feed already "has" future bars
    engine = make_engine(settings, feed)
    out = engine.run_once(now=close_of(feed.df, SETUP))
    assert out["symbols"]["ES=F"]["evaluations"][-1]["bar"] == str(feed.df.index[SETUP].tz_convert(
        "America/New_York"))
    assert engine.db.fills() == []  # the future tap bar has not "happened" yet


def test_open_position_account_fields(settings):
    feed = Feed(raw([TAP] + RALLY))
    engine = make_engine(settings, feed)
    engine.run_once(now=close_of(feed.df, SETUP))
    run_through(engine, feed, SETUP + 2)
    a = engine.broker.account_state()
    pos = engine.broker.positions["ES=F"]
    assert a.open_positions == 1
    assert a.open_exposure == pytest.approx(pos.quantity * pos.last_price * 50)
    assert a.open_risk == pytest.approx((pos.avg_price - pos.stop_loss) * 50)
    assert a.unrealized_pnl == pytest.approx((pos.last_price - pos.avg_price) * 50)
    assert a.equity == pytest.approx(a.cash + a.unrealized_pnl) and a.peak_equity >= a.equity


def test_default_1000_balance_is_too_small_for_es(tmp_path):
    from trading.config.settings import load_settings

    s = load_settings(environ={}, root=tmp_path, overrides={"logging": {"console": False}})
    assert s.account.starting_balance == 1000.0
    feed = Feed(raw([TAP] + RALLY))
    engine = make_engine(s, feed)
    out = engine.run_once(now=close_of(feed.df, SETUP))
    assert out["symbols"]["ES=F"]["outcome"] == NO_TRADE
    assert "position size rounds to zero" in out["symbols"]["ES=F"]["evaluations"][-1]["reason"]
