"""Simulated (paper) broker. SIMULATED MONEY ONLY.

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

The same engine is meant to serve both backtests and forward paper trading.
"""

from __future__ import annotations

from datetime import datetime

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
    utcnow,
)
from trading.database.store import Database

logger = get_logger("paper_trading")


class PaperTradingError(RuntimeError):
    pass


class PaperBroker:
    def __init__(self, settings: Settings, db: Database | None = None, *, restore: bool = True) -> None:
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
        self.last_timestamp: datetime | None = None
        if db is not None and restore:
            self.restore()

    # --------------------------------------------------------------- persistence
    def restore(self) -> None:
        """Rebuild state from the database after a restart."""
        assert self.db is not None
        acct = self.db.latest_account()
        if acct is not None:
            self.starting_balance = acct.starting_balance
            self.cash = acct.cash
            self.realized_pnl = acct.realized_pnl
            self.total_commission = acct.total_commission
            self.trade_count = acct.trade_count
            self.last_timestamp = acct.timestamp
        self.positions = {p.symbol: p for p in self.db.positions() if p.is_open}
        self.pending = {o.id: o for o in self.db.orders(status=OrderStatus.PENDING.value)}
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
    def submit(self, order: PaperOrder) -> PaperOrder:
        if order.order_type != OrderType.MARKET:
            raise PaperTradingError("only market orders are supported at this stage")
        if order.status != OrderStatus.PENDING:
            raise PaperTradingError("only pending orders can be submitted")
        self.pending[order.id] = order
        log_event(logger, "paper.order_submitted", order=order)
        self._persist(order=order)
        return order

    def cancel(self, order_id: str) -> PaperOrder:
        order = self.pending.pop(order_id)
        order.status = OrderStatus.CANCELLED
        log_event(logger, "paper.order_cancelled", order_id=order_id)
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

        for order in [o for o in self.pending.values() if o.symbol == symbol]:
            fills.append(self._fill_order(order, candle.open, candle.timestamp))

        pos = self.positions.get(symbol)
        if pos is not None and pos.is_open:
            exit_fill = self._check_protective_exits(pos, candle)
            if exit_fill:
                fills.append(exit_fill)

        pos = self.positions.get(symbol)
        if pos is not None and pos.is_open:
            pos.last_price = candle.close
            self._persist(position=pos)
        self.last_timestamp = candle.timestamp
        self._persist(snapshot=True)
        log_event(logger, "paper.bar", symbol=symbol, ts=candle.timestamp, close=candle.close,
                  equity=self.account_state().equity, fills=len(fills))
        return fills

    def _check_protective_exits(self, pos: PaperPosition, candle: Candle) -> PaperFill | None:
        long = pos.side == PositionSide.LONG
        stop, target = pos.stop_loss, pos.take_profit
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
                    exit_reason: ExitReason = ExitReason.SIGNAL) -> PaperFill:
        price, slip = self._slipped(ref_price, order.side)
        commission = self._commission(order.quantity)
        fill = PaperFill(order_id=order.id, symbol=order.symbol, side=order.side, quantity=order.quantity,
                         price=price, reference_price=ref_price, commission=commission, slippage=slip, timestamp=ts)
        order.status = OrderStatus.FILLED
        self.pending.pop(order.id, None)
        self.cash -= commission
        self.total_commission += commission
        trade = self._apply_fill(order, fill, exit_reason)
        pos = self.positions[order.symbol]
        log_event(logger, "paper.fill", fill=fill)
        log_event(logger, "paper.position", position=pos)
        if trade:
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
        return AccountState(
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
