"""Discord webhook notifications for the PAPER / SIMULATION system.

Notifications only: messages are produced *from* the trading system's own
state after it has been updated; nothing ever reads back from Discord, and a
Discord problem can never change, block or crash the simulator.

Security:
* The webhook URL (which contains the secret token) is read only from the
  environment variable named in ``[discord] webhook_env_var``. It is never
  written to logs, messages or error reports (it is redacted everywhere).
* Only ``https://discord.com/api/webhooks/...`` style URLs are accepted, so a
  mis-set variable cannot send simulation data to an arbitrary host.
* ``allowed_mentions`` is empty, so no message can ping @everyone / roles.

Reliability:
* Messages go through a bounded queue to a background thread, so a slow or
  unreachable Discord never delays a trading decision.
* Each message is retried with exponential backoff (and Discord's
  ``retry_after`` on HTTP 429); after the last attempt it is logged and dropped.
"""

from __future__ import annotations

import queue
import re
import threading
import time
from typing import Any, Protocol

from trading.config.settings import DiscordSettings
from trading.core.log import get_logger, log_event
from trading.core.schemas import SIMULATION_LABEL, AccountState, ClosedTrade, PaperFill, Signal, ValidationReport

logger = get_logger("notifications.discord")
MAX_CONTENT = 2000  # Discord message limit
HEADER = f"**[{SIMULATION_LABEL}]**"
WEBHOOK_RE = re.compile(r"^https://(?:(?:ptb|canary)\.)?discord(?:app)?\.com/api/webhooks/\d+/[\w-]+$")
_URL_RE = re.compile(r"https?://\S+")


class _Poster(Protocol):
    def post(self, url: str, json: dict[str, Any], timeout: float) -> Any: ...


def redact(text: str, secret: str | None = None) -> str:
    """Remove the webhook (and any URL) from text that may be logged."""
    if secret:
        text = text.replace(secret, "[REDACTED]")
    return _URL_RE.sub("[REDACTED-URL]", text)


def mark(content: str) -> str:
    """Every message carries the PAPER / SIMULATION label and fits Discord's limit."""
    body = content if content.startswith(HEADER) else f"{HEADER}\n{content}"
    return body[:MAX_CONTENT]


class DiscordNotifier:
    def __init__(self, settings: DiscordSettings, http: _Poster | None = None, *, background: bool = False,
                 sleep=time.sleep) -> None:
        self.settings = settings
        self._http = http
        self._sleep = sleep
        self.sent = 0
        self.failed = 0
        self.dropped = 0
        self._queue: queue.Queue[str | None] | None = None
        self._worker: threading.Thread | None = None
        if background and settings.enabled:
            self._queue = queue.Queue(maxsize=settings.queue_size)
            self._worker = threading.Thread(target=self._run, name="discord-notifier", daemon=True)
            self._worker.start()

    # ------------------------------------------------------------------ config
    @property
    def active(self) -> bool:
        return self.settings.enabled and (self.settings.dry_run or self._valid_url() is not None)

    def _valid_url(self) -> str | None:
        url = self.settings.webhook_url
        if not url:
            return None
        return url if WEBHOOK_RE.match(url.strip()) else None

    # ------------------------------------------------------------------ public
    def send(self, content: str) -> bool:
        """Queue (background mode) or deliver a message. Never raises."""
        try:
            if not self.settings.enabled:
                return False
            message = mark(content)
            if self._queue is not None:
                try:
                    self._queue.put_nowait(message)
                    return True
                except queue.Full:
                    self.dropped += 1
                    log_event(logger, "discord.queue_full", level=30, dropped=self.dropped)
                    return False
            return self._deliver(message)
        except Exception as exc:  # pragma: no cover - last-resort guard
            log_event(logger, "discord.error", level=40, error=redact(repr(exc), self.settings.webhook_url))
            return False

    def flush(self, timeout: float = 10.0) -> None:
        """Wait (bounded) for queued messages to be delivered."""
        if self._queue is None:
            return
        deadline = time.monotonic() + timeout
        while self._queue.unfinished_tasks and time.monotonic() < deadline:
            time.sleep(0.02)

    def close(self, timeout: float = 10.0) -> None:
        if self._queue is None:
            return
        self.flush(timeout)
        try:
            self._queue.put_nowait(None)
        except queue.Full:
            pass
        if self._worker is not None:
            self._worker.join(timeout=1.0)
        self._queue = None

    # ------------------------------------------------------------------ delivery
    def _run(self) -> None:
        assert self._queue is not None
        q = self._queue
        while True:
            item = q.get()
            try:
                if item is None:
                    return
                self._deliver(item)
            except Exception as exc:  # the worker must never die
                log_event(logger, "discord.error", level=40, error=redact(repr(exc), self.settings.webhook_url))
            finally:
                q.task_done()

    def _deliver(self, message: str) -> bool:
        s = self.settings
        if s.dry_run:
            log_event(logger, "discord.dry_run", content=message)
            return True
        url = self._valid_url()
        if url is None:
            reason = "not set" if not s.webhook_url else "not a Discord webhook URL (refused)"
            log_event(logger, "discord.no_webhook", level=30, env_var=s.webhook_env_var, reason=reason)
            self.failed += 1
            return False
        http = self._http
        if http is None:
            import requests

            http = requests
        payload = {"content": message, "username": s.username, "allowed_mentions": {"parse": []}}
        delay = s.backoff_seconds
        for attempt in range(1, s.max_attempts + 1):
            status, retry_after, error = None, None, None
            try:
                resp = http.post(url, json=payload, timeout=s.timeout_seconds)
                status = getattr(resp, "status_code", None)
                if status is not None and 200 <= status < 300:
                    self.sent += 1
                    log_event(logger, "discord.sent", attempt=attempt, status=status)
                    return True
                if status == 429:
                    try:
                        retry_after = float(resp.json().get("retry_after", delay))
                    except Exception:
                        retry_after = delay
                elif status is not None and 400 <= status < 500:
                    error = f"HTTP {status} (not retried)"
                    log_event(logger, "discord.rejected", level=40, status=status)
                    break
            except Exception as exc:  # network errors, timeouts, ...
                error = redact(repr(exc), s.webhook_url)
            log_event(logger, "discord.retry", level=30, attempt=attempt, status=status, error=error)
            if attempt < s.max_attempts:
                self._sleep(min(retry_after if retry_after is not None else delay, 30.0))
                delay *= 2
        self.failed += 1
        log_event(logger, "discord.failed", level=40, attempts=s.max_attempts,
                  note="message dropped; the simulator continues")
        return False


