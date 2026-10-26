"""Simulated (paper) broker. PAPER / SIMULATION - SIMULATED MONEY ONLY.

There is no code path to a real brokerage. Orders are filled against bar data
with configurable commission and adverse slippage:

* Market orders submitted after bar *t* closes fill at the **open of bar t+1**
  (never at a price the strategy could not have traded).
* Protective stop / take-profit levels on an open position are checked against
  each new bar's high/low. If both are touched in the same bar the **stop is
  assumed to fill first** (pessimistic). A bar that gaps through a level fills at
  the open, not at the level.

Accounting is margin-style for every asset: ``cash`` changes only by realised
P&L and commissions; ``equity = cash + unrealised P&L``.

Opening orders require an approved :class:`ConsensusResult` from the
three-agent decision system (signal analyst, risk manager, execution
validator). ``submit`` refuses anything else, so nothing can bypass the
consensus controller. Risk-reducing actions (cancelling a pending order,
closing a position before the no-trading zone) do not need consensus.

Optional per-symbol :class:`~trading.execution.fills.FillModel` objects apply
the same conservative fill rules as the backtester: limit orders need price to
trade through, a mid-bar limit fill never gets its target credited on the same
bar, and the stop wins any same-bar tie.
"""

from __future__ import annotations

from datetime import datetime

import pandas as pd

from trading.config.settings import Settings
from trading.core.log import get_logger, log_event
from trading.core.schemas import (
    AccountState,
    Candle,
    ClosedTrade,
    ExitReason,
    OrderStatus,
    OrderType,
    PaperFill,
    PaperOrder,
    PaperPosition,
    PositionSide,
    Side,
    Verdict,
    utcnow,
)
from trading.core.schemas import ConsensusResult

REQUIRED_AGENTS = ("signal_analyst", "risk_manager", "execution_validator")
from trading.core.seal import is_sealed
from trading.database.store import Database
from trading.execution.fills import FillModel

logger = get_logger("paper_trading")


class PaperTradingError(RuntimeError):
    pass


