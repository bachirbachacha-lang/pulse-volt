"""Helpers shared by the decision agents."""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, is_dataclass
from pathlib import Path
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


# Source code whose behaviour decides what a paper trade is: the strategy, the agents, the
# fill model and the simulated broker. Any change = a new version (audit fix H3).
FINGERPRINT_SOURCES = ("strategies/original_youtube", "agents", "execution", "paper_trading/engine.py",
                       "data/validation.py")
_TRADING_ROOT = Path(__file__).resolve().parents[1]


def code_fingerprint(params: Any = None) -> str:
    """Hash of the decision-making source code (and the strategy parameters, if given)."""
    h = hashlib.sha256()
    for rel in FINGERPRINT_SOURCES:
        p = _TRADING_ROOT / rel
        for f in sorted(p.rglob("*.py")) if p.is_dir() else [p]:
            h.update(f.relative_to(_TRADING_ROOT).as_posix().encode())
            h.update(f.read_bytes())
    if params is not None:
        h.update(params_hash(params).encode())
    return h.hexdigest()[:16]


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
