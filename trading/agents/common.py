"""Helpers shared by the decision agents."""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, is_dataclass
from typing import Any

import pandas as pd
from pydantic import Field

from trading.core.schemas import MarketData, Model
from trading.data.instruments import interval_delta


class Check(Model):
    name: str
    passed: bool
    detail: str = ""


def failed(checks: list[Check]) -> list[Check]:
    return [c for c in checks if not c.passed]


def summarize(checks: list[Check]) -> str:
    bad = failed(checks)
    return "all checks passed" if not bad else "; ".join(f"{c.name}: {c.detail}" for c in bad)


def bar_close(md: MarketData) -> pd.Timestamp:
    return md.frame.index[-1] + interval_delta(md.interval)


def data_age(md: MarketData, now: pd.Timestamp) -> pd.Timedelta:
    return pd.Timestamp(now) - bar_close(md)


def stale_limit(md: MarketData, stale_after_bars: float) -> pd.Timedelta:
    return interval_delta(md.interval) * stale_after_bars


def params_hash(params: Any) -> str:
    data = asdict(params) if is_dataclass(params) else params
    return hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()[:16]


MICRO_TO_MINI = {"MES": "ES", "MNQ": "NQ", "MYM": "YM", "M2K": "RTY", "MCL": "CL", "MGC": "GC"}


def exposure_key(symbol: str) -> str:
    """Instruments that are the same market exposure share a key (ES and MES, NQ and MNQ, ...)."""
    s = symbol.upper()
    if s.endswith("=F"):
        root = s[:-2]
        return MICRO_TO_MINI.get(root, root)
    return s


class NotRun(Model):
    agent: str
    reason: str
    run: bool = Field(default=False)