class PaperBroker:
    def __init__(self, settings: Settings, db: Database | None = None, *, restore: bool = True,
                 require_consensus: bool = True, fill_models: dict[str, FillModel] | None = None) -> None:
        if settings.mode != "paper":
            raise PaperTradingError("PaperBroker only runs in paper mode")
        self.settings = settings
        self.costs = settings.costs
        self.db = db
        self.starting_balance = settings.account.starting_balance
        self.cash = self.starting_balance
        self.realized_pnl = 0.0
        self.total_commission = 0.0
        self.trade_count = 0
        self.positions: dict[str, PaperPosition] = {}
        self.pending: dict[str, PaperOrder] = {}
        self.closed_trades: list[ClosedTrade] = []
        self.last_timestamp: datetime | None = None
        self.peak_equity = self.starting_balance
        self.require_consensus = require_consensus
        self.fill_models = fill_models or {}
        self._consumed_signals: set[str] = set()
        if db is not None and restore:
            self.restore()

    # --------------------------------------------------------------- persistence
    def restore(self) -> None:
        """Rebuild state from the database after a restart."""
        assert self.db is not None
        acct = self.db.latest_account()
        if acct is None:  # nothing stored yet: back to a fresh account
            self.starting_balance = self.settings.account.starting_balance
            self.cash = self.peak_equity = self.starting_balance
            self.realized_pnl = self.total_commission = 0.0
            self.trade_count = 0
            self.last_timestamp = None
        else:
            self.starting_balance = acct.starting_balance
            self.cash = acct.cash
            self.realized_pnl = acct.realized_pnl
            self.total_commission = acct.total_commission
            self.trade_count = acct.trade_count
            self.last_timestamp = acct.timestamp
            self.peak_equity = max(acct.peak_equity or acct.starting_balance, acct.cash)
        self.positions = {p.symbol: p for p in self.db.positions() if p.is_open}
        self.pending = {o.id: o for o in self.db.orders(status=OrderStatus.PENDING.value)}
        self.closed_trades = self.db.trades()
        log_event(
            logger,
            "paper.restored",
            cash=self.cash,
            open_positions=list(self.positions),
            pending_orders=len(self.pending),
            trade_count=self.trade_count,
        )

    def _persist(self, *, order: PaperOrder | None = None, fill: PaperFill | None = None,
                 position: PaperPosition | None = None, trade: ClosedTrade | None = None,
                 snapshot: bool = False) -> None:
        if self.db is None:
            return
        with self.db.transaction():
            if order:
                self.db.save_order(order)
            if fill:
                self.db.save_fill(fill)
            if position:
                self.db.save_position(position)
            if trade:
                self.db.save_trade(trade)
            if snapshot:
                self.db.save_account(self.account_state())

    # --------------------------------------------------------------- orders
    def submit(self, order: PaperOrder, consensus: ConsensusResult | None = None) -> PaperOrder:
        if order.order_type not in (OrderType.MARKET, OrderType.LIMIT):
            raise PaperTradingError("only market and limit orders are supported")
        if order.order_type == OrderType.LIMIT and order.limit_price is None:
            raise PaperTradingError("limit order without a limit price")
        if order.status != OrderStatus.PENDING:
            raise PaperTradingError("only pending orders can be submitted")
        if self.require_consensus:
            self._check_consensus(order, consensus)
            if order.signal_id in self._consumed_signals:
                raise PaperTradingError("order rejected: this consensus was already used for an order")
            self._consumed_signals.add(order.signal_id)
        self.pending[order.id] = order
        log_event(logger, "paper.order_submitted", order=order)
        self._persist(order=order)
        return order

    @staticmethod
    def _check_consensus(order: PaperOrder, consensus: ConsensusResult | None) -> None:
        if consensus is None:
            raise PaperTradingError("order rejected: no consensus result (orders must come from the controller)")
        if not consensus.approved:
            raise PaperTradingError(f"order rejected: consensus did not approve ({consensus.reason})")
        if order.signal_id is None or consensus.signal_id != order.signal_id:
            raise PaperTradingError("order rejected: consensus belongs to a different signal")
        votes = {d.agent: d.verdict for d in consensus.decisions if d.signal_id == consensus.signal_id}
        missing = [a for a in REQUIRED_AGENTS if votes.get(a) != Verdict.APPROVE]
        if missing:
            raise PaperTradingError(f"order rejected: no APPROVE from {missing}")
        if abs(consensus.quantity - order.quantity) > 1e-9:
            raise PaperTradingError("order rejected: quantity differs from the approved quantity")
        if not is_sealed(consensus):
            raise PaperTradingError("order rejected: consensus was not issued by the consensus engine")

    def cancel(self, order_id: str, reason: str = "", ts: datetime | None = None) -> PaperOrder:
        order = self.pending.pop(order_id)
        order.status = OrderStatus.CANCELLED
        order.reason = reason or order.reason
        order.cancelled_at = ts or self.last_timestamp or utcnow()
        log_event(logger, "paper.order_cancelled", order_id=order_id, reason=reason)
        self._persist(order=order)
        return order

    def _slipped(self, price: float, side: Side) -> tuple[float, float]:
        slip = price * self.costs.slippage_bps / 10_000 + self.costs.slippage_ticks * self.costs.tick_size
        return (price + slip if side == Side.BUY else price - slip), slip

    def _commission(self, qty: float) -> float:
        return self.costs.commission_per_order + self.costs.commission_per_unit * qty

    # --------------------------------------------------------------- bar loop
    def on_bar(self, symbol: str, candle: Candle) -> list[PaperFill]:
        """Process a new bar: fill pending orders, check stops/targets, mark to market."""
        if self.last_timestamp is not None and candle.timestamp < self.last_timestamp:
            raise PaperTradingError(f"bar {candle.timestamp} is older than the last processed bar")
        fills: list[PaperFill] = []
        fm = self.fill_models.get(symbol)

        for order in [o for o in self.pending.values() if o.symbol == symbol]:
            order.bars_waited += 1
            long = order.side == Side.BUY
            if order.order_type == OrderType.LIMIT:
                if order.expires_after_bars is not None and order.bars_waited > order.expires_after_bars:
                    self.cancel(order.id, f"expired after {order.expires_after_bars} bars", candle.timestamp)
                    continue
                if fm is not None:
                    price = fm.limit_entry(long, order.limit_price, candle.open, candle.high, candle.low)
                else:
                    touched = candle.low <= order.limit_price if long else candle.high >= order.limit_price
                    price = (min(order.limit_price, candle.open) if long else max(order.limit_price, candle.open)) \
                        if touched else None
                if price is None:
                    self._persist(order=order)
                    continue
                if self._gapped_past_stop(order, candle):
                    continue
                fills.append(self._fill_order(order, order.limit_price, candle.timestamp, final_price=price,
                                              commission=self._fm_commission(fm, order.quantity)))
                self.positions[symbol].entry_was_limit = True
            elif self._gapped_past_stop(order, candle):
                continue
            elif fm is not None:
                fills.append(self._fill_order(order, candle.open, candle.timestamp,
                                              final_price=fm.market_entry(long, candle.open),
                                              commission=self._fm_commission(fm, order.quantity)))
            else:
                fills.append(self._fill_order(order, candle.open, candle.timestamp))
            if order.order_type == OrderType.MARKET and order.target_rr is not None:
                self._anchor_target(self.positions[symbol], order)
            pos = self.positions.get(symbol)
            if pos is not None and pos.is_open and pos.entry_bar is None:
                pos.entry_bar = candle.timestamp
            if order.setup_key and order.status == OrderStatus.FILLED:
                # One position at a time: the first entry to fill cancels the other pending entries.
                for other in [o for o in self.pending.values() if o.symbol == symbol and o.setup_key]:
                    self.cancel(other.id, "another setup filled first (one position at a time)", candle.timestamp)
                break

        pos = self.positions.get(symbol)
        if pos is not None and pos.is_open:
            exit_fill = self._check_protective_exits(pos, candle, fm)
            if exit_fill:
                fills.append(exit_fill)

        pos = self.positions.get(symbol)
        if pos is not None and pos.is_open:
            pos.last_price = candle.close
            self._persist(position=pos)
        self.last_timestamp = candle.timestamp
        self.peak_equity = max(self.peak_equity, self.account_state().equity)
        self._persist(snapshot=True)
        log_event(logger, "paper.bar", symbol=symbol, ts=candle.timestamp, close=candle.close,
                  equity=self.account_state().equity, fills=len(fills))
        return fills

    def _gapped_past_stop(self, order: PaperOrder, candle: Candle) -> bool:
        """An entry bar that opens at or beyond the protective stop has no valid entry (audit fix C2).

        Filling it would open a position that is already past its invalidation level; the
        backtester cancels such setups, so the paper broker must too."""
        if order.stop_loss is None:
            return False
        long = order.side == Side.BUY
        if (candle.open <= order.stop_loss) if long else (candle.open >= order.stop_loss):
            self.cancel(order.id, "bar opened beyond the stop (gap); no valid entry", candle.timestamp)
            return True
        return False

    def _anchor_target(self, pos: PaperPosition, order: PaperOrder) -> None:
        """Market entry: target = reward:risk measured from the actual fill (audit fix H5)."""
        if pos.stop_loss is None or not pos.is_open:
            return
        sign = 1 if pos.side == PositionSide.LONG else -1
        target = pos.avg_price + sign * order.target_rr * abs(pos.avg_price - pos.stop_loss)
        if order.target_level is not None and (order.target_level - target) * sign > 0:
            target = order.target_level
        pos.take_profit = order.take_profit = target
        self._persist(order=order, position=pos)

    @staticmethod
    def _fm_commission(fm: FillModel | None, qty: float) -> float | None:
        return None if fm is None else fm.config.commission_per_unit_side * qty

    def close_position(self, symbol: str, price: float, ts: datetime, reason: str = "manual") -> PaperFill | None:
        """Risk-reducing market exit (e.g. before the no-trading zone). No consensus needed."""
        pos = self.positions.get(symbol)
        if pos is None or not pos.is_open:
            return None
        long = pos.side == PositionSide.LONG
        fm = self.fill_models.get(symbol)
        order = PaperOrder(symbol=symbol, side=Side.SELL if long else Side.BUY, quantity=pos.quantity,
                           reason=reason, signal_id=pos.signal_id, created_at=ts)
        self._persist(order=order)
        final = fm.forced_exit(long, price) if fm is not None else None
        return self._fill_order(order, price, ts, exit_reason=ExitReason.MANUAL, final_price=final,
                                commission=self._fm_commission(fm, pos.quantity))

    def _check_protective_exits(self, pos: PaperPosition, candle: Candle,
                                fm: FillModel | None = None) -> PaperFill | None:
        long = pos.side == PositionSide.LONG
        stop, target = pos.stop_loss, pos.take_profit
        entry_bar = pos.entry_bar is not None and pos.entry_bar == candle.timestamp
        if entry_bar and pos.entry_was_limit:
            target = None  # mid-bar limit fill: whether the target traded afterwards is unknowable
        if fm is not None:
            order_side = Side.SELL if long else Side.BUY
            if stop is not None and fm.stop_triggered(long, stop, candle.high, candle.low):
                price = fm.stop_exit(long, stop, candle.open, same_bar_as_entry=entry_bar and pos.entry_was_limit)
                reason = ExitReason.STOP
            elif target is not None and (tp := fm.target_exit(long, target, candle.open, candle.high, candle.low)):
                price, reason = tp, ExitReason.TARGET
            else:
                return None
            order = PaperOrder(symbol=pos.symbol, side=order_side, quantity=pos.quantity, reason=reason.value,
                               signal_id=pos.signal_id, created_at=candle.timestamp)
            self._persist(order=order)
            return self._fill_order(order, stop if reason == ExitReason.STOP else target, candle.timestamp,
                                    exit_reason=reason, final_price=price,
                                    commission=self._fm_commission(fm, pos.quantity))
        price: float | None = None
        reason: ExitReason | None = None
        if stop is not None:
            if long and candle.low <= stop:
                price, reason = min(stop, candle.open), ExitReason.STOP
            elif not long and candle.high >= stop:
                price, reason = max(stop, candle.open), ExitReason.STOP
        if reason is None and target is not None:
            if long and candle.high >= target:
                price, reason = max(target, candle.open), ExitReason.TARGET
            elif not long and candle.low <= target:
                price, reason = min(target, candle.open), ExitReason.TARGET
        if reason is None or price is None:
            return None
        order = PaperOrder(symbol=pos.symbol, side=Side.SELL if long else Side.BUY, quantity=pos.quantity,
                           reason=reason.value, signal_id=pos.signal_id, created_at=candle.timestamp)
        self._persist(order=order)
        return self._fill_order(order, price, candle.timestamp, exit_reason=reason)

    def _fill_order(self, order: PaperOrder, ref_price: float, ts: datetime,
                    exit_reason: ExitReason = ExitReason.SIGNAL, final_price: float | None = None,
                    commission: float | None = None) -> PaperFill:
        if final_price is None:
            price, slip = self._slipped(ref_price, order.side)
        else:
            price, slip = final_price, abs(final_price - ref_price)
        commission = self._commission(order.quantity) if commission is None else commission
        fill = PaperFill(order_id=order.id, symbol=order.symbol, side=order.side, quantity=order.quantity,
                         price=price, reference_price=ref_price, commission=commission, slippage=slip, timestamp=ts)
        order.status = OrderStatus.FILLED
        order.filled_at, order.fill_price = ts, price
        self.pending.pop(order.id, None)
        self.cash -= commission
        self.total_commission += commission
        trade = self._apply_fill(order, fill, exit_reason)
        pos = self.positions[order.symbol]
        log_event(logger, "paper.fill", fill=fill)
        log_event(logger, "paper.position", position=pos)
        if trade:
            self.closed_trades.append(trade)
            log_event(logger, "paper.trade_closed", trade=trade)
        self._persist(order=order, fill=fill, position=pos, trade=trade)
        return fill

    def _apply_fill(self, order: PaperOrder, fill: PaperFill, exit_reason: ExitReason) -> ClosedTrade | None:
        sym = order.symbol
        pv = self.settings.point_value(sym)
        pos = self.positions.get(sym) or PaperPosition(symbol=sym, point_value=pv)
        fill_side = PositionSide.LONG if fill.side == Side.BUY else PositionSide.SHORT
        trade: ClosedTrade | None = None

        if not pos.is_open or pos.side == fill_side:
            new_qty = pos.quantity + fill.quantity
            pos.avg_price = (pos.avg_price * pos.quantity + fill.price * fill.quantity) / new_qty
            pos.quantity = new_qty
            pos.side = fill_side
            pos.point_value = pv
            pos.entry_commission += fill.commission
            pos.opened_at = pos.opened_at or fill.timestamp
            pos.signal_id = pos.signal_id or order.signal_id
            if order.stop_loss is not None:
                pos.stop_loss = order.stop_loss
            if order.take_profit is not None:
                pos.take_profit = order.take_profit
        else:
            close_qty = min(pos.quantity, fill.quantity)
            sign = 1 if pos.side == PositionSide.LONG else -1
            gross = sign * (fill.price - pos.avg_price) * close_qty * pv
            entry_comm = pos.entry_commission * close_qty / pos.quantity
            exit_comm = fill.commission * close_qty / fill.quantity
            self.cash += gross
            self.realized_pnl += gross
            self.trade_count += 1
            trade = ClosedTrade(
                symbol=sym, side=pos.side, quantity=close_qty, entry_price=pos.avg_price, exit_price=fill.price,
                entry_time=pos.opened_at or fill.timestamp, exit_time=fill.timestamp, point_value=pv,
                gross_pnl=gross, commission=entry_comm + exit_comm, net_pnl=gross - entry_comm - exit_comm,
                exit_reason=exit_reason, signal_id=pos.signal_id,
            )
            pos.entry_commission -= entry_comm
            pos.quantity = max(0.0, pos.quantity - close_qty)
            remainder = fill.quantity - close_qty
            if pos.quantity <= 1e-12:
                pos = PaperPosition(symbol=sym, point_value=pv)
                if remainder > 1e-12:  # reversal: open the other side with the rest
                    pos = PaperPosition(
                        symbol=sym, side=fill_side, quantity=remainder, avg_price=fill.price, point_value=pv,
                        opened_at=fill.timestamp, entry_commission=fill.commission * remainder / fill.quantity,
                        stop_loss=order.stop_loss, take_profit=order.take_profit, signal_id=order.signal_id,
                    )
        pos.last_price = fill.price
        self.positions[sym] = pos
        return trade

    # --------------------------------------------------------------- state
    def account_state(self) -> AccountState:
        unreal = sum(p.unrealized_pnl for p in self.positions.values())
        open_pos = [p for p in self.positions.values() if p.is_open]
        now = self.last_timestamp or utcnow()
        day = pd.Timestamp(now).tz_convert("America/New_York").date()
        realized_today = sum(t.net_pnl for t in self.closed_trades
                             if pd.Timestamp(t.exit_time).tz_convert("America/New_York").date() == day)
        exposure = sum(abs(p.quantity * (p.last_price or p.avg_price) * p.point_value) for p in open_pos)
        risk = sum(max(0.0, (p.avg_price - p.stop_loss) if p.side == PositionSide.LONG else (p.stop_loss - p.avg_price))
                   * p.quantity * p.point_value for p in open_pos if p.stop_loss is not None)
        return AccountState(
            peak_equity=max(self.peak_equity, self.cash + unreal),
            daily_pnl=realized_today + unreal - sum(p.entry_commission for p in open_pos),
            open_exposure=exposure,
            open_risk=risk,
            starting_balance=self.starting_balance,
            cash=self.cash,
            realized_pnl=self.realized_pnl,
            unrealized_pnl=unreal,
            total_commission=self.total_commission,
            open_positions=sum(1 for p in self.positions.values() if p.is_open),
            trade_count=self.trade_count,
            timestamp=self.last_timestamp or utcnow(),
        )

    def position(self, symbol: str) -> PaperPosition:
        return self.positions.get(symbol) or PaperPosition(symbol=symbol, point_value=self.settings.point_value(symbol))
