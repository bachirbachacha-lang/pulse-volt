from datetime import datetime, timedelta, timezone

import pytest

from trading.core.schemas import (
    AccountState,
    AgentDecision,
    ClosedTrade,
    ConsensusResult,
    DataQualityStatus,
    ExitReason,
    PaperFill,
    PaperOrder,
    PaperPosition,
    PositionSide,
    RiskDecision,
    Side,
    Signal,
    SignalAction,
    ValidationReport,
    Verdict,
)
from trading.database import Database
from trading.database.store import SCHEMA_VERSION

TS = datetime(2024, 3, 4, 15, tzinfo=timezone.utc)


@pytest.fixture
def db(settings):
    d = Database(settings.database_path)
    yield d
    d.close()


def test_schema_created(db):
    assert db.schema_version == SCHEMA_VERSION
    assert db.count("signals") == 0


def test_signal_decisions_consensus_round_trip(db):
    sig = Signal(strategy="t", symbol="ES=F", interval="1h", timestamp=TS, action=SignalAction.ENTER_LONG,
                 price=5000, stop=4990, target=5020)
    db.save_signal(sig)
    d1 = AgentDecision(agent="signal_agent", signal_id=sig.id, verdict=Verdict.APPROVE, reason="ok")
    d2 = RiskDecision(agent="risk_agent", signal_id=sig.id, verdict=Verdict.APPROVE, quantity=1, risk_amount=500)
    db.save_decision(d1)
    db.save_decision(d2)
    db.save_consensus(ConsensusResult(signal_id=sig.id, approved=True, decisions=[d1, d2], quantity=1))
    assert db.signals("ES=F") == [sig]
    loaded = db.decisions(sig.id)
    assert loaded == [d1, d2] and isinstance(loaded[1], RiskDecision)
    assert db.consensus(sig.id).approved


def test_orders_fills_positions_trades(db):
    o = PaperOrder(symbol="ES=F", side=Side.BUY, quantity=1)
    db.save_order(o)
    assert db.orders(status="pending") == [o]
    o.status = "filled"
    db.save_order(o)  # upsert
    assert db.orders(status="pending") == [] and db.count("orders") == 1
    f = PaperFill(order_id=o.id, symbol="ES=F", side=Side.BUY, quantity=1, price=5000, reference_price=5000,
                  commission=1, slippage=0, timestamp=TS)
    db.save_fill(f)
    p = PaperPosition(symbol="ES=F", side=PositionSide.LONG, quantity=1, avg_price=5000, point_value=50)
    db.save_position(p)
    p2 = p.model_copy(update={"quantity": 2})
    db.save_position(p2)
    assert db.positions() == [p2]
    t = ClosedTrade(symbol="ES=F", side=PositionSide.LONG, quantity=1, entry_price=5000, exit_price=5010,
                    entry_time=TS, exit_time=TS + timedelta(hours=1), point_value=50, gross_pnl=500, commission=2,
                    net_pnl=498, exit_reason=ExitReason.TARGET)
    db.save_trade(t)
    assert db.fills("ES=F") == [f] and db.trades() == [t]


def test_account_snapshots_latest(db):
    db.save_account(AccountState(starting_balance=100, cash=100, timestamp=TS))
    db.save_account(AccountState(starting_balance=100, cash=95, timestamp=TS + timedelta(hours=1)))
    assert db.latest_account().cash == 95


def test_validation_reports_and_events(db):
    r = ValidationReport(symbol="ES=F", interval="1h", status=DataQualityStatus.WARNING, rows_in=10, rows_out=9)
    db.save_validation_report(r, "key")
    assert db.validation_reports("ES=F")[0].status == DataQualityStatus.WARNING
    db.log_event("restart", reason="test")
    assert db.events("restart")[0]["reason"] == "test"


def test_transaction_rolls_back(db):
    sig = Signal(strategy="t", symbol="ES=F", interval="1h", timestamp=TS, action=SignalAction.HOLD, price=1)
    with pytest.raises(RuntimeError):
        with db.transaction():
            db.save_signal(sig)
            raise RuntimeError("boom")
    assert db.count("signals") == 0


def test_count_rejects_unknown_table(db):
    with pytest.raises(ValueError):
        db.count("sqlite_master; DROP TABLE signals")


def test_persists_across_connections(settings):
    with Database(settings.database_path) as a:
        a.save_account(AccountState(starting_balance=100, cash=42))
    with Database(settings.database_path) as b:
        assert b.latest_account().cash == 42