# ---------------------------------------------------------------------- formatters
# Messages are built only from trading-system data: never from environment
# variables, settings secrets or exception text.

def _money(v: float | None) -> str:
    if v is None:
        return "n/a"
    return f"{'-' if v < 0 else ''}${abs(v):,.2f}"


def _num(v: float | None) -> str:
    return "n/a" if v is None else f"{v:,.2f}"


def format_paper_signal(strategy: str, symbol: str, direction: str, time_: str, setup: str) -> str:
    return "\n".join([
        HEADER, "**PAPER SIGNAL DETECTED**",
        f"Strategy: {strategy}", f"Symbol: {symbol}", f"Direction: {direction.upper()}",
        f"Time: {time_}", f"Setup: {setup}",
    ])


def format_agent_decision(symbol: str, time_: str, votes: dict[str, str | None], approved: bool,
                          reason: str) -> str:
    def v(x: str | None) -> str:
        return "✓" if x == "approve" else "✕" if x == "reject" else "– (not run)"

    lines = [
        HEADER, f"**AGENT DECISION** · {symbol} · {time_}",
        f"Signal Agent: {v(votes.get('signal_analyst'))}",
        f"Risk Agent: {v(votes.get('risk_manager'))}",
        f"Execution Agent: {v(votes.get('execution_validator'))}",
        "", f"Consensus: **{'APPROVED' if approved else 'REJECTED'}**",
    ]
    if not approved:
        lines.append(f"Reason: {reason[:900]}")
    return "\n".join(lines)


def format_trade_opened(strategy: str, symbol: str, direction: str, entry: float, stop: float | None,
                        target: float | None, size: float, balance: float) -> str:
    return "\n".join([
        HEADER, "**PAPER TRADE OPENED**",
        f"Strategy: {strategy}", f"Symbol: {symbol}", f"Direction: {direction.upper()}",
        f"Simulated Entry: {_num(entry)}", f"Stop: {_num(stop)}", f"Target: {_num(target)}",
        f"Size: {size:g}", f"Virtual Balance: {_money(balance)}",
    ])


def trade_result(net_pnl: float, tolerance: float = 0.005) -> str:
    return "WIN" if net_pnl > tolerance else "LOSS" if net_pnl < -tolerance else "BREAKEVEN"


def format_trade_closed(t: ClosedTrade, balance: float, strategy: str | None = None) -> str:
    return "\n".join([
        HEADER, "**PAPER TRADE CLOSED**", f"**{trade_result(t.net_pnl)}**",
        *( [f"Strategy: {strategy}"] if strategy else [] ),
        f"Symbol: {t.symbol} ({t.side.value.upper()})",
        f"Entry: {_num(t.entry_price)}", f"Exit: {_num(t.exit_price)}",
        f"P&L: {'+' if t.net_pnl > 0 else ''}{_money(t.net_pnl)}",
        f"Exit reason: {t.exit_reason.value}", f"Updated virtual balance: {_money(balance)}",
    ])


# Older one-line formatters (kept for existing callers).
def format_signal(s: Signal) -> str:
    levels = "".join(f" {k}={v:,.2f}" for k, v in (("stop", s.stop), ("target", s.target)) if v is not None)
    return f"SIGNAL {s.strategy} {s.symbol} {s.interval} {s.action.value} @ {s.price:,.2f}{levels} ({s.reason})"


def format_fill(f: PaperFill) -> str:
    return f"FILL {f.symbol} {f.side.value} {f.quantity:g} @ {f.price:,.2f} (comm {f.commission:.2f})"


def format_trade(t: ClosedTrade) -> str:
    return (f"CLOSED {t.symbol} {t.side.value} {t.quantity:g}: {t.entry_price:,.2f} -> {t.exit_price:,.2f} "
            f"net {t.net_pnl:+,.2f} ({t.exit_reason.value})")


def format_account(a: AccountState) -> str:
    return (f"ACCOUNT equity {a.equity:,.2f} cash {a.cash:,.2f} realised {a.realized_pnl:+,.2f} "
            f"open {a.open_positions} trades {a.trade_count}")


def format_quality(r: ValidationReport) -> str:
    codes = ", ".join(sorted(i.code for i in r.issues if i.severity != "info")) or "none"
    return f"DATA {r.symbol} {r.interval}: {r.status.value} (issues: {codes})"
