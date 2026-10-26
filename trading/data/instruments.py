"""Symbol classification, trading sessions and interval helpers."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pandas as pd

from trading.config.settings import SessionSettings, Settings
from trading.core.schemas import AssetClass

# yfinance interval strings -> pandas offsets.
INTERVALS: dict[str, pd.Timedelta] = {
    "1m": pd.Timedelta(minutes=1),
    "2m": pd.Timedelta(minutes=2),
    "5m": pd.Timedelta(minutes=5),
    "15m": pd.Timedelta(minutes=15),
    "30m": pd.Timedelta(minutes=30),
    "60m": pd.Timedelta(hours=1),
    "90m": pd.Timedelta(minutes=90),
    "1h": pd.Timedelta(hours=1),
    "1d": pd.Timedelta(days=1),
    "5d": pd.Timedelta(days=5),
    "1wk": pd.Timedelta(weeks=1),
    "1mo": pd.Timedelta(days=30),
    "3mo": pd.Timedelta(days=91),
}
DAILY_OR_LONGER = {"1d", "5d", "1wk", "1mo", "3mo"}

# Max history yfinance serves per interval (approximate, documented limits).
INTRADAY_LOOKBACK_LIMIT: dict[str, pd.Timedelta] = {
    "1m": pd.Timedelta(days=7),
    "2m": pd.Timedelta(days=60),
    "5m": pd.Timedelta(days=60),
    "15m": pd.Timedelta(days=60),
    "30m": pd.Timedelta(days=60),
    "60m": pd.Timedelta(days=730),
    "90m": pd.Timedelta(days=60),
    "1h": pd.Timedelta(days=730),
}

# Quarterly (H, M, U, Z) equity-index and rate futures. Others are treated as monthly.
QUARTERLY_ROOTS = {"ES", "MES", "NQ", "MNQ", "YM", "MYM", "RTY", "M2K", "ZN", "ZB", "ZF", "ZT", "6E", "6J", "6B"}


def interval_delta(interval: str) -> pd.Timedelta:
    try:
        return INTERVALS[interval]
    except KeyError as exc:
        raise ValueError(f"unsupported interval {interval!r}; choose one of {sorted(INTERVALS)}") from exc


def is_intraday(interval: str) -> bool:
    interval_delta(interval)
    return interval not in DAILY_OR_LONGER


def classify_symbol(symbol: str, settings: Settings | None = None) -> AssetClass:
    if settings is not None and symbol in settings.sessions.symbols:
        return AssetClass(settings.sessions.symbols[symbol])
    s = symbol.upper()
    if s.endswith("=F") or re.fullmatch(r"[A-Z0-9]{1,4}[FGHJKMNQUVXZ]\d{2}\.[A-Z]{3}", s):
        return AssetClass.FUTURES
    if s.endswith("=X"):
        return AssetClass.FOREX
    if re.search(r"-(USD|USDT|EUR|BTC)$", s):
        return AssetClass.CRYPTO
    return AssetClass.EQUITY


def futures_root(symbol: str) -> str:
    return symbol.upper().split("=")[0]


@dataclass(frozen=True)
class Session:
    """A recurring trading session in a specific timezone.

    ``days`` are the weekdays on which a session opens. ``open == close`` means
    a 24-hour session; ``open > close`` means it runs overnight into the next day.
    """

    timezone: str
    open: time
    close: time
    days: tuple[int, ...]

    @classmethod
    def from_settings(cls, s: SessionSettings) -> "Session":
        return cls(timezone=s.timezone, open=s.open, close=s.close, days=tuple(s.days))

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)

    @property
    def is_24h(self) -> bool:
        return self.open == self.close

    @property
    def overnight(self) -> bool:
        return self.open > self.close or self.is_24h

    def bounds(self, d: date) -> tuple[pd.Timestamp, pd.Timestamp]:
        """Session open/close for the session that opens on date ``d``."""
        start = pd.Timestamp(datetime.combine(d, self.open), tz=self.tz)
        end_day = d + timedelta(days=1) if self.overnight else d
        end = pd.Timestamp(datetime.combine(end_day, self.close), tz=self.tz)
        return start, end

    def sessions_between(self, start: pd.Timestamp, end: pd.Timestamp) -> list[tuple[pd.Timestamp, pd.Timestamp]]:
        first = (start.tz_convert(self.tz) - pd.Timedelta(days=1)).date()
        last = end.tz_convert(self.tz).date()
        out = []
        for d in pd.date_range(first, last, freq="D"):
            if d.weekday() in self.days:
                out.append(self.bounds(d.date()))
        return out

    def contains(self, index: pd.DatetimeIndex) -> pd.Series:
        """Boolean mask: does each bar's start fall inside a session?"""
        if len(index) == 0:
            return pd.Series([], dtype=bool, index=index)
        mask = pd.Series(False, index=index)
        for s, e in self.sessions_between(index[0], index[-1]):
            mask |= (index >= s) & (index < e)
        return mask

    def is_open_at(self, ts: pd.Timestamp) -> bool:
        return bool(self.contains(pd.DatetimeIndex([ts])).iloc[0])


def session_for(symbol: str, settings: Settings) -> Session:
    asset = classify_symbol(symbol, settings)
    return Session.from_settings(getattr(settings.sessions, asset.value))


def third_friday(year: int, month: int) -> date:
    d = date(year, month, 15)
    return d + timedelta(days=(4 - d.weekday()) % 7)


def estimated_roll_dates(symbol: str, start: pd.Timestamp, end: pd.Timestamp) -> list[date]:
    """Approximate dates when volume moves to the next contract.

    Quarterly index futures roll about 8 days before the third-Friday expiry
    (the second Thursday of Mar/Jun/Sep/Dec). Monthly contracts (energy, metals)
    are approximated as rolling around the 20th of every month. These are
    estimates used only to label large gaps, never to trade on.
    """
    root = futures_root(symbol)
    out: list[date] = []
    for year in range(start.year - 1, end.year + 2):
        if root in QUARTERLY_ROOTS:
            for m in (3, 6, 9, 12):
                out.append(third_friday(year, m) - timedelta(days=8))
        else:
            for m in range(1, 13):
                out.append(date(year, m, 20))
    lo, hi = start.date() - timedelta(days=10), end.date() + timedelta(days=10)
    return sorted(d for d in out if lo <= d <= hi)
