"""Execution validator (data-quality gate), consensus engine and Discord notifier."""

import pandas as pd
import pytest

from trading.agents import ConsensusEngine
from trading.core.schemas import (
    AccountState,
    AgentDecision,
    AssetClass,
    DataQualityStatus,
    MarketData,
    RiskDecision,
    Signal,
    SignalAction,
    Verdict,
)
from trading.data.instruments import session_for
from trading.data.validation import DataValidator
from trading.execution import ExecutionValidator
from trading.notifications import DiscordNotifier
from trading.notifications.discord import format_quality, format_signal
from trading.tests.factories import equity_hourly, make_ohlcv, session_index

ACCOUNT = AccountState(starting_balance=100_000, cash=100_000)


def clean_md(settings, raw, symbol="SPY"):
    v = DataValidator(settings)
    clean, report = v.validate(raw, v.context_for(symbol, "1h"))
    return MarketData(symbol=symbol, interval="1h", timezone=settings.market_data.timezone,
                      asset_class=AssetClass.FUTURES if symbol.endswith("=F") else AssetClass.EQUITY,
                      frame=clean, is_clean=True, report=report)


def long_signal(md, **kw):
    price = float(md.frame["close"].iloc[-1])
    return Signal(strategy="t", symbol=md.symbol, interval=md.interval, timestamp=md.frame.index[-1],
                  action=SignalAction.ENTER_LONG, price=price, stop=price * 0.99, **kw)


def test_approves_clean_data(settings):
    md = clean_md(settings, equity_hourly(session_for("SPY", settings)))
    d = ExecutionValidator(settings).review(long_signal(md), md, ACCOUNT)
    assert d.verdict == Verdict.APPROVE, d.reason


def test_rejects_unvalidated_and_failed(settings):
    raw = equity_hourly(session_for("SPY", settings))
    md = MarketData(symbol="SPY", interval="1h", timezone="America/New_York", asset_class=AssetClass.EQUITY,
                    frame=raw)
    assert ExecutionValidator(settings).review(long_signal(md), md, ACCOUNT).verdict == Verdict.REJECT
    bad = clean_md(settings, make_ohlcv(session_index(session_for("SPY", settings), "2024-03-04", "2024-03-15",
                                                      "30min")))
    assert bad.report.status == DataQualityStatus.FAILED
    d = ExecutionValidator(settings).review(long_signal(bad), bad, ACCOUNT)
    assert d.verdict == Verdict.REJECT and "FAILED" in d.reason


def test_rejects_dataset_warning(settings):
    raw = equity_hourly(session_for("SPY", settings))
    raw.index = raw.index.tz_convert("UTC").tz_localize(None)  # naive tz -> dataset-level warning
    md = clean_md(settings, raw)
    d = ExecutionValidator(settings).review(long_signal(md), md, ACCOUNT)
    assert d.verdict == Verdict.REJECT and "DATA QUALITY WARNING" in d.reason


def test_rejects_signal_on_roll_bar(settings):
    idx = session_index(session_for("ES=F", settings), "2024-02-25", "2024-03-08", "1h")
    raw = make_ohlcv(idx, start_price=5000, vol=0.0008, seed=3)
    ts = raw.index[raw.index >= pd.Timestamp("2024-03-07 10:00", tz="America/New_York")][0]
    pos = raw.index.get_loc(ts)
    for c in ("open", "high", "low", "close"):
        raw.iloc[pos:, raw.columns.get_loc(c)] *= 1.012
    md = clean_md(settings, raw.iloc[: pos + 1], symbol="ES=F")
    assert md.frame["flag_roll_suspect"].iloc[-1]
    d = ExecutionValidator(settings).review(long_signal(md), md, ACCOUNT)
    assert d.verdict == Verdict.REJECT and "flag_roll_suspect" in d.reason


def test_rejects_stale_signal_bar(settings):
    md = clean_md(settings, equity_hourly(session_for("SPY", settings)))
    old = md.window(end=md.frame.index[-5])
    sig = long_signal(old)
    d = ExecutionValidator(settings).review(sig, md, ACCOUNT)
    assert d.verdict == Verdict.REJECT and "not the latest bar" in d.reason


def test_consensus_rules():
    eng = ConsensusEngine(required_agents={"signal_agent", "risk_agent", "execution_validator"})
    ok = [AgentDecision(agent="signal_agent", signal_id="s", verdict=Verdict.APPROVE),
          RiskDecision(agent="risk_agent", signal_id="s", verdict=Verdict.APPROVE, quantity=2),
          AgentDecision(agent="execution_validator", signal_id="s", verdict=Verdict.APPROVE)]
    r = eng.decide("s", ok)
    assert r.approved and r.quantity == 2
    veto = ok[:2] + [AgentDecision(agent="execution_validator", signal_id="s", verdict=Verdict.REJECT,
                                   reason="DATA QUALITY WARNING")]
    assert not eng.decide("s", veto).approved
    assert not eng.decide("s", ok[:2]).approved  # missing agent
    zero = [ok[0], RiskDecision(agent="risk_agent", signal_id="s", verdict=Verdict.APPROVE, quantity=0), ok[2]]
    assert not eng.decide("s", zero).approved
    assert not eng.decide("other", ok).approved


class FakeHttp:
    def __init__(self, status=204):
        self.status = status
        self.posts = []

    def post(self, url, json, timeout):
        self.posts.append((url, json))
        return type("R", (), {"status_code": self.status})()


def test_discord_disabled_by_default(settings):
    http = FakeHttp()
    assert DiscordNotifier(settings.discord, http).send("hi") is False
    assert http.posts == []


def test_discord_dry_run_and_send(settings, monkeypatch):
    http = FakeHttp()
    dry = settings.discord.model_copy(update={"enabled": True, "dry_run": True})
    assert DiscordNotifier(dry, http).send("hi") and http.posts == []
    live = settings.discord.model_copy(update={"enabled": True, "dry_run": False})
    monkeypatch.delenv("DISCORD_WEBHOOK_URL", raising=False)
    assert DiscordNotifier(live, http).send("hi") is False  # no webhook configured
    monkeypatch.setenv("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/123/abc-DEF")
    assert DiscordNotifier(live, http).send("x" * 5000)
    url, payload = http.posts[0]
    assert payload["content"].startswith("**[PAPER / SIMULATION]**") and len(payload["content"]) == 2000


def test_discord_errors_never_raise(settings, monkeypatch):
    class Boom:
        def post(self, *a, **k):
            raise ConnectionError("down")

    monkeypatch.setenv("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/123/abc-DEF")
    live = settings.discord.model_copy(update={"enabled": True, "dry_run": False, "backoff_seconds": 0.0})
    assert DiscordNotifier(live, Boom()).send("hi") is False


def test_formatters(settings):
    md = clean_md(settings, equity_hourly(session_for("SPY", settings)))
    assert "enter_long" in format_signal(long_signal(md, reason="test"))
    assert "OK" in format_quality(md.report)
