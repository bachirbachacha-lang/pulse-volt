"""Three-agent decision system: approvals, every kind of rejection, audit trail,
and proof that no rejected decision can reach the paper broker."""

import itertools

import pandas as pd
import pytest

from trading.agents.common import bar_close
from trading.agents.consensus import ConsensusEngine
from trading.agents.controller import APPROVED, NO_TRADE, DecisionController, StrategyModifiedError, \
    fill_models_from_settings
from trading.core.schemas import (
    AgentDecision,
    AssetClass,
    ClosedTrade,
    ConsensusResult,
    ExitReason,
    MarketData,
    OrderType,
    PaperOrder,
    PositionSide,
    RiskDecision,
    Side,
    Verdict,
)
from trading.data.validation import DataValidator
from trading.database import Database
from trading.paper_trading import PaperBroker, PaperTradingError
from trading.paper_trading.engine import REQUIRED_AGENTS
from trading.strategies import get_strategy
from trading.strategies.original_youtube import default_definition
from trading.tests.test_original_youtube import BASE_UP, path

# Uptrend (BOS on bar 12), bullish no-wick on bar 14 (open 108 = low): a Grandma setup.
TAP = (109.0, 109.25, 107.75, 108.5)  # trades 1 tick through the 108 limit
RALLY = [(108.5 + k, 109.75 + k, 108.25 + k, 109.5 + k) for k in range(8)]  # on the 0.25 tick grid
SETUP_BAR = 14


def scenario(settings, after, t0="2024-02-13 09:30"):
    df = path(BASE_UP + [0] * len(after), t0=t0, overrides={SETUP_BAR: (108.0, 109.25, 108.0, 109.0)})
    for k, row in enumerate(after):
        df.iloc[SETUP_BAR + 1 + k, :4] = row
    v = DataValidator(settings)
    clean, report = v.validate(df, v.context_for("ES=F", "5m"))
    return MarketData(symbol="ES=F", interval="5m", timezone="America/New_York", asset_class=AssetClass.FUTURES,
                      frame=clean, is_clean=True, report=report)


@pytest.fixture
def system(settings):
    db = Database(":memory:")
    broker = PaperBroker(settings, db, fill_models=fill_models_from_settings(settings, ["ES=F"]))
    ctl = DecisionController(settings, get_strategy(default_definition(["ES=F"], "5m")), broker, db)
    return ctl, broker, db


def at(md, j):
    return md.window(end=md.frame.index[j])


def agent_verdicts(rec):
    return {a: (rec["agents"][a]["output"]["decision"] if a == "signal_analyst" else
                rec["agents"][a]["output"]["verdict"]) if rec["agents"][a].get("run", True) else "not run"
            for a in REQUIRED_AGENTS}


# ---------------------------------------------------------------- approvals


def test_three_approvals_create_one_paper_order_and_it_trades(settings, system):
    ctl, broker, db = system
    md = scenario(settings, [TAP] + RALLY)
    assert md.report.status.value == "OK"
    rec = ctl.step(at(md, SETUP_BAR))
    assert rec["outcome"] == APPROVED
    assert agent_verdicts(rec) == {a: "approve" for a in REQUIRED_AGENTS}
    (order,) = broker.pending.values()
    a = rec["agents"]["signal_analyst"]["output"]
    assert order.order_type == OrderType.LIMIT and order.limit_price == 108.0 and order.quantity == 1
    assert order.stop_loss == a["stop"] and order.take_profit == a["target"] and order.expires_after_bars == 10
    # Continue bar by bar: fills on the tap bar, exits at the 1:1 target.
    for j in range(SETUP_BAR + 1, len(md.frame)):
        ctl.step(at(md, j))
    (trade,) = db.trades()
    assert trade.exit_reason == ExitReason.TARGET and trade.net_pnl > 0
    assert trade.entry_time == md.frame.index[SETUP_BAR + 1]


# ---------------------------------------------------------------- each rejection stops the trade


def test_agent1_rejection_no_signal(settings, system):
    ctl, broker, db = system
    md = scenario(settings, [TAP] + RALLY)
    rec = ctl.step(at(md, 13))  # bar 13 is not a no-wick candle
    assert rec["outcome"] == NO_TRADE and agent_verdicts(rec)["signal_analyst"] == "reject"
    assert "nowick_candle_on_latest_bar" in rec["agents"]["signal_analyst"]["output"]["conditions_failed"]
    assert rec["agents"]["risk_manager"] == {"run": False, "reason": "signal analyst rejected"}
    assert not broker.pending and db.count("orders") == 0


