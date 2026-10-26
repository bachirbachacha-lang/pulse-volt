"""Shared data types used by every stage of the pipeline.

The backtester and the forward paper-trading loop both speak these types, so a
strategy written once runs unchanged in either.

Price/volume series travel as pandas DataFrames inside :class:`MarketData`;
everything that crosses an agent boundary or is persisted is a pydantic model,
so it validates on construction and serialises to JSON for the database and
the logs.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import StrEnum
from typing import Any

import pandas as pd
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

OHLCV_COLUMNS: tuple[str, ...] = ("open", "high", "low", "close", "volume")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def _require_aware(v: datetime) -> datetime:
    if v.tzinfo is None or v.tzinfo.utcoffset(v) is None:
        raise ValueError("timestamps must be timezone-aware")
    return v


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_assignment=True)


# --------------------------------------------------------------------------- enums


class AssetClass(StrEnum):
    EQUITY = "equity"
    FUTURES = "futures"
    CRYPTO = "crypto"
    FOREX = "forex"


class DataQualityStatus(StrEnum):
    OK = "OK"
    WARNING = "DATA QUALITY WARNING"
    FAILED = "FAILED"


class Severity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class Side(StrEnum):
    BUY = "buy"
    SELL = "sell"


class PositionSide(StrEnum):
    LONG = "long"
    SHORT = "short"
    FLAT = "flat"


class SignalAction(StrEnum):
    ENTER_LONG = "enter_long"
    ENTER_SHORT = "enter_short"
    EXIT = "exit"
    HOLD = "hold"


class OrderType(StrEnum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"


class OrderStatus(StrEnum):
    PENDING = "pending"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class Verdict(StrEnum):
    APPROVE = "approve"
    REJECT = "reject"
    ABSTAIN = "abstain"


class ExitReason(StrEnum):
    SIGNAL = "signal"
    STOP = "stop"
    TARGET = "target"
    MANUAL = "manual"


# --------------------------------------------------------------------- market data


class Candle(Model):
    timestamp: datetime
    open: float = Field(gt=0)
    high: float = Field(gt=0)
    low: float = Field(gt=0)
    close: float = Field(gt=0)
    volume: float = Field(ge=0)

    _aware = field_validator("timestamp")(_require_aware)

    @model_validator(mode="after")
    def _ohlc_consistent(self) -> "Candle":
        if self.high < max(self.open, self.close, self.low):
            raise ValueError("high must be >= open, close and low")
        if self.low > min(self.open, self.close, self.high):
            raise ValueError("low must be <= open, close and high")
        return self


class IssueScope(StrEnum):
    DATASET = "dataset"  # affects trust in the whole series
    BARS = "bars"  # affects specific bars, which carry a flag_* column


class ValidationIssue(Model):
    code: str
    severity: Severity
    message: str
    count: int = 0
    examples: list[str] = Field(default_factory=list)
    scope: IssueScope = IssueScope.DATASET


class ValidationReport(Model):
    symbol: str
    interval: str
    status: DataQualityStatus
    rows_in: int
    rows_out: int
    issues: list[ValidationIssue] = Field(default_factory=list)
    checked_at: datetime = Field(default_factory=utcnow)

    @property
    def is_usable(self) -> bool:
        """True only when the data passed without warnings."""
        return self.status == DataQualityStatus.OK

    def issue(self, code: str) -> ValidationIssue | None:
        return next((i for i in self.issues if i.code == code), None)

    def codes(self) -> set[str]:
        return {i.code for i in self.issues}


class MarketData(BaseModel):
    """A validated (or raw) OHLCV frame plus the metadata needed to trust it.

    ``frame`` has a tz-aware ``DatetimeIndex`` named ``timestamp`` and lower-case
    columns ``open high low close volume``. Clean frames also carry boolean
    flag columns (``flag_*``) added by the validator.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True, extra="forbid")

    symbol: str
    interval: str
    timezone: str
    asset_class: AssetClass
    source: str = "yfinance"
    frame: pd.DataFrame
    is_clean: bool = False
    report: ValidationReport | None = None
    request_key: str | None = None
    fetched_at: datetime = Field(default_factory=utcnow)

    @field_validator("frame")
    @classmethod
    def _frame_shape(cls, df: pd.DataFrame) -> pd.DataFrame:
        missing = [c for c in OHLCV_COLUMNS if c not in df.columns]
        if missing:
            raise ValueError(f"frame missing columns: {missing}")
        if not isinstance(df.index, pd.DatetimeIndex):
            raise ValueError("frame index must be a DatetimeIndex")
        return df

    @property
    def quality(self) -> DataQualityStatus | None:
        return self.report.status if self.report else None

    @property
    def has_quality_warning(self) -> bool:
        return self.report is None or self.report.status != DataQualityStatus.OK

    def candles(self) -> list[Candle]:
        return [
            Candle(timestamp=ts.to_pydatetime(), **{c: float(row[c]) for c in OHLCV_COLUMNS})
            for ts, row in self.frame[list(OHLCV_COLUMNS)].iterrows()
        ]

    def last_candle(self) -> Candle:
        ts = self.frame.index[-1]
        row = self.frame.iloc[-1]
        return Candle(timestamp=ts.to_pydatetime(), **{c: float(row[c]) for c in OHLCV_COLUMNS})

    def window(self, end: datetime | pd.Timestamp | None = None, bars: int | None = None) -> "MarketData":
        """Slice up to and including ``end``; never leaks future bars."""
        df = self.frame if end is None else self.frame.loc[: pd.Timestamp(end)]
        if bars is not None:
            df = df.iloc[-bars:]
        return self.model_copy(update={"frame": df})


