"""Regression tests for the bugs found in the adversarial audit (see trading/AUDIT.md).

Each test fails on the code as it was before the fix. PAPER / SIMULATION only.
"""

import pandas as pd
import pytest

from trading.agents import controller as controller_mod
from trading.agents.consensus import ConsensusEngine
from trading.agents.controller import APPROVED, DecisionController, StrategyModifiedError, fill_models_from_settings
from trading.backtests.report import _feasibility
from trading.core.schemas import (
    AgentDecision,
    Candle,
    ConsensusResult,
    OrderStatus,
    OrderType,
    PaperOrder,
    RiskDecision,
    Side,
    Verdict,
)
from trading.data.instruments import session_for
from trading.data.validation import DataValidator
from trading.database import Database
from trading.paper_trading import PaperBroker, PaperTradingError
from trading.paper_trading.engine import REQUIRED_AGENTS
from trading.strategies import get_strategy
from trading.strategies.original_youtube import OriginalYoutubeScanner, default_definition
from trading.tests.factories import random_futures_bars
from trading.tests.test_decision_system import RALLY, SETUP_BAR, TAP, at, scenario

T0 = pd.Timestamp("2024-02-13 10:00", tz="America/New_York")


def bar(k, o, h, lo, c):
    return Candle(timestamp=(T0 + pd.Timedelta(minutes=5 * k)).to_pydatetime(), open=o, high=h, low=lo, close=c,
                  volume=100)


def es_broker(settings, db=None):
    return PaperBroker(settings, db, require_consensus=False, fill_models=fill_models_from_settings(settings, ["ES=F"]))


# ---------------------------------------------------------------- C1: risk cap basis


def test_exposure_cap_uses_equity_like_the_budget(settings):
    """Before: cap = starting balance x pct while the budget = equity x pct, so once the
    account was in profit every correctly sized trade was rejected as 'current_exposure'."""
    db = Database(":memory:")
    broker = PaperBroker(settings, db, fill_models=fill_models_from_settings(settings, ["ES=F"]))
    broker.cash = 120_000.0  # +20% profit: budget 600, two contracts at ~289 each
    ctl = DecisionController(settings, get_strategy(default_definition(["ES=F"], "5m")), broker, db)
    rec = ctl.step(at(scenario(settings, [TAP] + RALLY), SETUP_BAR))
    assert rec["outcome"] == APPROVED, rec["consensus"]["reason"]
    assert broker.pending[rec["order_id"]].quantity == 2


# ---------------------------------------------------------------- C2: gap through the stop


def test_limit_entry_is_cancelled_when_the_bar_opens_beyond_the_stop(settings):
    b = es_broker(settings)
    b.submit(PaperOrder(symbol="ES=F", side=Side.BUY, quantity=1, order_type=OrderType.LIMIT, limit_price=4990.0,
                        stop_loss=4985.0, take_profit=4995.0, expires_after_bars=10))
    fills = b.on_bar("ES=F", bar(1, 4980.0, 4992.0, 4979.0, 4991.0))  # opens 5 points below the stop
    assert fills == [] and not b.pending and not b.closed_trades
    assert not b.position("ES=F").is_open
    assert b.cash == settings.account.starting_balance


def test_market_entry_is_cancelled_when_the_bar_opens_beyond_the_stop(settings):
    b = es_broker(settings)
    order = b.submit(PaperOrder(symbol="ES=F", side=Side.SELL, quantity=1, stop_loss=5005.0, take_profit=4995.0,
                                target_rr=1.0))
    assert b.on_bar("ES=F", bar(1, 5006.0, 5007.0, 4990.0, 4992.0)) == []
    assert order.status == OrderStatus.CANCELLED and "gap" in order.reason


# ---------------------------------------------------------------- H5: market entry target


def test_market_entry_target_is_one_to_one_from_the_actual_fill(settings):
    b = es_broker(settings)
    b.submit(PaperOrder(symbol="ES=F", side=Side.BUY, quantity=1, stop_loss=4985.0, take_profit=4995.0,
                        target_rr=1.0))
    (fill,) = b.on_bar("ES=F", bar(1, 4990.0, 4991.0, 4989.0, 4990.5))
    assert fill.price == 4990.25  # open + 1 tick slippage
    assert b.positions["ES=F"].take_profit == pytest.approx(4990.25 + 5.25)


# ---------------------------------------------------------------- H1: atomic bar processing