def test_agent2_rejection_daily_loss(settings, system):
    ctl, broker, db = system
    md = scenario(settings, [TAP] + RALLY)
    t = md.frame.index[5].to_pydatetime()
    broker.closed_trades.append(ClosedTrade(symbol="NQ=F", side=PositionSide.LONG, quantity=1, entry_price=1,
                                            exit_price=1, entry_time=t, exit_time=t, gross_pnl=-2500,
                                            commission=0, net_pnl=-2500, exit_reason=ExitReason.STOP))
    rec = ctl.step(at(md, SETUP_BAR))
    assert rec["outcome"] == NO_TRADE
    v = agent_verdicts(rec)
    assert v["signal_analyst"] == "approve" and v["risk_manager"] == "reject" and v["execution_validator"] == "not run"
    assert "daily_loss_limit" in rec["consensus"]["reason"]
    assert not broker.pending


def test_agent3_rejection_signal_no_longer_current(settings, system):
    ctl, broker, _ = system
    md = scenario(settings, [TAP] + RALLY)
    w = at(md, SETUP_BAR)
    late = bar_close(w) + pd.Timedelta(minutes=7)  # fresh enough for risk (3 bars), too late to act (1 bar)
    rec = ctl.step(w, now=late)
    v = agent_verdicts(rec)
    assert v == {"signal_analyst": "approve", "risk_manager": "approve", "execution_validator": "reject"}
    assert "signal_still_current" in rec["consensus"]["reason"] and rec["outcome"] == NO_TRADE
    assert not broker.pending


def test_stale_data_is_rejected(settings, system):
    ctl, broker, _ = system
    md = scenario(settings, [TAP] + RALLY)
    w = at(md, SETUP_BAR)
    rec = ctl.step(w, now=bar_close(w) + pd.Timedelta(hours=2))
    assert rec["outcome"] == NO_TRADE and "data_not_stale" in rec["consensus"]["reason"]
    assert not broker.pending
    # Agent 3 also refuses stale data on its own.
    analysis, signal, _, _ = ctl.signal_analyst.analyze(w)
    risk = RiskDecision(agent="risk_manager", signal_id=signal.id, verdict=Verdict.APPROVE, quantity=1,
                        stop=signal.stop, target=signal.target)
    d = ctl.execution_validator.review(ctl.build_order(signal, 1), signal, risk, w,
                                       bar_close(w) + pd.Timedelta(hours=2), [], set())
    assert d.verdict == Verdict.REJECT and "data_not_stale" in d.reason


@pytest.mark.parametrize("case", ["empty", "unvalidated", "nan_last_bar"])
def test_missing_data_is_rejected(settings, system, case):
    ctl, broker, _ = system
    md = at(scenario(settings, [TAP] + RALLY), SETUP_BAR)
    if case == "empty":
        md = md.model_copy(update={"frame": md.frame.iloc[0:0]})
    elif case == "unvalidated":
        md = md.model_copy(update={"is_clean": False, "report": None})
    else:
        f = md.frame.copy()
        f.iloc[-1, f.columns.get_loc("close")] = float("nan")
        md = md.model_copy(update={"frame": f})
    rec = ctl.step(md, now=pd.Timestamp("2024-02-13 10:45", tz="America/New_York"))
    assert rec["outcome"] == NO_TRADE and agent_verdicts(rec)["signal_analyst"] == "reject"
    assert not broker.pending


def test_duplicate_signal_is_rejected(settings, system):
    ctl, broker, db = system
    w = at(scenario(settings, [TAP] + RALLY), SETUP_BAR)
    first, second = ctl.step(w), ctl.step(w)
    assert first["outcome"] == APPROVED and second["outcome"] == NO_TRADE
    assert "no_duplicate_exposure" in second["consensus"]["reason"]
    assert len(broker.pending) == 1 and db.count("orders") == 1
    # Even with the first order gone, the same setup is never approved twice (Agent 3).
    broker.cancel(next(iter(broker.pending)))
    third = ctl.step(w)
    assert agent_verdicts(third)["execution_validator"] == "reject" and "no_duplicate" in third["consensus"]["reason"]
    assert not broker.pending