class IndicatorState(Model):
    symbol: str
    interval: str
    timestamp: datetime
    values: dict[str, float | None]

    _aware = field_validator("timestamp")(_require_aware)


# ----------------------------------------------------------------------- strategy


class StrategyDefinition(Model):
    """Declarative description of a strategy; the code lives in ``strategies/``."""

    name: str
    version: str = "0.1.0"
    symbols: list[str]
    interval: str
    indicators: dict[str, dict[str, Any]] = Field(default_factory=dict)
    params: dict[str, Any] = Field(default_factory=dict)
    warmup_bars: int = Field(0, ge=0)
    description: str = ""


class Signal(Model):
    id: str = Field(default_factory=lambda: new_id("sig"))
    strategy: str
    symbol: str
    interval: str
    timestamp: datetime
    action: SignalAction
    price: float = Field(gt=0)
    stop: float | None = Field(default=None, gt=0)
    target: float | None = Field(default=None, gt=0)
    confidence: float = Field(default=1.0, ge=0, le=1)
    reason: str = ""
    indicators: dict[str, float | None] = Field(default_factory=dict)
    data_quality: DataQualityStatus = DataQualityStatus.OK
    entry_type: OrderType = OrderType.MARKET  # LIMIT at ``price``, or MARKET at the next bar's open
    expires_after_bars: int | None = Field(default=None, ge=1)  # pending-entry lifetime in bars
    setup_key: str | None = None  # identifies the strategy setup (duplicate detection)

    _aware = field_validator("timestamp")(_require_aware)

    @model_validator(mode="after")
    def _levels_on_correct_side(self) -> "Signal":
        if self.action == SignalAction.ENTER_LONG:
            if self.stop is not None and self.stop >= self.price:
                raise ValueError("long stop must be below entry price")
            if self.target is not None and self.target <= self.price:
                raise ValueError("long target must be above entry price")
        if self.action == SignalAction.ENTER_SHORT:
            if self.stop is not None and self.stop <= self.price:
                raise ValueError("short stop must be above entry price")
            if self.target is not None and self.target >= self.price:
                raise ValueError("short target must be below entry price")
        return self


class AgentDecision(Model):
    id: str = Field(default_factory=lambda: new_id("dec"))
    agent: str
    signal_id: str
    verdict: Verdict
    reason: str = ""
    details: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=utcnow)


class RiskDecision(AgentDecision):
    quantity: float = Field(default=0.0, ge=0)
    risk_amount: float = Field(default=0.0, ge=0)
    stop: float | None = None
    target: float | None = None


