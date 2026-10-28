"""Data-validation layer: RAW -> VALIDATOR -> CLEAN.

Nothing reaches a strategy without passing through :meth:`DataValidator.validate`.
The validator never silently "fixes" prices. It either

* drops rows that are unusable (NaN, non-positive or non-finite prices,
  broken OHLC relationships, duplicates) and reports how many, or
* keeps rows but marks them with boolean ``flag_*`` columns (suspicious moves,
  possible futures rolls, unexplained gaps, out-of-session bars), and reports them.

Any warning-level finding turns the dataset status into
``DATA QUALITY WARNING``. Downstream code (the execution validator) refuses to
act on a warning in the dataset itself, or on a flagged bar near the signal.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from trading.config.settings import Settings, ValidationSettings
from trading.core.log import get_logger, log_event
from trading.core.schemas import (
    OHLCV_COLUMNS,
    AssetClass,
    DataQualityStatus,
    IssueScope,
    Severity,
    ValidationIssue,
    ValidationReport,
)
from trading.data.instruments import (
    Session,
    classify_symbol,
    estimated_roll_dates,
    interval_delta,
    is_intraday,
    session_for,
)

logger = get_logger("data.validation")

PRICE_COLUMNS = ["open", "high", "low", "close"]
FLAG_COLUMNS = [
    "flag_suspicious_move",
    "flag_large_gap",
    "flag_roll_suspect",
    "flag_roll_window",
    "flag_out_of_session",
    "flag_after_missing",
]
# flag_roll_window only marks the days around an estimated roll (context, not a
# defect), so it does not count towards flag_any.
BLOCKING_FLAGS = [c for c in FLAG_COLUMNS if c != "flag_roll_window"]
MAX_EXAMPLES = 5


@dataclass
class ValidationContext:
    symbol: str
    interval: str
    timezone: str
    asset_class: AssetClass
    session: Session
    prepost: bool = False
    check_staleness: bool = False
    now: datetime | None = None


def _examples(idx: pd.Index) -> list[str]:
    return [str(x) for x in list(idx[:MAX_EXAMPLES])]


class DataValidator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.cfg: ValidationSettings = settings.validation

    def context_for(
        self,
        symbol: str,
        interval: str,
        *,
        timezone_name: str | None = None,
        prepost: bool | None = None,
        check_staleness: bool = False,
        now: datetime | None = None,
    ) -> ValidationContext:
        return ValidationContext(
            symbol=symbol,
            interval=interval,
            timezone=timezone_name or self.settings.market_data.timezone,
            asset_class=classify_symbol(symbol, self.settings),
            session=session_for(symbol, self.settings),
            prepost=self.settings.market_data.prepost if prepost is None else prepost,
            check_staleness=check_staleness,
            now=now,
        )

    # ------------------------------------------------------------------ main
    def validate(self, raw: pd.DataFrame, ctx: ValidationContext) -> tuple[pd.DataFrame, ValidationReport]:
        issues: list[ValidationIssue] = []
        rows_in = len(raw)

        def add(code: str, severity: Severity, message: str, idx: pd.Index | None = None,
                count: int | None = None, scope: IssueScope = IssueScope.DATASET) -> None:
            n = count if count is not None else (len(idx) if idx is not None else 0)
            issues.append(
                ValidationIssue(code=code, severity=severity, message=message, count=n,
                                examples=_examples(idx) if idx is not None else [], scope=scope)
            )

        missing_cols = [c for c in OHLCV_COLUMNS if c not in raw.columns]
        if missing_cols:
            add("MISSING_COLUMNS", Severity.ERROR, f"missing columns {missing_cols}")
            return self._finish(pd.DataFrame(columns=list(OHLCV_COLUMNS)), ctx, issues, rows_in, failed=True)
        if rows_in == 0:
            add("EMPTY", Severity.ERROR, "dataset has no rows")
            return self._finish(raw.copy(), ctx, issues, rows_in, failed=True)

        df = raw.copy()
        df = self._check_timezone(df, ctx, add)
        df = self._check_order_and_duplicates(df, add)
        df = self._check_values(df, add)
        if df.empty:
            add("EMPTY_AFTER_CLEANING", Severity.ERROR, "no valid rows remain after cleaning")
            return self._finish(df, ctx, issues, rows_in, failed=True)

        for col in FLAG_COLUMNS:
            df[col] = False

        failed = self._check_interval(df, ctx, add)
        if is_intraday(ctx.interval):
            df = self._check_session(df, ctx, add)
        self._check_missing(df, ctx, add)
        self._check_suspicious_moves(df, add)
        if ctx.asset_class == AssetClass.FUTURES:
            self._check_futures(df, ctx, add)
        if ctx.check_staleness:
            self._check_stale(df, ctx, add)

        df["flag_any"] = df[BLOCKING_FLAGS].any(axis=1)
        return self._finish(df, ctx, issues, rows_in, failed=failed)

    def _finish(self, df: pd.DataFrame, ctx: ValidationContext, issues: list[ValidationIssue],
                rows_in: int, failed: bool) -> tuple[pd.DataFrame, ValidationReport]:
        if failed or df.empty:
            status = DataQualityStatus.FAILED
        elif any(i.severity in (Severity.WARNING, Severity.ERROR) for i in issues):
            status = DataQualityStatus.WARNING
        else:
            status = DataQualityStatus.OK
        report = ValidationReport(symbol=ctx.symbol, interval=ctx.interval, status=status,
                                  rows_in=rows_in, rows_out=len(df), issues=issues)
        log_event(
            logger,
            "data.validated",
            level=20 if status == DataQualityStatus.OK else 30,
            symbol=ctx.symbol,
            interval=ctx.interval,
            status=status,
            rows_in=rows_in,
            rows_out=len(df),
            issues={i.code: i.count for i in issues},
        )
        return df, report

    # ------------------------------------------------------------- structure
    def _check_timezone(self, df: pd.DataFrame, ctx: ValidationContext, add) -> pd.DataFrame:
        if not isinstance(df.index, pd.DatetimeIndex):
            df.index = pd.to_datetime(df.index, utc=True, errors="coerce")
            bad = df.index.isna()
            if bad.any():
                add("UNPARSEABLE_TIMESTAMPS", Severity.WARNING, "timestamps that could not be parsed were dropped",
                    count=int(bad.sum()))
                df = df[~bad]
        if df.index.tz is None:
            add("TIMEZONE_NAIVE", Severity.WARNING,
                "timestamps had no timezone; assumed UTC. Session and gap checks may be wrong.")
            df.index = df.index.tz_localize("UTC")
        df.index = df.index.tz_convert(ctx.timezone)
        df.index.name = "timestamp"
        return df

    def _check_order_and_duplicates(self, df: pd.DataFrame, add) -> pd.DataFrame:
        if not df.index.is_monotonic_increasing:
            backwards = int((np.diff(df.index.asi8) < 0).sum())
            add("NON_MONOTONIC", Severity.WARNING, "timestamps were out of order; sorted", count=backwards)
            df = df.sort_index(kind="mergesort")
        dup = df.index.duplicated(keep="last")
        if dup.any():
            add("DUPLICATE_TIMESTAMPS", Severity.WARNING, "duplicate timestamps; kept the last row for each",
                idx=df.index[dup])
            df = df[~dup]
        return df

    def _check_values(self, df: pd.DataFrame, add) -> pd.DataFrame:
        prices = df[PRICE_COLUMNS]
        nan_rows = prices.isna().any(axis=1)
        if nan_rows.any():
            add("NAN_VALUES", Severity.WARNING, "rows with NaN prices were dropped", idx=df.index[nan_rows])
            df = df[~nan_rows]
            prices = df[PRICE_COLUMNS]

        bad_price = (~np.isfinite(prices)).any(axis=1) | (prices <= 0).any(axis=1)
        if bad_price.any():
            add("INVALID_PRICE", Severity.WARNING, "rows with zero, negative or infinite prices were dropped",
                idx=df.index[bad_price])
            df = df[~bad_price]

        o, h, l, c = (df[x] for x in PRICE_COLUMNS)
        bad_ohlc = (h < np.maximum(o, c)) | (l > np.minimum(o, c)) | (h < l)
        if bad_ohlc.any():
            add("INVALID_OHLC", Severity.WARNING,
                "rows where high/low do not bound open/close were dropped", idx=df.index[bad_ohlc])
            df = df[~bad_ohlc]

        vol_nan = df["volume"].isna()
        if vol_nan.any():
            add("NAN_VOLUME", Severity.INFO, "NaN volume set to 0", idx=df.index[vol_nan])
            df = df.assign(volume=df["volume"].fillna(0.0))
        bad_vol = (df["volume"] < 0) | ~np.isfinite(df["volume"])
        if bad_vol.any():
            add("INVALID_VOLUME", Severity.WARNING, "rows with negative/infinite volume were dropped",
                idx=df.index[bad_vol])
            df = df[~bad_vol]
        zero_vol = df["volume"] == 0
        if len(df) and zero_vol.mean() > 0.5:
            add("MOSTLY_ZERO_VOLUME", Severity.INFO,
                "more than half the bars have zero volume (normal for indices/forex on Yahoo)",
                count=int(zero_vol.sum()))
        return df

    def _check_interval(self, df: pd.DataFrame, ctx: ValidationContext, add) -> bool:
        """Return True if the data is clearly not at the requested interval."""
        if len(df) < 3:
            add("TOO_FEW_ROWS", Severity.WARNING, f"only {len(df)} rows; checks are unreliable", count=len(df))
            return False
        expected = interval_delta(ctx.interval)
        deltas = pd.Series(df.index[1:] - df.index[:-1], index=df.index[1:])
        if is_intraday(ctx.interval):
            modal = deltas.mode().iloc[0]
            too_close = deltas < expected
        else:
            # Daily+ bars: DST and month lengths make exact deltas vary; compare in days.
            modal = pd.Timedelta(days=round(deltas.dt.total_seconds().mode().iloc[0] / 86400))
            too_close = deltas < expected * 0.5
        if too_close.any():
            add("UNEXPECTED_INTERVAL", Severity.WARNING,
                f"{int(too_close.sum())} bars are closer together than the {ctx.interval} interval",
                idx=deltas.index[too_close])
        tolerance = expected * (0.5 if not is_intraday(ctx.interval) else 0.01)
        if abs(modal - expected) > tolerance and not (ctx.interval in {"1wk", "1mo", "3mo", "5d"}):
            add("INTERVAL_MISMATCH", Severity.ERROR,
                f"most common bar spacing is {modal}, expected {expected} for {ctx.interval}")
            return True
        return False

    # --------------------------------------------------------------- session
    def _check_session(self, df: pd.DataFrame, ctx: ValidationContext, add) -> pd.DataFrame:
        if ctx.session.is_24h and len(ctx.session.days) == 7:
            return df
        inside = ctx.session.contains(df.index)
        outside = ~inside
        if outside.any():
            df.loc[outside, "flag_out_of_session"] = True
            expected = ctx.prepost and ctx.asset_class == AssetClass.EQUITY
            severity = Severity.INFO if expected else Severity.WARNING
            msg = "bars outside the configured session" + (" (pre/post-market requested)" if expected else "")
            if self.cfg.drop_out_of_session:
                msg += "; dropped"
            add("OUT_OF_SESSION", severity, msg, idx=df.index[outside.values], scope=IssueScope.BARS)
            if self.cfg.drop_out_of_session:
                df = df[inside.values]
        return df

    def _check_missing(self, df: pd.DataFrame, ctx: ValidationContext, add) -> None:
        if len(df) < 2:
            return
        step = interval_delta(ctx.interval)
        if is_intraday(ctx.interval):
            expected_total = 0
            missing: list[pd.Timestamp] = []
            empty_sessions: list[pd.Timestamp] = []
            idx = df.index
            for s_open, s_close in ctx.session.sessions_between(idx[0], idx[-1]):
                if s_close <= idx[0] or s_open > idx[-1]:
                    continue
                grid = pd.date_range(s_open, s_close - pd.Timedelta(seconds=1), freq=step)
                grid = grid[(grid >= idx[0]) & (grid <= idx[-1])]
                if len(grid) == 0:
                    continue
                present = idx[(idx >= s_open) & (idx < s_close)]
                if len(present) == 0:
                    empty_sessions.append(s_open)
                    continue
                expected_total += len(grid)
                absent = grid.difference(present)
                # A bar that sits off the grid (e.g. a shortened first bar) still covers its slot.
                if len(absent):
                    absent = absent[[not ((present > a - step) & (present < a + step)).any() for a in absent]]
                missing.extend(absent)
            if empty_sessions:
                add("MISSING_SESSIONS", Severity.INFO,
                    "whole sessions with no bars (holidays or outages)", idx=pd.DatetimeIndex(empty_sessions))
            if missing:
                missing_idx = pd.DatetimeIndex(missing).tz_convert(ctx.timezone)
                frac = len(missing_idx) / max(expected_total, 1)
                severity = Severity.WARNING if frac > self.cfg.max_missing_fraction else Severity.INFO
                add("MISSING_CANDLES", severity,
                    f"{len(missing_idx)} of {expected_total} expected in-session candles missing ({frac:.2%})",
                    idx=missing_idx, scope=IssueScope.BARS)
                # Flag the first bar after each hole so strategies can avoid bridging it.
                pos = df.index.searchsorted(missing_idx)
                pos = pos[pos < len(df)]
                df.iloc[np.unique(pos), df.columns.get_loc("flag_after_missing")] = True
        else:
            if ctx.interval != "1d":
                return
            weekdays = range(7) if ctx.asset_class == AssetClass.CRYPTO else range(5)
            days = pd.DatetimeIndex(df.index.normalize().unique())
            grid = pd.date_range(days[0], days[-1], freq="D")
            grid = grid[grid.weekday.isin(list(weekdays))]
            absent = grid.difference(days)
            if len(absent):
                # Single missing weekdays are usually holidays; long runs are not.
                gaps = days.to_series().diff().dt.days
                long_gap = gaps[gaps > (5 if len(weekdays) == 5 else 2)]
                severity = Severity.WARNING if len(long_gap) else Severity.INFO
                add("MISSING_CANDLES", severity,
                    f"{len(absent)} expected trading days absent"
                    + (f"; {len(long_gap)} gap(s) longer than a holiday weekend" if len(long_gap) else
                       " (consistent with exchange holidays)"),
                    idx=absent, scope=IssueScope.BARS)
                if len(long_gap):
                    df.loc[df.index.normalize().isin(long_gap.index), "flag_after_missing"] = True

    # ------------------------------------------------------------- anomalies
    def _check_suspicious_moves(self, df: pd.DataFrame, add) -> None:
        if len(df) < 20:
            return
        r = np.log(df["close"]).diff()
        lookback = self.cfg.gap_lookback
        # Robust z-score against the *previous* bars only: median and IQR-based sigma.
        roll = r.rolling(lookback, min_periods=20)
        med = roll.median().shift(1)
        sigma = ((roll.quantile(0.75) - roll.quantile(0.25)) / 1.349).shift(1)
        z = (r - med).abs() / sigma.replace(0, np.nan)
        hit = z > self.cfg.gap_mad_threshold
        if hit.any():
            df.loc[hit, "flag_suspicious_move"] = True
            add("SUSPICIOUS_MOVE", Severity.WARNING,
                f"close-to-close moves over {self.cfg.gap_mad_threshold:g} robust standard deviations",
                idx=df.index[hit.fillna(False).values], scope=IssueScope.BARS)

    def _check_futures(self, df: pd.DataFrame, ctx: ValidationContext, add) -> None:
        if ctx.symbol.upper().endswith("=F"):
            add("CONTINUOUS_CONTRACT", Severity.INFO,
                "Yahoo '=F' symbols are an unadjusted front-month continuous series: "
                "prices jump when the underlying contract rolls and are not back-adjusted")

        rolls = estimated_roll_dates(ctx.symbol, df.index[0], df.index[-1])
        window = pd.Timedelta(days=self.cfg.roll_window_days)
        dates = df.index.tz_convert(ctx.timezone)
        in_window = np.zeros(len(df), dtype=bool)
        for rd in rolls:
            centre = pd.Timestamp(rd, tz=ctx.timezone)
            in_window |= (dates >= centre - window) & (dates <= centre + window + pd.Timedelta(days=1))
        df["flag_roll_window"] = in_window

        prev_close = df["close"].shift(1)
        gap = (df["open"] - prev_close).abs() / prev_close
        big = gap > self.cfg.futures_gap_threshold
        big.iloc[0] = False
        if not big.any():
            return
        step = interval_delta(ctx.interval)
        elapsed = pd.Series(df.index, index=df.index).diff()
        across_break = elapsed > step * 1.5
        roll = big & in_window
        session_gap = big & ~in_window & across_break
        unexplained = big & ~in_window & ~across_break

        if roll.any():
            df.loc[roll, "flag_roll_suspect"] = True
            df.loc[roll, "flag_large_gap"] = True
            add("POSSIBLE_ROLL", Severity.WARNING,
                "large open-vs-prior-close gaps inside an estimated contract-roll window. "
                "These may be synthetic roll jumps, not real price moves; do not treat them as signals.",
                idx=df.index[roll.values], scope=IssueScope.BARS)
        if session_gap.any():
            df.loc[session_gap, "flag_large_gap"] = True
            add("SESSION_BREAK_GAP", Severity.INFO,
                "large gaps across a session break or weekend", idx=df.index[session_gap.values],
                scope=IssueScope.BARS)
        if unexplained.any():
            df.loc[unexplained, "flag_large_gap"] = True
            add("LARGE_UNEXPLAINED_GAP", Severity.WARNING,
                "large gaps between consecutive bars with no session break and no nearby roll",
                idx=df.index[unexplained.values], scope=IssueScope.BARS)

    def _check_stale(self, df: pd.DataFrame, ctx: ValidationContext, add) -> None:
        now = pd.Timestamp(ctx.now or datetime.now(timezone.utc))
        now = now.tz_localize("UTC") if now.tzinfo is None else now
        step = interval_delta(ctx.interval)
        last_end = df.index[-1] + step
        age = now - last_end
        if is_intraday(ctx.interval):
            if not ctx.session.is_open_at(now.tz_convert(ctx.session.timezone)):
                return
            limit = step * self.cfg.stale_after_bars
        else:
            limit = step * self.cfg.stale_after_bars + pd.Timedelta(days=3)  # weekends/holidays
        if age > limit:
            add("STALE_DATA", Severity.WARNING,
                f"newest bar ended {age} ago (limit {limit}); the feed may be delayed or stopped",
                idx=df.index[-1:])
