"""Backtest vs paper-engine equivalence check. PAPER / SIMULATION only.

Feeds the SAME validated bars to
  (a) the backtest scanner with the backtest cost model, and
  (b) the live decision path: DecisionController.replay -> three agents ->
      consensus -> PaperBroker with the same fill models, one bar at a time,
and compares every trade (entry time, direction, entry price, exit time, exit
price). Risk limits are opened wide (huge virtual balance, no daily loss limit)
so that only strategy and execution logic are compared, not account size.

    python -m trading.backtests.equivalence 3 7 11
"""

from __future__ import annotations

import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

from trading.agents.controller import DecisionController, fill_models_from_settings
from trading.config import load_settings
from trading.core.schemas import AssetClass, MarketData
from trading.data.instruments import session_for
from trading.data.validation import DataValidator
from trading.database import Database
from trading.execution.fills import FillConfig
from trading.paper_trading import PaperBroker
from trading.strategies import get_strategy
from trading.strategies.original_youtube import default_definition


@dataclass
class Comparison:
    backtest: list[tuple] = field(default_factory=list)
    paper: list[tuple] = field(default_factory=list)
    rejections: dict[str, int] = field(default_factory=dict)

    @property
    def matched(self) -> int:
        return len(set(self.backtest) & set(self.paper))

    @property
    def identical(self) -> bool:
        return sorted(self.backtest) == sorted(self.paper)


def _key(entry_time, direction, entry, exit_time, exit_price) -> tuple:
    ts = lambda t: pd.Timestamp(t).tz_convert("UTC").isoformat()  # noqa: E731
    return ts(entry_time), direction, round(float(entry), 6), ts(exit_time), round(float(exit_price), 6)


def compare(raw: pd.DataFrame, symbol: str = "ES=F", interval: str = "5m") -> Comparison:
    settings = load_settings(environ={}, root=Path(tempfile.mkdtemp()), overrides={
        "logging": {"console": False}, "account": {"starting_balance": 1e8},
        "risk": {"max_risk_per_trade_pct": 1.0, "max_daily_loss_pct": 100.0}})
    v = DataValidator(settings)
    clean, report = v.validate(raw, v.context_for(symbol, interval))
    md = MarketData(symbol=symbol, interval=interval, timezone="America/New_York", asset_class=AssetClass.FUTURES,
                    frame=clean, is_clean=True, report=report)
    fm = fill_models_from_settings(settings, [symbol])
    strategy = get_strategy(default_definition([symbol], interval))
    out = Comparison()
    cfg: FillConfig = fm[symbol].config
    for s in strategy.scan(md, fill_config=cfg).setups:
        if s.fill_index is not None and s.exit_index is not None and "end of the data" not in s.reason:
            out.backtest.append(_key(s.fill_time, s.direction, s.fill_price, s.exit_time, s.exit_price))
    db = Database(":memory:")
    broker = PaperBroker(settings, db, fill_models=fm)
    records = DecisionController(settings, strategy, broker, db).replay(md, start=1)
    for t in db.trades():
        out.paper.append(_key(t.entry_time, t.side.value, t.entry_price, t.exit_time, t.exit_price))
    for r in records:
        if r["outcome"] == "NO_TRADE" and r["agents"]["signal_analyst"]["output"]["decision"] == "approve":
            k = r["consensus"]["reason"].split(":")[0] + ":" + r["consensus"]["reason"].split(":")[1]
            out.rejections[k] = out.rejections.get(k, 0) + 1
    return out


def main(seeds: list[int]) -> int:
    from trading.tests.factories import random_futures_bars

    settings = load_settings(environ={}, root=Path(tempfile.mkdtemp()), overrides={"logging": {"console": False}})
    ok = True
    for seed in seeds:
        raw = random_futures_bars(session_for("ES=F", settings), "2024-02-05", "2024-02-08", seed=seed,
                                  yf_columns=False)
        c = compare(raw)
        ok &= c.identical
        print(f"seed {seed}: backtest {len(c.backtest)} trades, paper {len(c.paper)}, matched {c.matched}"
              f" -> {'IDENTICAL' if c.identical else 'DIFFERENT'}")
        for k in sorted(set(c.backtest) - set(c.paper)):
            print("  backtest only:", k)
        for k in sorted(set(c.paper) - set(c.backtest)):
            print("  paper only:   ", k)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main([int(a) for a in sys.argv[1:]] or [3]))
