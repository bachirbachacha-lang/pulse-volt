"""Structured logging.

Every important decision is logged as one JSON object per line (``logs/trading.jsonl``)
with a UTC timestamp, an ``event`` name and arbitrary fields, so a run can be
replayed or audited later. Console output stays human-readable.

Use :func:`log_event` rather than free-text messages for anything that matters::

    log_event(logger, "signal.generated", symbol="ES=F", action="enter_long", price=5012.25)
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import date, datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from trading.config.settings import Settings

_RESERVED = set(vars(logging.makeLogRecord({})).keys()) | {"message", "asctime"}
_configured_handlers: list[logging.Handler] = []


def _default(obj: Any) -> Any:
    if isinstance(obj, BaseModel):
        return obj.model_dump(mode="json")
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Enum):
        return obj.value
    if isinstance(obj, Path):
        return str(obj)
    if hasattr(obj, "isoformat"):  # pandas Timestamp
        return obj.isoformat()
    if hasattr(obj, "item"):  # numpy scalars
        return obj.item()
    return repr(obj)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "event": getattr(record, "event", None) or record.getMessage(),
        }
        msg = record.getMessage()
        if msg != payload["event"]:
            payload["message"] = msg
        for key, value in record.__dict__.items():
            if key not in _RESERVED and key != "event":
                payload[key] = value
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=_default, sort_keys=False)


class ConsoleFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        base = f"{self.formatTime(record, '%H:%M:%S')} {record.levelname:<7} {record.name}: {record.getMessage()}"
        extras = {k: v for k, v in record.__dict__.items() if k not in _RESERVED and k != "event"}
        if extras:
            base += " " + " ".join(f"{k}={json.dumps(v, default=_default)}" for k, v in extras.items())
        if record.exc_info:
            base += "\n" + self.formatException(record.exc_info)
        return base


def setup_logging(settings: Settings, *, force: bool = False) -> logging.Logger:
    """Configure the ``trading`` logger tree. Safe to call more than once."""
    root = logging.getLogger("trading")
    if _configured_handlers and not force:
        return root
    for h in _configured_handlers:
        root.removeHandler(h)
        h.close()
    _configured_handlers.clear()

    root.setLevel(settings.logging.level.upper())
    root.propagate = False

    log_dir = settings.log_dir
    log_dir.mkdir(parents=True, exist_ok=True)
    fh = logging.FileHandler(log_dir / settings.logging.json_file, encoding="utf-8")
    fh.setFormatter(JsonFormatter())
    _configured_handlers.append(fh)

    if settings.logging.console:
        ch = logging.StreamHandler(sys.stderr)
        ch.setFormatter(ConsoleFormatter())
        _configured_handlers.append(ch)

    for h in _configured_handlers:
        root.addHandler(h)
    return root


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name if name.startswith("trading") else f"trading.{name}")


def log_event(logger: logging.Logger, event: str, level: int = logging.INFO, **fields: Any) -> None:
    """Log a structured event. Field names must not clash with LogRecord attributes."""
    safe = {(f"{k}_" if k in _RESERVED else k): v for k, v in fields.items()}
    logger.log(level, event, extra={"event": event, **safe})
