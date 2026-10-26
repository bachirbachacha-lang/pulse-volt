"""Dashboard: serves the existing PAPER / SIMULATION state, read-only."""

import hashlib
import json
import sqlite3
import threading
import urllib.error
import urllib.request

import pytest

from trading.dashboard.data import StateReader
from trading.dashboard.server import make_server
from trading.tests.test_paper_engine import RALLY, SETUP, TAP, Feed, close_of, make_engine, raw, run_through


@pytest.fixture
def state(settings):
    feed = Feed(raw([TAP] + RALLY))
    engine = make_engine(settings, feed)
    engine.run_once(now=close_of(feed.df, SETUP))
    run_through(engine, feed, len(feed.df) - 1)  # one winning paper trade
    return engine


@pytest.fixture
def api(settings, state):
    srv = make_server(settings, "127.0.0.1", 0)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    base = f"http://127.0.0.1:{srv.server_address[1]}"

    def get(path):
        with urllib.request.urlopen(base + path) as r:
            body = r.read()
            return json.loads(body) if r.headers.get_content_type() == "application/json" else body.decode()
    yield get, base
    srv.shutdown()
    srv.server_close()


def test_page_is_labelled_paper_simulation(api):
    get, _ = api
    html = get("/")
    assert "PAPER / SIMULATION" in html and "/static/app.js" in html
    assert "PAPER / SIMULATION" in get("/static/app.js")  # served, not fetched from a CDN


def test_account_matches_the_engine_state(api, state):
    get, _ = api
    ov = get("/api/overview")
    a, acct = ov["account"], state.broker.account_state()
    assert ov["label"] == a["label"] == "PAPER / SIMULATION"
    assert a["starting_balance"] == acct.starting_balance
    assert a["balance"] == pytest.approx(acct.cash) and a["equity"] == pytest.approx(acct.equity)
    trades = state.db.trades()
    assert a["total_trades"] == len(trades) == 1 and a["wins"] == 1 and a["win_rate"] == 1.0
    assert a["avg_win"] == pytest.approx(trades[0].net_pnl) and a["avg_loss"] is None
    assert a["profit_factor"] is None and a["profit_factor_infinite"] is True
    assert a["total_pnl"] == pytest.approx(acct.equity - acct.starting_balance)


def test_trade_history_and_inspector(api, state):
    get, _ = api
    (t,) = get("/api/trades")["trades"]
    db_trade = state.db.trades()[0]
    assert t["id"] == db_trade.id and t["net_pnl"] == pytest.approx(db_trade.net_pnl)
    assert t["strategy"] == "ORIGINAL_YOUTUBE_STRATEGY" and t["result"] == "win" and t["exit_reason"] == "target"
    d = get(f"/api/trade/{t['id']}")
    assert d["signal"]["id"] == t["signal_id"]
    assert {o["status"] for o in d["orders"]} == {"filled"} and len(d["fills"]) == 2
    ev = d["evaluation"]
    assert ev["outcome"] == "PAPER_TRADE_APPROVED" and ev["agents"]["signal_analyst"]["output"]["conditions_checked"]
    assert d["chart"]["candles"] and any(s["id"] == t["signal_id"] for s in d["chart"]["signals"])


def test_decisions_show_every_agent_and_reason(api):
    get, _ = api
    decs = get("/api/decisions?symbol=ES=F&limit=50")["decisions"]
    approved = [d for d in decs if d["outcome"] == "PAPER_TRADE_APPROVED"]
    assert len(approved) == 1
    assert {approved[0][k]["verdict"] for k in ("signal", "risk", "execution")} == {"approve"}
    rejected = next(d for d in decs if d["outcome"] == "NO_TRADE")
    assert rejected["signal"]["verdict"] == "reject" and rejected["signal"]["reason"]
    assert rejected["risk"]["verdict"] == "not_run"
    full = get(f"/api/decision/{approved[0]['id']}")
    assert full["agents"]["risk_manager"]["output"]["details"]["checks"]


def test_market_uses_the_validated_cache_and_marks_signals_and_trades(api):
    get, _ = api
    m = get("/api/market?symbol=ES=F")
    assert m["data_quality"] in ("OK", "DATA QUALITY WARNING") and m["candles"]
    assert len(m["signals"]) == 1 and len(m["trades"]) == 1  # SIGNAL and FILLED trade kept apart
    assert m["setups"] and len(m["protective"]) == len(m["candles"])


def test_dashboard_is_read_only(api, settings):
    get, base = api
    before = hashlib.sha256(settings.database_path.read_bytes()).hexdigest()
    for path in ("/api/overview", "/api/trades", "/api/analytics", "/api/market?symbol=ES=F", "/api/decisions"):
        get(path)
    req = urllib.request.Request(base + "/api/overview", data=b"{}", method="POST")
    with pytest.raises(urllib.error.HTTPError) as e:
        urllib.request.urlopen(req)
    assert e.value.code == 405
    assert hashlib.sha256(settings.database_path.read_bytes()).hexdigest() == before
    conn = StateReader(settings)._conn()
    with pytest.raises(sqlite3.OperationalError):
        conn.execute("DELETE FROM closed_trades")


def test_empty_state_does_not_invent_anything(tmp_path):
    from trading.config.settings import load_settings

    s = load_settings(environ={}, root=tmp_path, overrides={"logging": {"console": False}})
    r = StateReader(s)
    a = r.account()
    assert a["has_state"] is False and a["total_trades"] == 0 and a["equity"] == s.account.starting_balance
    assert r.trades() == [] and r.positions() == [] and r.evaluations() == [] and r.latest_market("ES=F") is None
