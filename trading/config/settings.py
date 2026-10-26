"""Centralised, validated configuration.

All tunable settings live in ``config/settings.toml``. This module loads that
file, applies environment overrides and validates everything with pydantic so
mistakes fail loudly at start-up instead of deep inside a run.
"""

from __future__ import annotations

import os
import tomllib
from datetime import time
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

TRADING_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG_PATH = TRADING_ROOT / "config" / "settings.toml"
ENV_PREFIX = "TRADING__"


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MarketDataSettings(_Strict):
    source: Literal["yfinance"] = "yfinance"
    symbols: list[str] = Field(default_factory=lambda: ["SPY"])
    default_interval: str = "1h"
    default_period: str = "60d"
    timezone: str = "America/New_York"
    auto_adjust: bool = False
    prepost: bool = False
    cache_enabled: bool = True
    cache_ttl_bars: float = 1.0


class ValidationSettings(_Strict):
    gap_mad_threshold: float = 12.0
    gap_lookback: int = 100
    stale_after_bars: float = 3.0
    max_missing_fraction: float = 0.02
    futures_gap_threshold: float = 0.004
    roll_window_days: int = 3
    drop_out_of_session: bool = False


class SessionSettings(_Strict):
    timezone: str
    open: time
    close: time
    days: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])
    # True when the session crosses midnight (open later in the day than close).
    overnight: bool = False

    @field_validator("days")
    @classmethod
    def _days_in_range(cls, v: list[int]) -> list[int]:
        if any(d < 0 or d > 6 for d in v):
            raise ValueError("session days must be 0 (Mon) .. 6 (Sun)")
        return v


class SessionsConfig(_Strict):
    equity: SessionSettings
    futures: SessionSettings
    crypto: SessionSettings
    forex: SessionSettings
    symbols: dict[str, Literal["equity", "futures", "crypto", "forex"]] = Field(default_factory=dict)


class AccountSettings(_Strict):
    starting_balance: float = Field(100_000.0, gt=0)
    currency: str = "USD"


class CostSettings(_Strict):
    commission_per_unit: float = Field(0.0, ge=0)
    commission_per_order: float = Field(0.0, ge=0)
    slippage_bps: float = Field(0.0, ge=0)
    slippage_ticks: int = Field(0, ge=0)
    tick_size: float = Field(0.01, gt=0)


class StrategySettings(_Strict):
    active: str = ""
    params: dict[str, Any] = Field(default_factory=dict)


class RiskSettings(_Strict):
    max_risk_per_trade_pct: float = Field(0.5, gt=0)
    max_open_positions: int = Field(1, ge=0)
    max_daily_loss_pct: float = Field(2.0, gt=0)
    require_stop: bool = True


class DiscordSettings(_Strict):
    enabled: bool = False
    webhook_env_var: str = "DISCORD_WEBHOOK_URL"
    username: str = "Paper Trader"
    dry_run: bool = True

    @property
    def webhook_url(self) -> str | None:
        return os.environ.get(self.webhook_env_var) or None


class DatabaseSettings(_Strict):
    path: Path = Path("database/paper_trading.sqlite3")


class LoggingSettings(_Strict):
    level: str = "INFO"
    directory: Path = Path("logs")
    json_file: str = "trading.jsonl"
    console: bool = True


class PathSettings(_Strict):
    raw_dir: Path = Path("data/raw")
    clean_dir: Path = Path("data/clean")
    cache_dir: Path = Path("data/cache")
    reports_dir: Path = Path("reports")


class Settings(_Strict):
    mode: Literal["paper"] = "paper"
    market_data: MarketDataSettings = Field(default_factory=MarketDataSettings)
    validation: ValidationSettings = Field(default_factory=ValidationSettings)
    sessions: SessionsConfig
    account: AccountSettings = Field(default_factory=AccountSettings)
    costs: CostSettings = Field(default_factory=CostSettings)
    contracts: dict[str, float] = Field(default_factory=dict)
    strategy: StrategySettings = Field(default_factory=StrategySettings)
    risk: RiskSettings = Field(default_factory=RiskSettings)
    discord: DiscordSettings = Field(default_factory=DiscordSettings)
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    logging: LoggingSettings = Field(default_factory=LoggingSettings)
    paths: PathSettings = Field(default_factory=PathSettings)
    # Directory relative paths resolve against. Not read from the file.
    root: Path = Field(default=TRADING_ROOT, exclude=True)

    @model_validator(mode="after")
    def _paper_only(self) -> "Settings":
        if self.mode != "paper":  # defensive; Literal already enforces it
            raise ValueError("Only paper mode is supported. Live trading is not implemented.")
        return self

    def resolve(self, p: Path) -> Path:
        return p if p.is_absolute() else (self.root / p)

    @property
    def raw_dir(self) -> Path:
        return self.resolve(self.paths.raw_dir)

    @property
    def clean_dir(self) -> Path:
        return self.resolve(self.paths.clean_dir)

    @property
    def cache_dir(self) -> Path:
        return self.resolve(self.paths.cache_dir)

    @property
    def reports_dir(self) -> Path:
        return self.resolve(self.paths.reports_dir)

    @property
    def database_path(self) -> Path:
        return self.resolve(self.database.path)

    @property
    def log_dir(self) -> Path:
        return self.resolve(self.logging.directory)

    def point_value(self, symbol: str) -> float:
        return float(self.contracts.get(symbol, 1.0))


def _coerce(value: str) -> Any:
    """Parse an env-var string as a TOML value, falling back to the raw string."""
    try:
        return tomllib.loads(f"v = {value}")["v"]
    except tomllib.TOMLDecodeError:
        return value


def _apply_env_overrides(data: dict[str, Any], environ: dict[str, str]) -> dict[str, Any]:
    for key, raw in environ.items():
        if not key.startswith(ENV_PREFIX):
            continue
        parts = [p.lower() for p in key[len(ENV_PREFIX):].split("__") if p]
        if not parts:
            continue
        node = data
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = _coerce(raw)
    return data


def load_settings(
    path: str | Path | None = None,
    *,
    environ: dict[str, str] | None = None,
    overrides: dict[str, Any] | None = None,
    root: Path | None = None,
) -> Settings:
    """Load settings from TOML, then env overrides, then explicit overrides."""
    env = dict(os.environ if environ is None else environ)
    cfg_path = Path(path or env.get("TRADING_CONFIG") or DEFAULT_CONFIG_PATH)
    with cfg_path.open("rb") as fh:
        data = tomllib.load(fh)
    data = _apply_env_overrides(data, env)
    if overrides:
        data = _deep_merge(data, overrides)
    if root is not None:
        data["root"] = root
    return Settings.model_validate(data)


def _deep_merge(base: dict[str, Any], extra: dict[str, Any]) -> dict[str, Any]:
    out = dict(base)
    for k, v in extra.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Process-wide settings singleton (call ``get_settings.cache_clear()`` to reload)."""
    return load_settings()
