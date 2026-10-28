"""Discord notifications for the PAPER / SIMULATION engine, tested with simulated events.

No real network calls: a fake HTTP client stands in for Discord.
"""

import logging
import threading
import time

import pytest

from trading.notifications.discord import DiscordNotifier, format_trade_closed, trade_result
from trading.notifications.paper_events import PaperEventNotifier
from trading.paper_trading.runner import PaperTradingEngine
from trading.tests.test_paper_engine import DROP, RALLY, SETUP, TAP, Feed, close_of, raw
from trading.data.pipeline import MarketDataPipeline
from trading.data.sources import YFinanceSource
from trading.database import Database

WEBHOOK = "https://discord.com/api/webhooks/1234567890/SuperSecretToken-xyz"


class FakeHttp:
    def __init__(self, statuses=None, error=None, delay=0.0):
        self.posts, self.statuses, self.error, self.delay = [], list(statuses or []), error, delay

    def post(self, url, json, timeout):
        time.sleep(self.delay)
        self.posts.append((url, json))
        if self.error:
            raise self.error
        status = self.statuses.pop(0) if self.statuses else 204
        body = {"retry_after": 0.0} if status == 429 else {}
        return type("R", (), {"status_code": status, "json": lambda self: body})()

    @property
    def contents(self):
        return [p["content"] for _, p in self.posts]


def live(settings, **kw):
    return settings.discord.model_copy(update={"enabled": True, "dry_run": False, "backoff_seconds": 0.0, **kw})


@pytest.fixture
def webhook(monkeypatch):
    monkeypatch.setenv("DISCORD_WEBHOOK_URL", WEBHOOK)


def engine_with(settings, feed, http, **discord):
    cfg = live(settings, **discord)
    notifier = PaperEventNotifier(cfg, DiscordNotifier(cfg, http))  # synchronous for deterministic tests
    pipe = MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=feed))
    return PaperTradingEngine(settings, ["ES=F"], "5m", db=Database(settings.database_path), pipeline=pipe,
                              notifier=notifier)


def run(engine, feed):
    engine.run_once(now=close_of(feed.df, SETUP))
    while feed.upto < len(feed.df) - 1:
        feed.upto += 1
        engine.run_once(now=close_of(feed.df, feed.upto))


# ------------------------------------------------------------------ the four messages


def test_full_trade_produces_signal_decision_opened_closed(settings, webhook):
    http, feed = FakeHttp(), Feed(raw([TAP] + RALLY))
    engine = engine_with(settings, feed, http)
    run(engine, feed)
    msgs = http.contents
    kinds = [next(k for k in ("PAPER SIGNAL DETECTED", "AGENT DECISION", "PAPER TRADE OPENED", "PAPER TRADE CLOSED")
                  if k in m) for m in msgs]
    assert kinds == ["PAPER SIGNAL DETECTED", "AGENT DECISION", "PAPER TRADE OPENED", "PAPER TRADE CLOSED"]
    assert all(m.startswith("**[PAPER / SIMULATION]**") for m in msgs)
    sig, dec, opened, closed = msgs
    for field in ("Strategy: ORIGINAL_YOUTUBE_STRATEGY", "Symbol: ES=F", "Direction: LONG", "Time: 2024-02-13 10:40 ET",
                  "Setup: grandma"):
        assert field in sig
    assert "Signal Agent: ✓" in dec and "Risk Agent: ✓" in dec and "Execution Agent: ✓" in dec
    assert "Consensus: **APPROVED**" in dec and "Reason" not in dec
    order = engine.db.orders()[0]
    for field in ("Simulated Entry: 108.00", f"Stop: {order.stop_loss:,.2f}", f"Target: {order.take_profit:,.2f}",
                  "Size: 1", "Virtual Balance: $"):
        assert field in opened
    trade = engine.db.trades()[0]
    assert "**WIN**" in closed and "Entry: 108.00" in closed and f"Exit: {trade.exit_price:,.2f}" in closed
    assert f"Updated virtual balance: ${engine.broker.cash:,.2f}" in closed and "Exit reason: target" in closed


def test_losing_trade_message(settings, webhook):
    http, feed = FakeHttp(), Feed(raw([TAP] + DROP))
    run(engine_with(settings, feed, http), feed)
    closed = next(m for m in http.contents if "PAPER TRADE CLOSED" in m)
    assert "**LOSS**" in closed and "Exit reason: stop" in closed and "P&L: -$" in closed


def test_rejected_consensus_includes_the_reason(settings, webhook, tmp_path):
    from trading.config.settings import load_settings

    small = load_settings(environ={}, root=tmp_path, overrides={"logging": {"console": False}})  # $1,000 default
    http, feed = FakeHttp(), Feed(raw([TAP] + RALLY))
    engine = engine_with(small, feed, http)
    engine.run_once(now=close_of(feed.df, SETUP))
    dec = next(m for m in http.contents if "AGENT DECISION" in m)
    assert "Signal Agent: ✓" in dec and "Risk Agent: ✕" in dec and "Execution Agent: – (not run)" in dec
    assert "Consensus: **REJECTED**" in dec and "position size rounds to zero" in dec
    assert not any("PAPER TRADE OPENED" in m for m in http.contents)