def test_invalid_position_size(settings):
    small = settings.model_copy(update={"account": settings.account.model_copy(update={"starting_balance": 1000.0})})
    db = Database(":memory:")
    broker = PaperBroker(small, db, fill_models=fill_models_from_settings(small, ["ES=F"]))
    ctl = DecisionController(small, get_strategy(default_definition(["ES=F"], "5m")), broker, db)
    rec = ctl.step(at(scenario(small, [TAP] + RALLY), SETUP_BAR))
    assert rec["outcome"] == NO_TRADE and "position size rounds to zero" in rec["consensus"]["reason"]
    assert not broker.pending


def test_wrong_quantity_in_order_is_caught_by_agent3(settings, system, monkeypatch):
    ctl, broker, _ = system
    original = ctl.build_order
    monkeypatch.setattr(ctl, "build_order", lambda signal, qty: original(signal, qty + 1))
    rec = ctl.step(at(scenario(settings, [TAP] + RALLY), SETUP_BAR))
    assert agent_verdicts(rec)["execution_validator"] == "reject" and "correct_quantity" in rec["consensus"]["reason"]
    assert not broker.pending


# ---------------------------------------------------------------- any rejection prevents execution


@pytest.mark.parametrize("agent", REQUIRED_AGENTS)
def test_any_single_rejection_prevents_execution(settings, system, monkeypatch, agent):
    ctl, broker, _ = system
    submitted = []
    monkeypatch.setattr(broker, "submit", lambda *a, **k: submitted.append(a))
    if agent == "signal_analyst":
        real = ctl.signal_analyst.analyze

        def analyze(*a, **k):
            analysis, signal, scan, state = real(*a, **k)
            analysis.decision, analysis.reason = Verdict.REJECT, "forced rejection"
            return analysis, None, scan, state
        monkeypatch.setattr(ctl.signal_analyst, "analyze", analyze)
    elif agent == "risk_manager":
        real = ctl.risk_manager.review

        def review(*a, **k):
            d, ctx = real(*a, **k)
            return d.model_copy(update={"verdict": Verdict.REJECT, "quantity": 0.0, "reason": "forced"}), ctx
        monkeypatch.setattr(ctl.risk_manager, "review", review)
    else:
        real = ctl.execution_validator.review
        monkeypatch.setattr(ctl.execution_validator, "review",
                            lambda *a, **k: real(*a, **k).model_copy(update={"verdict": Verdict.REJECT,
                                                                              "reason": "forced"}))
    rec = ctl.step(at(scenario(settings, [TAP] + RALLY), SETUP_BAR))
    assert rec["outcome"] == NO_TRADE and submitted == [] and not broker.pending


def test_every_non_unanimous_vote_is_no_trade_and_broker_refuses_it(settings):
    broker = PaperBroker(settings)
    engine = ConsensusEngine(required_agents=set(REQUIRED_AGENTS))
    order = PaperOrder(symbol="ES=F", side=Side.BUY, quantity=1, signal_id="sig_x")
    for votes in itertools.product([Verdict.APPROVE, Verdict.REJECT], repeat=3):
        decisions = [AgentDecision(agent=REQUIRED_AGENTS[0], signal_id="sig_x", verdict=votes[0]),
                     RiskDecision(agent=REQUIRED_AGENTS[1], signal_id="sig_x", verdict=votes[1], quantity=1),
                     AgentDecision(agent=REQUIRED_AGENTS[2], signal_id="sig_x", verdict=votes[2])]
        result = engine.decide("sig_x", decisions)
        unanimous = all(v == Verdict.APPROVE for v in votes)
        assert result.approved == unanimous
        if not unanimous:
            with pytest.raises(PaperTradingError):
                broker.submit(order.model_copy(), result)
    assert not broker.pending


def test_broker_cannot_be_bypassed(settings):
    broker = PaperBroker(settings)
    order = PaperOrder(symbol="ES=F", side=Side.BUY, quantity=1, signal_id="sig_a")
    ok = [AgentDecision(agent=a, signal_id="sig_a", verdict=Verdict.APPROVE) for a in REQUIRED_AGENTS]
    with pytest.raises(PaperTradingError, match="no consensus"):
        broker.submit(order)
    forged = ConsensusResult(signal_id="sig_a", approved=True, decisions=ok[:2], quantity=1)
    with pytest.raises(PaperTradingError, match="no APPROVE"):
        broker.submit(order, forged)
    other = ConsensusResult(signal_id="sig_b", approved=True, decisions=ok, quantity=1)
    with pytest.raises(PaperTradingError, match="different signal"):
        broker.submit(order, other)
    wrong_qty = ConsensusResult(signal_id="sig_a", approved=True, decisions=ok, quantity=2)
    with pytest.raises(PaperTradingError, match="quantity"):
        broker.submit(order, wrong_qty)
    assert not broker.pending
    with pytest.raises(ValueError):
        DecisionController(settings, get_strategy(default_definition()), PaperBroker(settings, require_consensus=False))