class ConsensusResult(Model):
    signal_id: str
    approved: bool
    decisions: list[AgentDecision]
    reason: str = ""
    quantity: float = 0.0
    timestamp: datetime = Field(default_factory=utcnow)


# -------------------------------------------------------------------- paper trading


class PaperOrder(Model):
    id: str = Field(default_factory=lambda: new_id("ord"))
    symbol: str
    side: Side
    quantity: float = Field(gt=0)
    order_type: OrderType = OrderType.MARKET
    limit_price: float | None = None
    stop_price: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    status: OrderStatus = OrderStatus.PENDING
    signal_id: str | None = None
    created_at: datetime = Field(default_factory=utcnow)
    reason: str = ""
    strategy: str | None = None
    setup_key: str | None = None
    expires_after_bars: int | None = Field(default=None, ge=1)
    bars_waited: int = Field(default=0, ge=0)
    filled_at: datetime | None = None
    fill_price: float | None = None
    cancelled_at: datetime | None = None


class PaperFill(Model):
    id: str = Field(default_factory=lambda: new_id("fill"))
    order_id: str
    symbol: str
    side: Side
    quantity: float = Field(gt=0)
    price: float = Field(gt=0)
    reference_price: float = Field(gt=0)
    commission: float = Field(ge=0)
    slippage: float = Field(ge=0)
    timestamp: datetime


class PaperPosition(Model):
    symbol: str
    side: PositionSide = PositionSide.FLAT
    quantity: float = Field(default=0.0, ge=0)
    avg_price: float = 0.0
    point_value: float = 1.0
    stop_loss: float | None = None
    take_profit: float | None = None
    opened_at: datetime | None = None
    entry_commission: float = 0.0
    last_price: float | None = None
    signal_id: str | None = None
    entry_bar: datetime | None = None  # bar on which the position was opened
    entry_was_limit: bool = False  # a mid-bar limit fill: target not credited on the entry bar

    @property
    def is_open(self) -> bool:
        return self.side != PositionSide.FLAT and self.quantity > 0

    @property
    def unrealized_pnl(self) -> float:
        if not self.is_open or self.last_price is None:
            return 0.0
        sign = 1 if self.side == PositionSide.LONG else -1
        return sign * (self.last_price - self.avg_price) * self.quantity * self.point_value


class ClosedTrade(Model):
    id: str = Field(default_factory=lambda: new_id("trd"))
    symbol: str
    side: PositionSide
    quantity: float
    entry_price: float
    exit_price: float
    entry_time: datetime
    exit_time: datetime
    point_value: float = 1.0
    gross_pnl: float
    commission: float
    net_pnl: float
    exit_reason: ExitReason
    signal_id: str | None = None

    @property
    def return_pct(self) -> float:
        notional = self.entry_price * self.quantity * self.point_value
        return self.net_pnl / notional * 100 if notional else 0.0


SIMULATION_LABEL = "PAPER / SIMULATION"


class AccountState(Model):
    """Virtual account. ``cash`` is the current virtual balance (realised P&L and costs applied)."""

    label: str = SIMULATION_LABEL
    starting_balance: float
    cash: float
    realized_pnl: float = 0.0
    unrealized_pnl: float = 0.0
    total_commission: float = 0.0
    open_positions: int = 0
    trade_count: int = 0
    peak_equity: float | None = None  # highest equity seen (for drawdown)
    daily_pnl: float = 0.0  # realised today (New York date) + current unrealised
    open_exposure: float = 0.0  # notional value of open positions
    open_risk: float = 0.0  # money lost if every open position hit its stop
    timestamp: datetime = Field(default_factory=utcnow)

    @property
    def equity(self) -> float:
        return self.cash + self.unrealized_pnl

    @property
    def drawdown(self) -> float:
        peak = max(self.peak_equity or self.starting_balance, self.equity)
        return self.equity - peak

    @property
    def drawdown_pct(self) -> float:
        peak = max(self.peak_equity or self.starting_balance, self.equity)
        return self.drawdown / peak if peak else 0.0
