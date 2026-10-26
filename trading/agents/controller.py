"""Consensus controller: the only path from a strategy signal to a paper order.

For every closed bar of every symbol it:

1. checks the strategy has not been modified while running,
2. maintains existing paper orders (cancels pending entries the strategy
   invalidated; closes positions before the no-trading zone),
3. lets the paper broker process the bar (fills, stops, targets),
4. runs AGENT 1 (signal analyst); only on APPROVE runs AGENT 2 (risk
   manager); only on APPROVE builds the paper order and runs AGENT 3
   (execution validator),
5. asks the consensus engine: PAPER TRADE APPROVED only if all three
   approved. One rejection = NO TRADE,
6. submits the order to the broker together with the consensus result (the
   broker refuses orders without an approving consensus),
7. writes the full audit record, including every rejected opportunity.

Agents hold no reference to the broker, so they cannot place orders.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Callable, Sequence

import pandas as pd

from trading.agents.common import bar_close, code_fingerprint, data_age, params_hash
from trading.agents.consensus import ConsensusEngine
from trading.agents.risk_manager import RiskManager
from trading.agents.signal_analyst import POSITION_REASONS, SignalAnalyst
from trading.config.settings import Settings
from trading.core.log import get_logger, log_event
from trading.core.schemas import (
    AgentDecision,
    Candle,
    ConsensusResult,
    MarketData,
    OrderStatus,
    OrderType,
    PaperOrder,
    Side,
    SignalAction,
    Verdict,
    new_id,
    utcnow,
)
from trading.data.instruments import interval_delta
from trading.database.store import Database
from trading.execution.fills import FillConfig, FillModel
from trading.execution.order_validator import PaperOrderValidator
from trading.paper_trading.engine import REQUIRED_AGENTS, PaperBroker
from trading.strategies.original_youtube.instruments import instrument_spec
from trading.strategies.original_youtube.strategy import OriginalYoutubeStrategy, SetupStatus, news_mask, no_trade_mask

logger = get_logger("agents.controller")
APPROVED = "PAPER_TRADE_APPROVED"
NO_TRADE = "NO_TRADE"


class StrategyModifiedError(RuntimeError):
    pass


def fill_models_from_settings(settings: Settings, symbols: Sequence[str]) -> dict[str, FillModel]:
    """The same simulated costs the backtester uses, in broker units."""
    out = {}
    for sym in symbols:
        spec = instrument_spec(sym)
        c = settings.backtest.costs.for_symbol(sym, spec.kind)
        per_unit = c.commission_per_unit_side / c.lot_size if spec.kind == "forex" else c.commission_per_unit_side
        out[sym] = FillModel(spec.unit, FillConfig(spread_ticks=c.spread_ticks, slippage_ticks=c.slippage_ticks,
                                                   limit_through_ticks=c.limit_through_ticks,
                                                   commission_per_unit_side=per_unit))
    return out


def market_snapshot(md: MarketData, now: pd.Timestamp, bars: int = 10) -> dict[str, Any]:
    df = md.frame
    cols = [c for c in ("open", "high", "low", "close", "volume", "flag_any") if c in df.columns]
    tail = df[cols].tail(bars)
    return {
        "symbol": md.symbol, "interval": md.interval, "source": md.source, "rows": len(df),
        "latest_bar": str(df.index[-1]) if len(df) else None,
        "latest_bar_close": str(bar_close(md)) if len(df) else None,
        "now": str(now), "data_age_seconds": data_age(md, now).total_seconds() if len(df) else None,
        "data_quality": md.report.status.value if md.report else "UNVALIDATED",
        "data_issues": [{"code": i.code, "severity": i.severity.value, "scope": i.scope.value, "count": i.count}
                        for i in md.report.issues] if md.report else [],
        "recent_bars": [{"time": str(t), **{k: (bool(v) if k == "flag_any" else float(v)) for k, v in r.items()}}
                        for t, r in tail.iterrows()],
    }


class DecisionController:
    def __init__(self, settings: Settings, strategy: OriginalYoutubeStrategy, broker: PaperBroker,
                 db: Database | None = None, clock: Callable[[], datetime] | None = None) -> None:
        if not broker.require_consensus:
            raise ValueError("the controller needs a broker that enforces consensus")
        self.settings = settings
        self.strategy = strategy
        self.broker = broker
        self.db = db
        self.clock = clock
        self.signal_analyst = SignalAnalyst(strategy)
        self.risk_manager = RiskManager(settings)
        self.execution_validator = PaperOrderValidator(settings, strategy.name)
        self.consensus = ConsensusEngine(required_agents=set(REQUIRED_AGENTS))
        self._params_hash = params_hash(strategy.params)
        self.code_version = code_fingerprint(strategy.params)
        self._last_bar: dict[str, pd.Timestamp] = {}
        self.approved_setup_keys: set[str] = set()
        if db is not None:
            past = db.evaluations()
            self._check_same_version(past)
            self.approved_setup_keys = {e["agents"]["signal_analyst"]["output"]["setup_key"]
                                        for e in past if e["outcome"] == APPROVED}
            # Restart safety: never let the broker process the same bar twice.
            for e in past:
                if e.get("broker_processed"):
                    self._last_bar[e["symbol"]] = pd.Timestamp(e["bar_time"])

    def _check_same_version(self, past: list[dict]) -> None:
        """A forward-test record belongs to exactly one version of the code and parameters.

        If this database was written by different code, continuing it would mix two systems
        in one track record, so we refuse; start a new record (a new database path) instead."""
        versions = {e.get("strategy_code_version") for e in past if "strategy_params_hash" in e}
        stale = versions - {self.code_version}
        if stale:
            raise StrategyModifiedError(
                f"this paper record was produced by code/parameter version(s) {sorted(map(str, stale))}, "
                f"but the running version is {self.code_version}. A changed strategy is a NEW experimental "
                f"version: start a new paper record (point [database] path at a new file) instead of "
                f"continuing the old one.")

    # ----------------------------------------------------------------- main entry
    def step(self, md: MarketData, now: pd.Timestamp | None = None, news_events: Sequence = ()) -> dict[str, Any]:
        """Evaluate one bar. With a database, everything the bar changes (orders, fills,
        positions, account snapshot, audit record) is committed in ONE transaction; if
        anything fails, the database and the in-memory state go back to the previous bar."""
        if self.db is None:
            return self._step(md, now, news_events)
        last_bar, keys = dict(self._last_bar), set(self.approved_setup_keys)
        try:
            with self.db.transaction():
                return self._step(md, now, news_events)
        except BaseException:
            self._last_bar, self.approved_setup_keys = last_bar, keys
            if self.broker.db is self.db:
                self.broker.restore()
            raise

    def _step(self, md: MarketData, now: pd.Timestamp | None, news_events: Sequence) -> dict[str, Any]:
        if params_hash(self.strategy.params) != self._params_hash:
            raise StrategyModifiedError("strategy parameters changed while the decision system was running")
        if now is None:
            now = pd.Timestamp(self.clock()) if self.clock else (bar_close(md) if len(md.frame) else
                                                                 pd.Timestamp(utcnow()))
        now = pd.Timestamp(now)
        now = now.tz_localize("UTC") if now.tzinfo is None else now
        eid = new_id("eval")
        record: dict[str, Any] = {
            "id": eid, "created_at": utcnow().isoformat(), "now": str(now), "symbol": md.symbol,
            "interval": md.interval, "strategy": self.strategy.name,
            "strategy_version": self.strategy.definition.version, "strategy_params_hash": self._params_hash,
            "strategy_code_version": self.code_version,
            "bar_time": str(md.frame.index[-1]) if len(md.frame) else str(now),
            "maintenance": [], "broker_events": [], "stage": "signal_analyst",
        }
        record["market_state"] = market_snapshot(md, now) if len(md.frame) else {"rows": 0}

        # Agent 1 (also provides the scan used for order maintenance)
        fm = self.broker.fill_models.get(md.symbol)
        analysis, signal, scan, state = self.signal_analyst.analyze(md, eid, news_events,
                                                                    fill_config=fm.config if fm else None)
        record["strategy_state"] = state
        record["agents"] = {"signal_analyst": {
            "input": {"market_data": f"{md.symbol} {md.interval}, {len(md.frame)} validated bars",
                      "strategy": self.strategy.name, "params_hash": self._params_hash},
            "output": analysis.model_dump(mode="json")}}

        # Maintenance + broker bar processing, once per new bar
        bar_ok = bool(analysis.conditions_checked) and analysis.conditions_checked[0].passed  # OHLCV present
        new_bar = bar_ok and self._last_bar.get(md.symbol) != md.frame.index[-1]
        if not bar_ok:
            record["maintenance"].append({"action": "none", "reason": "latest bar missing or incomplete; "
                                          "broker did not process it"})
        elif new_bar:
            self._zone_cancel(md, record, news_events)
            if scan is not None:
                self._maintain(md, scan, record)
            c = md.frame.iloc[-1]
            candle = Candle(timestamp=md.frame.index[-1].to_pydatetime(), open=c["open"], high=c["high"],
                            low=c["low"], close=c["close"], volume=c["volume"])
            for f in self.broker.on_bar(md.symbol, candle):
                record["broker_events"].append({"type": "fill", "fill": f.model_dump(mode="json")})
            self._zone_exit(md, record, news_events)
            self._last_bar[md.symbol] = md.frame.index[-1]
        else:
            record["maintenance"].append({"action": "none", "reason": "bar already processed by the broker"})
        record["broker_processed"] = bool(new_bar)

        decisions: list[AgentDecision] = []
        signal_id = signal.id if signal else eid
        decisions.append(AgentDecision(agent=self.signal_analyst.name, signal_id=signal_id,
                                       verdict=analysis.decision, reason=analysis.reason,
                                       details=analysis.model_dump(mode="json")))
        order: PaperOrder | None = None
        if signal is None:
            record["agents"]["risk_manager"] = {"run": False, "reason": "signal analyst rejected"}
            record["agents"]["execution_validator"] = {"run": False, "reason": "signal analyst rejected"}
        else:
            record["stage"] = "risk_manager"
            risk, ctx = self.risk_manager.review(signal, analysis, md, self.broker.account_state(),
                                                 dict(self.broker.positions), list(self.broker.pending.values()),
                                                 list(self.broker.closed_trades), now)
            decisions.append(risk)
            record["agents"]["risk_manager"] = {"input": {"signal": signal.model_dump(mode="json"), **ctx},
                                                "output": risk.model_dump(mode="json")}
            if risk.verdict != Verdict.APPROVE:
                record["agents"]["execution_validator"] = {"run": False, "reason": "risk manager rejected"}
            else:
                record["stage"] = "execution_validator"
                order = self.build_order(signal, risk.quantity)
                active = list(self.broker.pending.values())
                ev = self.execution_validator.review(order, signal, risk, md, now, active, self.approved_setup_keys)
                decisions.append(ev)
                record["agents"]["execution_validator"] = {
                    "input": {"order": order.model_dump(mode="json"), "signal_id": signal.id,
                              "risk_quantity": risk.quantity, "active_orders": [o.id for o in active]},
                    "output": ev.model_dump(mode="json")}

        result = self.consensus.decide(signal_id, decisions)
        record["consensus"] = result.model_dump(mode="json")
        record["outcome"] = APPROVED if result.approved else NO_TRADE
        record["signal_id"] = signal.id if signal else None
        record["order_id"] = None
        if result.approved and order is not None:
            self.submit(order, result)
            record["order_id"] = order.id
            self.approved_setup_keys.add(order.setup_key)
        record["account_after"] = self.broker.account_state().model_dump(mode="json")
        self._store(record, signal, decisions, result)
        log_event(logger, "decision.evaluated", symbol=md.symbol, bar=record["bar_time"], outcome=record["outcome"],
                  reason=result.reason, order_id=record["order_id"])
        return record

    # ----------------------------------------------------------------- helpers
    def build_order(self, signal, quantity: float) -> PaperOrder:
        limit = signal.entry_type == OrderType.LIMIT
        return PaperOrder(
            symbol=signal.symbol, side=Side.BUY if signal.action == SignalAction.ENTER_LONG else Side.SELL,
            quantity=quantity, order_type=signal.entry_type, limit_price=signal.price if limit else None,
            stop_loss=signal.stop, take_profit=signal.target, signal_id=signal.id, strategy=signal.strategy,
            setup_key=signal.setup_key, expires_after_bars=signal.expires_after_bars,
            target_rr=None if limit else signal.indicators.get("target_rr"),
            target_level=None if limit else signal.indicators.get("target_level"),
            created_at=signal.timestamp, reason=signal.reason,
        )

    def submit(self, order: PaperOrder, consensus: ConsensusResult) -> PaperOrder:
        if not consensus.approved:  # defence in depth; the broker checks again
            raise RuntimeError("refusing to submit without an approving consensus")
        return self.broker.submit(order, consensus)

    def _maintain(self, md: MarketData, scan, record: dict) -> None:
        """Cancel pending paper entries the strategy has invalidated as of this bar."""
        by_key = {}
        for s in scan.setups:
            by_key[f"{md.symbol}|{md.interval}|{pd.Timestamp(s.nowick_time).isoformat()}|{s.direction}"] = s
        for order in [o for o in self.broker.pending.values() if o.symbol == md.symbol]:
            s = by_key.get(order.setup_key or "")
            if s is None or s.status != SetupStatus.CANCELLED:
                continue
            if any(r in s.reason for r in POSITION_REASONS):
                continue  # the scanner's own position simulation, not a market condition
            self.broker.cancel(order.id, f"strategy invalidated the setup: {s.reason}")
            record["maintenance"].append({"action": "cancel_order", "order_id": order.id, "reason": s.reason})

    def _blocked(self, ts: pd.Timestamp, md: MarketData, news_events: Sequence) -> bool:
        p = self.strategy.params
        at = pd.DatetimeIndex([ts])
        buffer = p.futures_zone_buffer_minutes if instrument_spec(md.symbol).kind == "futures" else 0
        return bool(no_trade_mask(at, p, buffer)[0] or news_mask(at, news_events, p.news_blackout_minutes,
                                                                 interval_delta(md.interval))[0])

    def _zone_cancel(self, md: MarketData, record: dict, news_events: Sequence) -> None:
        """Pending entries never fill inside the no-trading zone / news window (audit fix H8).

        Mirrors the strategy's own rule; done here directly so it holds even when the strategy
        scan has no matching pending setup (e.g. one recorded as 'already in a position')."""
        if not self._blocked(md.frame.index[-1], md, news_events):
            return
        for order in [o for o in self.broker.pending.values() if o.symbol == md.symbol and o.setup_key]:
            reason = "reached the no-trading zone / news window before filling"
            self.broker.cancel(order.id, reason, md.frame.index[-1].to_pydatetime())
            record["maintenance"].append({"action": "cancel_order", "order_id": order.id, "reason": reason})

    def _zone_exit(self, md: MarketData, record: dict, news_events: Sequence) -> None:
        pos = self.broker.positions.get(md.symbol)
        if pos is None or not pos.is_open:
            return
        if self._blocked(md.frame.index[-1] + interval_delta(md.interval), md, news_events):
            fill = self.broker.close_position(md.symbol, float(md.frame["close"].iat[-1]),
                                              md.frame.index[-1].to_pydatetime(), "closed before no-trading zone/news")
            if fill:
                record["maintenance"].append({"action": "close_position", "reason": "next bar is in the "
                                              "no-trading zone / news window", "fill": fill.model_dump(mode="json")})

    def _store(self, record: dict, signal, decisions: list[AgentDecision], result: ConsensusResult) -> None:
        if self.db is None:
            return
        with self.db.transaction():
            if signal is not None:
                self.db.save_signal(signal)
                for d in decisions:
                    self.db.save_decision(d)
                self.db.save_consensus(result)
            self.db.save_evaluation(record)

    # ----------------------------------------------------------------- replay
    def replay(self, md: MarketData, start: int = 0, news_events: Sequence = ()) -> list[dict]:
        """Evaluate bar by bar as if live: each step sees only bars up to that point."""
        out = []
        for j in range(max(start, 1), len(md.frame)):
            window = md.window(end=md.frame.index[j])
            out.append(self.step(window, now=bar_close(window), news_events=news_events))
        return out
