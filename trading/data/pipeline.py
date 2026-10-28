"""YFINANCE -> RAW -> VALIDATOR -> CLEAN, with caching.

Typical use::

    pipeline = MarketDataPipeline.from_settings(get_settings())
    md = pipeline.load("ES=F", interval="1h", period="60d")
    if md.has_quality_warning:
        print(md.report.status, md.report.codes())
"""

from __future__ import annotations

from datetime import datetime

import pandas as pd

from trading.config.settings import Settings
from trading.core.log import get_logger, log_event
from trading.core.schemas import MarketData
from trading.data.cache import DataStore
from trading.data.instruments import classify_symbol
from trading.data.sources import DataRequest, MarketDataSource, YFinanceSource
from trading.data.validation import DataValidator

logger = get_logger("data.pipeline")


class MarketDataPipeline:
    def __init__(self, settings: Settings, source: MarketDataSource, store: DataStore,
                 validator: DataValidator) -> None:
        self.settings = settings
        self.source = source
        self.store = store
        self.validator = validator

    @classmethod
    def from_settings(cls, settings: Settings, source: MarketDataSource | None = None) -> "MarketDataPipeline":
        store = DataStore(settings.raw_dir, settings.clean_dir, settings.cache_dir,
                          ttl_bars=settings.market_data.cache_ttl_bars)
        return cls(settings, source or YFinanceSource(), store, DataValidator(settings))

    def request(
        self,
        symbol: str,
        *,
        interval: str | None = None,
        period: str | None = None,
        start: str | None = None,
        end: str | None = None,
        timezone: str | None = None,
        prepost: bool | None = None,
        auto_adjust: bool | None = None,
    ) -> DataRequest:
        md = self.settings.market_data
        if period is None and start is None:
            period = md.default_period
        return DataRequest(
            symbol=symbol,
            interval=interval or md.default_interval,
            period=period,
            start=start,
            end=end,
            timezone=timezone or md.timezone,
            auto_adjust=md.auto_adjust if auto_adjust is None else auto_adjust,
            prepost=md.prepost if prepost is None else prepost,
        )

    def fetch_raw(self, request: DataRequest, *, force: bool = False) -> tuple[pd.DataFrame, bool]:
        """Return (raw frame, came_from_cache)."""
        use_cache = self.settings.market_data.cache_enabled and not force
        if use_cache and self.store.is_fresh(request):
            cached = self.store.load_raw(request)
            if cached is not None:
                log_event(logger, "market_data.cache_hit", symbol=request.symbol, key=request.key(), rows=len(cached))
                return cached, True
        raw = self.source.fetch(request)
        self.store.save_raw(request, raw, getattr(self.source, "name", "unknown"))
        return raw, False

    def load_request(self, request: DataRequest, *, force: bool = False, now: datetime | None = None) -> MarketData:
        raw, cached = self.fetch_raw(request, force=force)
        ctx = self.validator.context_for(
            request.symbol,
            request.interval,
            timezone_name=request.timezone,
            prepost=request.prepost,
            # Only a request that runs up to "now" can be stale.
            check_staleness=request.end is None,
            now=now,
        )
        clean, report = self.validator.validate(raw, ctx)
        self.store.save_clean(request, clean, report)
        md = MarketData(
            symbol=request.symbol,
            interval=request.interval,
            timezone=request.timezone,
            asset_class=classify_symbol(request.symbol, self.settings),
            source=getattr(self.source, "name", "unknown"),
            frame=clean,
            is_clean=True,
            report=report,
            request_key=request.key(),
        )
        log_event(
            logger,
            "market_data.ready",
            symbol=request.symbol,
            interval=request.interval,
            rows=len(clean),
            status=report.status,
            from_cache=cached,
        )
        return md

    def load(self, symbol: str, *, force: bool = False, now: datetime | None = None, **kwargs) -> MarketData:
        return self.load_request(self.request(symbol, **kwargs), force=force, now=now)