# ---------------------------------------------------------------- strategy integrity, maintenance, audit


def test_strategy_cannot_change_while_running(settings, system):
    ctl, _, _ = system
    md = scenario(settings, [TAP] + RALLY)
    ctl.step(at(md, 12))
    object.__setattr__(ctl.strategy.params, "max_return_candles", 50)  # tamper with a frozen dataclass
    with pytest.raises(StrategyModifiedError):
        ctl.step(at(md, 13))


def test_pending_entry_cancelled_when_strategy_invalidates_it(settings, system):
    ctl, broker, db = system
    flat = [(109.5, 109.75, 109.25, 109.5)] * 11  # never returns to 108
    md = scenario(settings, flat)
    recs = [ctl.step(at(md, j)) for j in range(SETUP_BAR, len(md.frame))]
    assert recs[0]["outcome"] == APPROVED
    order = db.orders()[0]
    assert order.status.value == "cancelled" and not broker.pending
    actions = [m for r in recs for m in r["maintenance"] if m["action"] == "cancel_order"]
    assert actions and "10 candles" in actions[0]["reason"]


def test_position_closed_before_no_trade_zone(settings, system):
    ctl, broker, db = system
    md = scenario(settings, [TAP] + [(108.5, 108.75, 108.25, 108.5)] * 4, t0="2024-02-13 14:35")
    recs = [ctl.step(at(md, j)) for j in range(SETUP_BAR, len(md.frame))]
    (trade,) = db.trades()
    assert trade.exit_reason == ExitReason.MANUAL
    assert pd.Timestamp(trade.exit_time) == pd.Timestamp("2024-02-13 15:55", tz="America/New_York")
    assert any(m["action"] == "close_position" for r in recs for m in r["maintenance"])


def test_audit_trail_explains_every_decision(settings, system):
    ctl, broker, db = system
    md = scenario(settings, [TAP] + RALLY)
    recs = ctl.replay(md, start=10)
    stored = db.evaluations()
    assert len(stored) == len(recs) == len(md.frame) - 10
    assert sum(e["outcome"] == NO_TRADE for e in stored) >= len(stored) - 1  # rejected ones are kept too
    for e in stored:
        assert {"id", "created_at", "now", "bar_time", "market_state", "strategy_state", "agents", "consensus",
                "outcome", "strategy_params_hash"} <= set(e)
        assert e["market_state"]["recent_bars"] and e["consensus"]["reason"]
        assert set(e["agents"]) == set(REQUIRED_AGENTS)
        assert e["agents"]["signal_analyst"]["output"]["conditions_checked"]
    approved = db.evaluations(outcome=APPROVED)
    assert len(approved) == 1
    e = approved[0]
    assert db.order(e["order_id"]).signal_id == e["signal_id"]
    assert [d.agent for d in db.decisions(e["signal_id"])] == list(REQUIRED_AGENTS)
    assert db.consensus(e["signal_id"]).approved
    for name in ("risk_manager", "execution_validator"):
        assert e["agents"][name]["input"] and e["agents"][name]["output"]["details"]["checks"]


def test_restart_does_not_reprocess_a_bar(settings):
    md = scenario(settings, [TAP] + RALLY)
    path_db = settings.database_path
    db = Database(path_db)
    broker = PaperBroker(settings, db, fill_models=fill_models_from_settings(settings, ["ES=F"]))
    ctl = DecisionController(settings, get_strategy(default_definition(["ES=F"], "5m")), broker, db)
    ctl.step(at(md, SETUP_BAR))
    ctl.step(at(md, SETUP_BAR + 1))  # fills the limit order
    db.close()
    db2 = Database(path_db)
    broker2 = PaperBroker(settings, db2, fill_models=fill_models_from_settings(settings, ["ES=F"]))
    ctl2 = DecisionController(settings, get_strategy(default_definition(["ES=F"], "5m")), broker2, db2)
    rec = ctl2.step(at(md, SETUP_BAR + 1))  # same bar again after a "restart"
    assert rec["broker_processed"] is False
    assert broker2.positions["ES=F"].quantity == 1  # restored, not doubled
    assert rec["outcome"] == NO_TRADE