def test_a_crash_mid_bar_leaves_no_half_written_state(settings, monkeypatch):
    db = Database(settings.database_path)
    broker = PaperBroker(settings, db, fill_models=fill_models_from_settings(settings, ["ES=F"]))
    ctl = DecisionController(settings, get_strategy(default_definition(["ES=F"], "5m")), broker, db)
    md = scenario(settings, [TAP] + RALLY)
    assert ctl.step(at(md, SETUP_BAR))["outcome"] == APPROVED  # limit order pending

    def boom(record):
        raise RuntimeError("disk full")

    monkeypatch.setattr(db, "save_evaluation", boom)
    with pytest.raises(RuntimeError):
        ctl.step(at(md, SETUP_BAR + 1))  # the bar that fills the order
    assert db.fills() == [] and not any(p.is_open for p in db.positions())
    assert not broker.position("ES=F").is_open and len(broker.pending) == 1  # memory rolled back too
    monkeypatch.undo()
    rec = ctl.step(at(md, SETUP_BAR + 1))
    assert rec["broker_processed"] is True and len(db.fills()) == 1


# ---------------------------------------------------------------- M3: forged consensus


def test_a_hand_built_unanimous_consensus_is_refused(settings):
    broker = PaperBroker(settings)
    order = PaperOrder(symbol="ES=F", side=Side.BUY, quantity=1, signal_id="sig_f")
    decisions = [AgentDecision(agent=REQUIRED_AGENTS[0], signal_id="sig_f", verdict=Verdict.APPROVE),
                 RiskDecision(agent=REQUIRED_AGENTS[1], signal_id="sig_f", verdict=Verdict.APPROVE, quantity=1),
                 AgentDecision(agent=REQUIRED_AGENTS[2], signal_id="sig_f", verdict=Verdict.APPROVE)]
    forged = ConsensusResult(signal_id="sig_f", approved=True, decisions=decisions, quantity=1)
    with pytest.raises(PaperTradingError, match="not issued"):
        broker.submit(order, forged)
    genuine = ConsensusEngine(required_agents=set(REQUIRED_AGENTS)).decide("sig_f", decisions)
    tampered = genuine.model_copy(update={"quantity": 5})
    with pytest.raises(PaperTradingError):
        broker.submit(order.model_copy(update={"quantity": 5}), tampered)
    broker.submit(order, genuine)
    with pytest.raises(PaperTradingError, match="already used"):
        broker.submit(order.model_copy(update={"id": "ord_again"}), genuine)


# ---------------------------------------------------------------- H3: forward-test version


def test_a_changed_strategy_cannot_continue_the_old_paper_record(settings, monkeypatch):
    db = Database(settings.database_path)
    broker = PaperBroker(settings, db, fill_models=fill_models_from_settings(settings, ["ES=F"]))
    ctl = DecisionController(settings, get_strategy(default_definition(["ES=F"], "5m")), broker, db)
    rec = ctl.step(at(scenario(settings, [TAP] + RALLY), SETUP_BAR))
    assert rec["strategy_code_version"] == ctl.code_version
    monkeypatch.setattr(controller_mod, "code_fingerprint", lambda params=None: "edited-code")
    with pytest.raises(StrategyModifiedError, match="new paper record"):
        DecisionController(settings, get_strategy(default_definition(["ES=F"], "5m")), PaperBroker(settings, db), db)


# ---------------------------------------------------------------- H2: roll / jump artifacts


def test_structure_spanning_a_flagged_price_jump_is_not_traded(settings):
    raw = random_futures_bars(session_for("ES=F", settings), "2024-03-11", "2024-03-20", seed=5, yf_columns=False)
    jump = pd.Timestamp("2024-03-14 18:00", tz="America/New_York")
    pos = raw.index.get_loc(jump)
    for c in ("open", "high", "low", "close"):
        raw.iloc[pos:, raw.columns.get_loc(c)] += 55.0  # an unadjusted calendar-spread jump
    v = DataValidator(settings)
    clean, _ = v.validate(raw, v.context_for("ES=F", "5m"))
    setups = OriginalYoutubeScanner().scan(clean, "ES=F", "5m").setups
    spanning = [s for s in setups if s.protective_index >= 0
                and clean.index[s.protective_index] < jump <= s.nowick_time]
    assert spanning, "scenario must contain setups whose structure spans the jump"
    assert all(s.fill_index is None for s in spanning)
    assert any("discontinuity" in s.reason for s in spanning)


# ---------------------------------------------------------------- H6: same fill rules everywhere


def test_signal_analyst_scans_with_the_brokers_fill_rules(settings, system_with_spy):
    """Before: Agent 1 (and order maintenance) scanned with touch = fill and zero costs while the
    broker needs a 1-tick trade-through, so a merely touched limit looked 'filled' to the
    strategy and was never cancelled when the setup was invalidated."""
    ctl, seen = system_with_spy
    ctl.step(at(scenario(settings, [TAP] + RALLY), SETUP_BAR))
    assert seen == [ctl.broker.fill_models["ES=F"].config]
    assert seen[0].limit_through_ticks == settings.backtest.costs.futures_default.limit_through_ticks


