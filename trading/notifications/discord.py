"""Discord webhook notifications.

Disabled by default. The webhook URL is read only from the environment variable
named in ``[discord] webhook_env_var`` so it never lands in the repository. With
``dry_run = true`` messages are logged instead of sent.
"""

from __future__ import annotations

from typing import Any, Protocol

from trading.config.settings import DiscordSettings
from trading.core.log import get_logger, log_event
from trading.core.schemas import AccountState, ClosedTrade, PaperFill, Signal, ValidationReport

logger = get_logger("notifications.discord")
MAX_CONTENT = 2000  # Discord message limit


class _Poster(Protocol):
    def post(self, url: str, json: dict[str, Any], timeout: float) -> Any: ...


class DiscordNotifier:
    def __init__(self, settings: DiscordSettings, http: _Poster | None = None) -> None:
        self.settings = settings
        self._http = http

    @property
    def active(self) -> bool:
        return self.settings.enabled and (self.settings.dry_run or bool(self.settings.webhook_url))

    def send(self, content: str) -> bool:
        content = ("[PAPER] " + content)[:MAX_CONTENT]
        if not self.settings.enabled:
            return False
        if self.settings.dry_run:
            log_event(logger, "discord.dry_run", content=content)
            return True
        url = self.settings.webhook_url
        if not url:
            log_event(logger, "discord.no_webhook", level=30, env_var=self.settings.webhook_env_var)
            return False
        http = self._http
        if http is None:
            import requests

            http = requests
        try:
            resp = http.post(url, json={"content": content, "username": self.settings.username}, timeout=10)
            ok = 200 <= getattr(resp, "status_code", 0) < 300
        except Exception as exc:  # notifications must never break trading logic
            log_event(logger, "discord.error", level=40, error=repr(exc))
            return False
        log_event(logger, "discord.sent" if ok else "discord.failed", level=20 if ok else 30,
                  status=getattr(resp, "status_code", None))
        return ok


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
