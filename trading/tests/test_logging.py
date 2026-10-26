import json
import logging

from trading.core.log import get_logger, log_event
from trading.core.schemas import PaperOrder, Side


def test_structured_json_log(settings):
    logger = get_logger("test")
    order = PaperOrder(symbol="ES=F", side=Side.BUY, quantity=1)
    log_event(logger, "paper.order_submitted", order=order, symbol="ES=F", name="clash-safe")
    for h in logging.getLogger("trading").handlers:
        h.flush()
    lines = (settings.log_dir / settings.logging.json_file).read_text().strip().splitlines()
    rec = json.loads(lines[-1])
    assert rec["event"] == "paper.order_submitted"
    assert rec["order"]["id"] == order.id and rec["symbol"] == "ES=F"
    assert rec["name_"] == "clash-safe"  # reserved LogRecord field renamed, not dropped
    assert rec["ts"].endswith("+00:00")


def test_pipeline_decisions_are_logged(settings):
    from trading.data.instruments import session_for
    from trading.data.pipeline import MarketDataPipeline
    from trading.data.sources import YFinanceSource
    from trading.tests.conftest import FakeHistory
    from trading.tests.factories import equity_hourly

    fake = FakeHistory(equity_hourly(session_for("SPY", settings), yf_columns=True))
    MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=fake)).load(
        "SPY", interval="1h", start="2024-03-04", end="2024-03-16")
    for h in logging.getLogger("trading").handlers:
        h.flush()
    events = [json.loads(l)["event"] for l in
              (settings.log_dir / settings.logging.json_file).read_text().splitlines()]
    for e in ("market_data.request", "market_data.received", "cache.raw_saved", "data.validated",
              "market_data.ready"):
        assert e in events