@pytest.fixture
def system_with_spy(settings, monkeypatch):
    db = Database(":memory:")
    broker = PaperBroker(settings, db, fill_models=fill_models_from_settings(settings, ["ES=F"]))
    ctl = DecisionController(settings, get_strategy(default_definition(["ES=F"], "5m")), broker, db)
    seen, real = [], ctl.signal_analyst.strategy.scan

    def spy(md, news_events=(), fill_config=None):
        seen.append(fill_config)
        return real(md, news_events, fill_config=fill_config)

    monkeypatch.setattr(ctl.signal_analyst.strategy, "scan", spy)
    return ctl, seen


# ---------------------------------------------------------------- H7: several pending setups


def test_first_pending_entry_to_fill_cancels_the_others(settings):
    b = es_broker(settings)
    a = b.submit(PaperOrder(symbol="ES=F", side=Side.BUY, quantity=1, order_type=OrderType.LIMIT, limit_price=4990.0,
                            stop_loss=4980.0, take_profit=5000.0, setup_key="k1", expires_after_bars=10))
    c = b.submit(PaperOrder(symbol="ES=F", side=Side.BUY, quantity=1, order_type=OrderType.LIMIT, limit_price=4995.0,
                            stop_loss=4985.0, take_profit=5005.0, setup_key="k2", expires_after_bars=10))
    b.on_bar("ES=F", bar(1, 4998.0, 4999.0, 4989.0, 4991.0))  # trades through both limits
    assert a.status == OrderStatus.FILLED and c.status == OrderStatus.CANCELLED
    assert b.positions["ES=F"].quantity == 1 and not b.pending


def test_risk_manager_allows_another_pending_setup_on_the_same_symbol(settings, system_with_spy):
    ctl, _ = system_with_spy
    md = scenario(settings, [TAP] + RALLY)
    ctl.broker.pending["ord_old"] = PaperOrder(id="ord_old", symbol="ES=F", side=Side.BUY, quantity=1,
                                               order_type=OrderType.LIMIT, limit_price=100.0, stop_loss=95.0,
                                               setup_key="ES=F|5m|older|long")
    rec = ctl.step(at(md, SETUP_BAR))
    assert rec["outcome"] == APPROVED, rec["consensus"]["reason"]
    ctl.broker.pending["ord_mes"] = PaperOrder(id="ord_mes", symbol="MES=F", side=Side.BUY, quantity=1,
                                               order_type=OrderType.LIMIT, limit_price=100.0, stop_loss=95.0)
    assert "no_duplicate_exposure" in ctl.step(at(scenario(settings, [TAP] + RALLY, t0="2024-02-14 09:30"),
                                                  SETUP_BAR))["consensus"]["reason"]


# ---------------------------------------------------------------- M2: daily P&L


def test_daily_pnl_counts_the_open_positions_entry_commission(settings):
    b = es_broker(settings)
    b.submit(PaperOrder(symbol="ES=F", side=Side.BUY, quantity=1, stop_loss=4980.0, take_profit=5020.0))
    b.on_bar("ES=F", bar(1, 5000.0, 5001.0, 4999.0, 5000.25))
    acct = b.account_state()
    assert acct.daily_pnl == pytest.approx(acct.unrealized_pnl - 2.25)
    assert acct.daily_pnl == pytest.approx(acct.equity - settings.account.starting_balance)


# ---------------------------------------------------------------- H4: sizing feasibility


def test_backtest_report_states_how_many_trades_the_account_could_size(settings):
    trades = pd.DataFrame({"sizable_at_account": [False, False, True], "min_size_risk": [300.0, 600.0, 4.0]})
    line = _feasibility(trades, settings)
    assert "only 1 of 3 trades" in line and "NOT achievable" in line


# ---------------------------------------------------------------- backtest == paper engine


@pytest.mark.parametrize("seed", [19, 29])
def test_backtest_and_paper_engine_take_identical_trades(settings, seed):
    """Same bars through the backtester and through agents + consensus + paper broker."""
    from trading.backtests.equivalence import compare

    raw = random_futures_bars(session_for("ES=F", settings), "2024-02-05", "2024-02-07", seed=seed,
                              yf_columns=False)
    c = compare(raw)
    assert len(c.backtest) >= 5
    assert sorted(c.paper) == sorted(c.backtest)
