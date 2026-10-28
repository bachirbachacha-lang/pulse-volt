"""Market-data sources.

:class:`YFinanceSource` is the only implementation today. It returns *raw*
data in a standard shape, and nothing else: no cleaning, no fixing. Cleaning
happens in :mod:`trading.data.validation` so every decision is reported.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Callable, Protocol

import pandas as pd

from trading.core.log import get_logger, log_event
from trading.core.schemas import OHLCV_COLUMNS
from trading.data.instruments import INTRADAY_LOOKBACK_LIMIT, interval_delta

logger = get_logger("data.source")


@dataclass(frozen=True)
class DataRequest:
    """Everything that determines what a download returns (and its cache key)."""

    symbol: str
    interval: str = "1d"
    period: str | None = None
    start: str | None = None  # ISO date/datetime
    end: str | None = None
    timezone: str = "America/New_York"
    auto_adjust: bool = False
    prepost: bool = False
    extra: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        interval_delta(self.interval)
        if self.period is None and self.start is None:
            raise ValueError("give either period or start (and optionally end)")
        if self.period is not None and (self.start or self.end):
            raise ValueError("period and start/end are mutually exclusive")

    def key(self) -> str:
        payload = json.dumps(asdict(self), sort_keys=True, default=str)
        digest = hashlib.sha256(payload.encode()).hexdigest()[:16]
        safe_symbol = "".join(ch if ch.isalnum() else "_" for ch in self.symbol)
        return f"{safe_symbol}_{self.interval}_{digest}"

    @property
    def end_timestamp(self) -> pd.Timestamp | None:
        if not self.end:
            return None
        ts = pd.Timestamp(self.end)
        return ts if ts.tzinfo else ts.tz_localize(self.timezone)

    @property
    def is_historical(self) -> bool:
        """True when the request ends in the past, so its result can never change."""
        end = self.end_timestamp
        return end is not None and end < pd.Timestamp.now(tz="UTC") - pd.Timedelta(days=1)


class MarketDataSource(Protocol):
    name: str

    def fetch(self, request: DataRequest) -> pd.DataFrame: ...


class DataSourceError(RuntimeError):
    pass


def normalize_ohlcv(df: pd.DataFrame, symbol: str | None = None) -> pd.DataFrame:
    """Convert a yfinance-style frame to the standard raw shape.

    Handles the MultiIndex columns ``yf.download`` returns, title-case column
    names and the ``Date``/``Datetime`` index name. Does not drop or change rows.
    """
    out = df.copy()
    if isinstance(out.columns, pd.MultiIndex):
        levels = [list(map(str, out.columns.get_level_values(i))) for i in range(out.columns.nlevels)]
        price_level = next(
            (i for i, lv in enumerate(levels) if {"Open", "Close"} <= set(lv) or {"open", "close"} <= set(lv)), 0
        )
        if symbol is not None:
            for i, lv in enumerate(levels):
                if i != price_level and symbol in lv:
                    out = out.xs(symbol, axis=1, level=i)
                    break
        if isinstance(out.columns, pd.MultiIndex):
            out.columns = out.columns.get_level_values(price_level)
    out.columns = [str(c).strip().lower().replace(" ", "_") for c in out.columns]
    if "adj_close" in out.columns and "close" not in out.columns:
        out = out.rename(columns={"adj_close": "close"})
    missing = [c for c in OHLCV_COLUMNS if c not in out.columns]
    if missing:
        raise DataSourceError(f"source returned no {missing} columns (got {list(out.columns)})")
    keep = list(OHLCV_COLUMNS) + (["adj_close"] if "adj_close" in out.columns else [])
    out = out[keep]
    if not isinstance(out.index, pd.DatetimeIndex):
        out.index = pd.to_datetime(out.index, utc=True)
    out.index.name = "timestamp"
    for c in out.columns:
        out[c] = pd.to_numeric(out[c], errors="coerce").astype("float64")
    return out


class YFinanceSource:
    """Download OHLCV from Yahoo Finance via yfinance.

    ``history_fn`` is injectable for tests; by default it calls
    ``yfinance.Ticker(symbol).history(...)``.
    """

    name = "yfinance"

    def __init__(self, history_fn: Callable[..., pd.DataFrame] | None = None) -> None:
        self._history_fn = history_fn

    def _default_history(self, symbol: str, **kwargs: Any) -> pd.DataFrame:
        import yfinance as yf

        return yf.Ticker(symbol).history(**kwargs)

    def fetch(self, request: DataRequest) -> pd.DataFrame:
        kwargs: dict[str, Any] = {
            "interval": request.interval,
            "auto_adjust": request.auto_adjust,
            "prepost": request.prepost,
            "actions": False,
            "repair": False,  # never let the source silently alter prices
            "keepna": True,  # keep NaN rows so the validator can see and report them
            "raise_errors": True,
        }
        if request.period:
            kwargs["period"] = request.period
        else:
            kwargs["start"] = request.start
            if request.end:
                kwargs["end"] = request.end
        kwargs.update(request.extra)
        self._warn_lookback(request)

        fn = self._history_fn or self._default_history
        log_event(logger, "market_data.request", symbol=request.symbol, **{k: v for k, v in kwargs.items()})
        started = datetime.now()
        try:
            raw = fn(request.symbol, **kwargs)
        except Exception as exc:  # yfinance raises a variety of types
            log_event(logger, "market_data.error", level=40, symbol=request.symbol, error=repr(exc))
            raise DataSourceError(f"yfinance download failed for {request.symbol}: {exc}") from exc
        if raw is None or len(raw) == 0:
            log_event(logger, "market_data.empty", level=30, symbol=request.symbol)
            raise DataSourceError(f"yfinance returned no rows for {request.symbol} {request.interval}")
        df = normalize_ohlcv(raw, request.symbol)
        log_event(
            logger,
            "market_data.received",
            symbol=request.symbol,
            interval=request.interval,
            rows=len(df),
            first=df.index[0],
            last=df.index[-1],
            seconds=(datetime.now() - started).total_seconds(),
        )
        return df

    @staticmethod
    def _warn_lookback(request: DataRequest) -> None:
        limit = INTRADAY_LOOKBACK_LIMIT.get(request.interval)
        if limit is None or not request.start:
            return
        start = pd.Timestamp(request.start)
        start = start if start.tzinfo else start.tz_localize(request.timezone)
        if pd.Timestamp.now(tz="UTC") - start > limit:
            log_event(
                logger,
                "market_data.lookback_exceeded",
                level=30,
                symbol=request.symbol,
                interval=request.interval,
                limit_days=limit.days,
            )
