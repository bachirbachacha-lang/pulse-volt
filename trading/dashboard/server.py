"""PAPER / SIMULATION dashboard server (read-only).

    python -m trading dashboard            # http://127.0.0.1:8050

A small standard-library HTTP server: it serves the static page and a JSON API
that reads the existing SQLite state and validated market-data cache through
:class:`StateReader`. It exposes no endpoint that changes anything, and binds
to localhost by default.
"""

from __future__ import annotations

import json
import math
import mimetypes
from collections import defaultdict
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import numpy as np
import pandas as pd

from trading.config.settings import Settings
from trading.core.log import get_logger
from trading.core.schemas import SIMULATION_LABEL
from trading.dashboard.data import StateReader

logger = get_logger("dashboard")
STATIC = Path(__file__).parent / "static"


def _json_default(o: Any) -> Any:
    if isinstance(o, (pd.Timestamp,)):
        return o.isoformat()
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.floating):
        v = float(o)
        return None if math.isnan(v) or math.isinf(v) else v
    if isinstance(o, np.bool_):
        return bool(o)
    return str(o)


def _clean(o: Any) -> Any:
    if isinstance(o, float):
        return None if math.isnan(o) or math.isinf(o) else o
    if isinstance(o, dict):
        return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_clean(v) for v in o]
    return o


def analytics(reader: StateReader) -> dict[str, Any]:
    trades = reader.trades()
    by_setup: dict[str, list[dict]] = defaultdict(list)
    by_dir: dict[str, list[dict]] = defaultdict(list)
    for t in trades:
        by_setup[t["setup"].replace(" setup", "") or "unknown"].append(t)
        by_dir[t["direction"]].append(t)

    def grp(groups: dict[str, list[dict]]) -> list[dict]:
        return [{"key": k, **reader.trade_stats(v), "net_pnl": sum(t["net_pnl"] for t in v)}
                for k, v in sorted(groups.items())]

    recent = trades[-20:]
    return {"by_setup": grp(by_setup), "by_direction": grp(by_dir),
            "recent": [{"id": t["id"], "exit_time": t["exit_time"], "net_pnl": t["net_pnl"], "r": t["r"],
                        "result": t["result"]} for t in recent],
            "recent_stats": reader.trade_stats(recent), "equity": reader.equity_curve()}


class Handler(BaseHTTPRequestHandler):
    reader: StateReader
    server_version = "PaperSimulationDashboard/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:  # quiet
        logger.debug(fmt % args)

    def _send(self, status: int, body: bytes, ctype: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, data: Any, status: int = 200) -> None:
        body = json.dumps(_clean(data), default=_json_default).encode()
        self._send(status, body, "application/json")

    def do_POST(self) -> None:  # noqa: N802 - the dashboard is read-only
        self._json({"error": "read-only dashboard"}, HTTPStatus.METHOD_NOT_ALLOWED)

    do_PUT = do_DELETE = do_PATCH = do_POST

    def do_GET(self) -> None:  # noqa: N802
        url = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        r = self.reader
        try:
            if url.path in ("/", "/index.html"):
                return self._static("index.html")
            if url.path.startswith("/static/"):
                return self._static(url.path[len("/static/"):])
            if url.path == "/api/overview":
                return self._json({"label": SIMULATION_LABEL, "account": r.account(), "positions": r.positions(),
                                   "pending": r.pending_orders(), "symbols": r.symbols(),
                                   "latest_decisions": r.evaluations(limit=30)})
            if url.path == "/api/trades":
                return self._json({"label": SIMULATION_LABEL, "trades": list(reversed(r.trades()))})
            if url.path.startswith("/api/trade/"):
                d = r.trade_detail(url.path.rsplit("/", 1)[-1])
                return self._json(d) if d else self._json({"error": "trade not found"}, 404)
            if url.path == "/api/decisions":
                return self._json({"decisions": r.evaluations(q.get("symbol"), int(q.get("limit", 40)))})
            if url.path.startswith("/api/decision/"):
                d = r.evaluation(url.path.rsplit("/", 1)[-1])
                return self._json(d) if d else self._json({"error": "evaluation not found"}, 404)
            if url.path == "/api/market":
                sym = q.get("symbol") or (r.symbols() or [None])[0]
                md = r.latest_market(sym, q.get("interval")) if sym else None
                if md is None:
                    return self._json({"symbol": sym, "candles": [], "error": "no validated market data cached yet"})
                return self._json(r.chart_payload(md, bars=int(q.get("bars", 160))))
            if url.path == "/api/analytics":
                return self._json(analytics(r))
            return self._json({"error": "not found"}, 404)
        except Exception as exc:  # report, never crash the server
            logger.exception("dashboard request failed")
            return self._json({"error": f"{type(exc).__name__}: {exc}"}, 500)

    def _static(self, name: str) -> None:
        path = (STATIC / name).resolve()
        if STATIC.resolve() not in path.parents or not path.is_file():
            return self._json({"error": "not found"}, 404)
        ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        self._send(200, path.read_bytes(), ctype + ("; charset=utf-8" if ctype.startswith("text/") else ""))


def make_server(settings: Settings, host: str = "127.0.0.1", port: int = 8050) -> ThreadingHTTPServer:
    handler = type("BoundHandler", (Handler,), {"reader": StateReader(settings)})
    return ThreadingHTTPServer((host, port), handler)


def serve(settings: Settings, host: str = "127.0.0.1", port: int = 8050) -> None:
    srv = make_server(settings, host, port)
    print(f"{SIMULATION_LABEL} dashboard: http://{host}:{port}  (read-only; Ctrl+C to stop)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()