def test_bars_without_a_signal_send_nothing(settings, webhook):
    http, feed = FakeHttp(), Feed(raw([TAP] + RALLY))
    feed.upto = SETUP - 1
    engine = engine_with(settings, feed, http)
    engine.run_once(now=close_of(feed.df, SETUP - 1))  # no no-wick on this bar
    assert http.posts == []


def test_breakeven_classification():
    assert (trade_result(0.0), trade_result(0.004), trade_result(12.0), trade_result(-1.0)) == \
           ("BREAKEVEN", "BREAKEVEN", "WIN", "LOSS")


# ------------------------------------------------------------------ reliability


def test_discord_down_never_stops_the_simulator(settings, webhook, caplog):
    http, feed = FakeHttp(error=ConnectionError("discord is down")), Feed(raw([TAP] + RALLY))
    engine = engine_with(settings, feed, http, max_attempts=3)
    with caplog.at_level(logging.WARNING, logger="trading"):
        run(engine, feed)  # must not raise
    (trade,) = engine.db.trades()
    assert trade.exit_reason.value == "target"  # the simulation completed normally
    assert len(http.posts) == 4 * 3  # every message retried 3 times
    assert engine.notifier.notifier.failed == 4
    assert any("discord.failed" in r.getMessage() for r in caplog.records)


def test_rate_limit_is_retried_then_delivered(settings, webhook):
    sleeps = []
    http = FakeHttp(statuses=[429, 500, 204])
    n = DiscordNotifier(live(settings, max_attempts=3, backoff_seconds=0.5), http, sleep=sleeps.append)
    assert n.send("hello") is True
    assert len(http.posts) == 3 and sleeps == [0.0, 1.0]  # Discord's retry_after, then exponential backoff
    assert n.sent == 1


def test_client_errors_are_not_retried(settings, webhook):
    http = FakeHttp(statuses=[401])
    n = DiscordNotifier(live(settings, max_attempts=5), http, sleep=lambda s: None)
    assert n.send("hello") is False and len(http.posts) == 1


def test_background_mode_does_not_block_the_engine(settings, webhook):
    http = FakeHttp(delay=0.3)
    n = DiscordNotifier(live(settings), http, background=True)
    t0 = time.monotonic()
    for i in range(3):
        assert n.send(f"m{i}") is True
    assert time.monotonic() - t0 < 0.1  # queued, not sent inline
    n.close(timeout=5)
    assert len(http.posts) == 3


def test_full_queue_drops_and_logs_instead_of_blocking(settings, webhook):
    release = threading.Event()

    class Stuck(FakeHttp):
        def post(self, url, json, timeout):
            release.wait(2)
            return super().post(url, json, timeout)

    n = DiscordNotifier(live(settings, queue_size=1), Stuck(), background=True)
    results = [n.send(f"m{i}") for i in range(5)]
    assert results.count(False) >= 3 and n.dropped >= 3
    release.set()
    n.close(timeout=5)


def test_notifier_exceptions_are_contained(settings, webhook):
    class Exploding(PaperEventNotifier):
        def _notify(self, *a, **k):
            raise RuntimeError("formatter bug")

    feed = Feed(raw([TAP] + RALLY))
    cfg = live(settings)
    pipe = MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=feed))
    engine = PaperTradingEngine(settings, ["ES=F"], "5m", db=Database(settings.database_path), pipeline=pipe,
                                notifier=Exploding(cfg, DiscordNotifier(cfg, FakeHttp())))
    run(engine, feed)
    assert len(engine.db.trades()) == 1


# ------------------------------------------------------------------ security


def test_webhook_secret_never_appears_in_logs_or_messages(settings, webhook, caplog):
    err = ConnectionError(f"HTTPSConnectionPool: Max retries exceeded with url: {WEBHOOK}")
    http, feed = FakeHttp(error=err), Feed(raw([TAP] + RALLY))
    engine = engine_with(settings, feed, http, max_attempts=2)
    with caplog.at_level(logging.DEBUG, logger="trading"):
        run(engine, feed)
    log_text = " ".join(f"{r.getMessage()} {r.__dict__}" for r in caplog.records)
    log_file = (settings.log_dir / settings.logging.json_file).read_text()
    for text in (log_text, log_file, *http.contents):
        assert "SuperSecretToken" not in text and WEBHOOK not in text
    assert "[REDACTED" in log_text


def test_non_discord_url_is_refused(settings, monkeypatch):
    monkeypatch.setenv("DISCORD_WEBHOOK_URL", "https://attacker.example/collect")
    http = FakeHttp()
    assert DiscordNotifier(live(settings), http).send("x") is False
    assert http.posts == []


def test_mentions_are_disabled_and_disabled_by_default(settings, webhook):
    http = FakeHttp()
    DiscordNotifier(live(settings), http).send("@everyone look")
    assert http.posts[0][1]["allowed_mentions"] == {"parse": []}
    off = FakeHttp()
    assert DiscordNotifier(settings.discord, off).send("x") is False and off.posts == []  # default: disabled


def test_secret_is_not_in_the_config_file():
    from trading.config.settings import DEFAULT_CONFIG_PATH

    text = DEFAULT_CONFIG_PATH.read_text()
    assert "discord.com/api/webhooks" not in text and 'webhook_env_var = "DISCORD_WEBHOOK_URL"' in text
