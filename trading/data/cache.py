"""Local storage for raw and clean datasets plus a download cache index.

Layout (under ``trading/data``)::

    raw/<key>.pkl        exactly what the source returned (normalised columns only)
    clean/<key>.pkl      validator output
    clean/<key>.report.json
    cache/index.json     request -> fetched_at, rows, whether it can expire

A request whose end date is in the past never expires: Yahoo will not change
it, so it is never downloaded twice. A request that reaches "now" is fresh for
``cache_ttl_bars`` bar intervals.
"""

from __future__ import annotations

import json
import os
import tempfile
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

from trading.core.log import get_logger, log_event
from trading.core.schemas import ValidationReport
from trading.data.instruments import interval_delta
from trading.data.sources import DataRequest

logger = get_logger("data.cache")


def _atomic_write_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def _atomic_to_pickle(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
    os.close(fd)
    try:
        df.to_pickle(tmp)
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


class DataStore:
    def __init__(self, raw_dir: Path, clean_dir: Path, cache_dir: Path, ttl_bars: float = 1.0) -> None:
        self.raw_dir = raw_dir
        self.clean_dir = clean_dir
        self.cache_dir = cache_dir
        self.ttl_bars = ttl_bars
        self.index_path = cache_dir / "index.json"

    # ------------------------------------------------------------------ index
    def _load_index(self) -> dict[str, Any]:
        if not self.index_path.exists():
            return {}
        try:
            return json.loads(self.index_path.read_text())
        except json.JSONDecodeError:
            log_event(logger, "cache.index_corrupt", level=30, path=self.index_path)
            return {}

    def _save_index(self, index: dict[str, Any]) -> None:
        _atomic_write_bytes(self.index_path, json.dumps(index, indent=2, default=str).encode())

    def entry(self, request: DataRequest) -> dict[str, Any] | None:
        return self._load_index().get(request.key())

    # ------------------------------------------------------------------ raw
    def raw_path(self, request: DataRequest) -> Path:
        return self.raw_dir / f"{request.key()}.pkl"

    def save_raw(self, request: DataRequest, df: pd.DataFrame, source: str) -> Path:
        path = self.raw_path(request)
        _atomic_to_pickle(df, path)
        index = self._load_index()
        index[request.key()] = {
            "request": asdict(request),
            "source": source,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "rows": len(df),
            "first": str(df.index[0]) if len(df) else None,
            "last": str(df.index[-1]) if len(df) else None,
            "historical": request.is_historical,
        }
        self._save_index(index)
        log_event(logger, "cache.raw_saved", key=request.key(), rows=len(df), path=path)
        return path

    def is_fresh(self, request: DataRequest, now: datetime | None = None) -> bool:
        entry = self.entry(request)
        if not entry or not self.raw_path(request).exists():
            return False
        if entry.get("historical"):
            return True
        now = now or datetime.now(timezone.utc)
        fetched = datetime.fromisoformat(entry["fetched_at"])
        ttl = interval_delta(request.interval) * self.ttl_bars
        return (now - fetched) < ttl.to_pytimedelta()

    def load_raw(self, request: DataRequest) -> pd.DataFrame | None:
        path = self.raw_path(request)
        if not path.exists():
            return None
        try:
            return pd.read_pickle(path)
        except Exception as exc:  # corrupt or truncated file: treat as a miss
            log_event(logger, "cache.raw_unreadable", level=30, path=path, error=repr(exc))
            return None

    # ------------------------------------------------------------------ clean
    def clean_path(self, request: DataRequest) -> Path:
        return self.clean_dir / f"{request.key()}.pkl"

    def save_clean(self, request: DataRequest, df: pd.DataFrame, report: ValidationReport) -> Path:
        path = self.clean_path(request)
        _atomic_to_pickle(df, path)
        _atomic_write_bytes(
            self.clean_dir / f"{request.key()}.report.json",
            report.model_dump_json(indent=2).encode(),
        )
        log_event(logger, "cache.clean_saved", key=request.key(), rows=len(df), status=report.status)
        return path

    def clear(self) -> None:
        for d in (self.raw_dir, self.clean_dir):
            for p in d.glob("*"):
                if p.suffix in {".pkl", ".json"}:
                    p.unlink()
        self.index_path.unlink(missing_ok=True)
