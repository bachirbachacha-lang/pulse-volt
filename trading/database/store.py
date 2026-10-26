"""SQLite persistence for everything the paper-trading system decides.

Each record is stored with a few indexed columns for querying plus the full
pydantic model as JSON, so the exact object can be reloaded after a restart.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator, TypeVar

from pydantic import BaseModel

from trading.core.log import get_logger, log_event
from trading.core.schemas import (
    AccountState,
    AgentDecision,
    ClosedTrade,
    ConsensusResult,
    PaperFill,
    PaperOrder,
    PaperPosition,
    RiskDecision,
    Signal,
    ValidationReport,
    utcnow,
)

logger = get_logger("database")
SCHEMA_VERSION = 2
M = TypeVar("M", bound=BaseModel)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS data_quality (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL, interval TEXT NOT NULL, request_key TEXT,
    status TEXT NOT NULL, rows_in INTEGER, rows_out INTEGER,
    checked_at TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY, strategy TEXT, symbol TEXT, action TEXT,
    ts TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS agent_decisions (
    id TEXT PRIMARY KEY, signal_id TEXT, agent TEXT, verdict TEXT, kind TEXT,
    ts TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS consensus (
    signal_id TEXT PRIMARY KEY, approved INTEGER, ts TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, symbol TEXT, side TEXT, status TEXT, signal_id TEXT,
    ts TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS fills (
    id TEXT PRIMARY KEY, order_id TEXT, symbol TEXT, side TEXT,
    ts TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS positions (
    symbol TEXT PRIMARY KEY, side TEXT, quantity REAL, updated_at TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS closed_trades (
    id TEXT PRIMARY KEY, symbol TEXT, side TEXT, net_pnl REAL, exit_reason TEXT,
    entry_ts TEXT, exit_ts TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS account_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT, cash REAL, equity REAL, ts TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, ts TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY, bar_time TEXT NOT NULL, symbol TEXT NOT NULL, interval TEXT, strategy TEXT,
    outcome TEXT NOT NULL, stage TEXT, signal_id TEXT, order_id TEXT, created_at TEXT NOT NULL,
    payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_evaluations_symbol_bar ON evaluations(symbol, bar_time);
CREATE INDEX IF NOT EXISTS ix_signals_symbol_ts ON signals(symbol, ts);
CREATE INDEX IF NOT EXISTS ix_fills_symbol_ts ON fills(symbol, ts);
CREATE INDEX IF NOT EXISTS ix_trades_symbol_ts ON closed_trades(symbol, exit_ts);
CREATE INDEX IF NOT EXISTS ix_decisions_signal ON agent_decisions(signal_id);
"""


def _iso(ts: datetime) -> str:
    return ts.isoformat()


class Database:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        if str(path) != ":memory:":
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(path), isolation_level=None, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        if str(path) != ":memory:":
            self._conn.execute("PRAGMA journal_mode = WAL")
        self._migrate()

    def close(self) -> None:
        self._conn.close()

    def __enter__(self) -> "Database":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        self._conn.execute("BEGIN")
        try:
            yield self._conn
        except BaseException:
            self._conn.execute("ROLLBACK")
            raise
        else:
            self._conn.execute("COMMIT")

    def _migrate(self) -> None:
        self._conn.executescript(_SCHEMA)
        row = self._conn.execute("SELECT version FROM schema_version").fetchone()
        if row is None:
            self._conn.execute("INSERT INTO schema_version (version) VALUES (?)", (SCHEMA_VERSION,))
        elif row["version"] > SCHEMA_VERSION:
            raise RuntimeError(f"database schema v{row['version']} is newer than this code (v{SCHEMA_VERSION})")
        elif row["version"] < SCHEMA_VERSION:
            # v1 -> v2 only adds the evaluations table, created above by CREATE TABLE IF NOT EXISTS.
            self._conn.execute("UPDATE schema_version SET version = ?", (SCHEMA_VERSION,))

    @property
    def schema_version(self) -> int:
        return int(self._conn.execute("SELECT version FROM schema_version").fetchone()["version"])

    # ----------------------------------------------------------------- writes
    def _exec(self, sql: str, params: tuple) -> None:
        self._conn.execute(sql, params)

    def save_validation_report(self, report: ValidationReport, request_key: str | None = None) -> None:
        self._exec(
            "INSERT INTO data_quality (symbol, interval, request_key, status, rows_in, rows_out, checked_at, payload)"
            " VALUES (?,?,?,?,?,?,?,?)",
            (report.symbol, report.interval, request_key, report.status.value, report.rows_in, report.rows_out,
             _iso(report.checked_at), report.model_dump_json()),
        )

    def save_signal(self, s: Signal) -> None:
        self._exec(
            "INSERT OR REPLACE INTO signals (id, strategy, symbol, action, ts, payload) VALUES (?,?,?,?,?,?)",
            (s.id, s.strategy, s.symbol, s.action.value, _iso(s.timestamp), s.model_dump_json()),
        )

    def save_decision(self, d: AgentDecision) -> None:
        kind = "risk" if isinstance(d, RiskDecision) else "agent"
        self._exec(
            "INSERT OR REPLACE INTO agent_decisions (id, signal_id, agent, verdict, kind, ts, payload)"
            " VALUES (?,?,?,?,?,?,?)",
            (d.id, d.signal_id, d.agent, d.verdict.value, kind, _iso(d.timestamp), d.model_dump_json()),
        )

    def save_consensus(self, c: ConsensusResult) -> None:
        self._exec(
            "INSERT OR REPLACE INTO consensus (signal_id, approved, ts, payload) VALUES (?,?,?,?)",
            (c.signal_id, int(c.approved), _iso(c.timestamp), c.model_dump_json()),
        )

    def save_order(self, o: PaperOrder) -> None:
        self._exec(
            "INSERT OR REPLACE INTO orders (id, symbol, side, status, signal_id, ts, payload) VALUES (?,?,?,?,?,?,?)",
            (o.id, o.symbol, o.side.value, o.status.value, o.signal_id, _iso(o.created_at), o.model_dump_json()),
        )

    def save_fill(self, f: PaperFill) -> None:
        self._exec(
            "INSERT OR REPLACE INTO fills (id, order_id, symbol, side, ts, payload) VALUES (?,?,?,?,?,?)",
            (f.id, f.order_id, f.symbol, f.side.value, _iso(f.timestamp), f.model_dump_json()),
        )

    def save_position(self, p: PaperPosition) -> None:
        self._exec(
            "INSERT OR REPLACE INTO positions (symbol, side, quantity, updated_at, payload) VALUES (?,?,?,?,?)",
            (p.symbol, p.side.value, p.quantity, _iso(utcnow()), p.model_dump_json()),
        )

    def save_trade(self, t: ClosedTrade) -> None:
        self._exec(
            "INSERT OR REPLACE INTO closed_trades (id, symbol, side, net_pnl, exit_reason, entry_ts, exit_ts, payload)"
            " VALUES (?,?,?,?,?,?,?,?)",
            (t.id, t.symbol, t.side.value, t.net_pnl, t.exit_reason.value, _iso(t.entry_time), _iso(t.exit_time),
             t.model_dump_json()),
        )

    def save_account(self, a: AccountState) -> None:
        self._exec(
            "INSERT INTO account_snapshots (cash, equity, ts, payload) VALUES (?,?,?,?)",
            (a.cash, a.equity, _iso(a.timestamp), a.model_dump_json()),
        )

    def save_evaluation(self, ev: dict[str, Any]) -> None:
        """Store one decision-system evaluation (the full audit record) as JSON."""
        self._exec(
            "INSERT OR REPLACE INTO evaluations (id, bar_time, symbol, interval, strategy, outcome, stage, signal_id,"
            " order_id, created_at, payload) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (ev["id"], str(ev["bar_time"]), ev["symbol"], ev.get("interval"), ev.get("strategy"), ev["outcome"],
             ev.get("stage"), ev.get("signal_id"), ev.get("order_id"), str(ev["created_at"]),
             json.dumps(ev, default=str)),
        )

    def evaluations(self, symbol: str | None = None, outcome: str | None = None) -> list[dict[str, Any]]:
        sql, params = "SELECT payload FROM evaluations", []
        where = []
        if symbol:
            where.append("symbol = ?")
            params.append(symbol)
        if outcome:
            where.append("outcome = ?")
            params.append(outcome)
        if where:
            sql += " WHERE " + " AND ".join(where)
        return [json.loads(r["payload"]) for r in self._conn.execute(sql + " ORDER BY bar_time, created_at", params)]

    def evaluation(self, evaluation_id: str) -> dict[str, Any] | None:
        row = self._conn.execute("SELECT payload FROM evaluations WHERE id = ?", (evaluation_id,)).fetchone()
        return json.loads(row["payload"]) if row else None

    def order(self, order_id: str) -> PaperOrder | None:
        rows = self._load(PaperOrder, "SELECT payload FROM orders WHERE id=?", (order_id,))
        return rows[0] if rows else None

    def log_event(self, event: str, **payload: Any) -> None:
        self._exec(
            "INSERT INTO events (event, ts, payload) VALUES (?,?,?)",
            (event, _iso(utcnow()), json.dumps(payload, default=str)),
        )
        log_event(logger, "db.event", name=event)

    # ------------------------------------------------------------------ reads
    def _load(self, model: type[M], sql: str, params: tuple = ()) -> list[M]:
        return [model.model_validate_json(r["payload"]) for r in self._conn.execute(sql, params)]

    def signals(self, symbol: str | None = None) -> list[Signal]:
        if symbol:
            return self._load(Signal, "SELECT payload FROM signals WHERE symbol=? ORDER BY ts", (symbol,))
        return self._load(Signal, "SELECT payload FROM signals ORDER BY ts")

    def decisions(self, signal_id: str) -> list[AgentDecision]:
        out: list[AgentDecision] = []
        for r in self._conn.execute(
            "SELECT kind, payload FROM agent_decisions WHERE signal_id=? ORDER BY ts", (signal_id,)
        ):
            cls = RiskDecision if r["kind"] == "risk" else AgentDecision
            out.append(cls.model_validate_json(r["payload"]))
        return out

    def consensus(self, signal_id: str) -> ConsensusResult | None:
        rows = self._load(ConsensusResult, "SELECT payload FROM consensus WHERE signal_id=?", (signal_id,))
        return rows[0] if rows else None

    def orders(self, status: str | None = None) -> list[PaperOrder]:
        if status:
            return self._load(PaperOrder, "SELECT payload FROM orders WHERE status=? ORDER BY ts", (status,))
        return self._load(PaperOrder, "SELECT payload FROM orders ORDER BY ts")

    def fills(self, symbol: str | None = None) -> list[PaperFill]:
        if symbol:
            return self._load(PaperFill, "SELECT payload FROM fills WHERE symbol=? ORDER BY ts", (symbol,))
        return self._load(PaperFill, "SELECT payload FROM fills ORDER BY ts")

    def positions(self) -> list[PaperPosition]:
        return self._load(PaperPosition, "SELECT payload FROM positions ORDER BY symbol")

    def trades(self, symbol: str | None = None) -> list[ClosedTrade]:
        if symbol:
            return self._load(ClosedTrade, "SELECT payload FROM closed_trades WHERE symbol=? ORDER BY exit_ts",
                              (symbol,))
        return self._load(ClosedTrade, "SELECT payload FROM closed_trades ORDER BY exit_ts")

    def latest_account(self) -> AccountState | None:
        rows = self._load(AccountState, "SELECT payload FROM account_snapshots ORDER BY id DESC LIMIT 1")
        return rows[0] if rows else None

    def validation_reports(self, symbol: str | None = None) -> list[ValidationReport]:
        if symbol:
            return self._load(ValidationReport, "SELECT payload FROM data_quality WHERE symbol=? ORDER BY id",
                              (symbol,))
        return self._load(ValidationReport, "SELECT payload FROM data_quality ORDER BY id")

    def events(self, event: str | None = None) -> list[dict[str, Any]]:
        sql, params = "SELECT event, ts, payload FROM events", ()
        if event:
            sql, params = sql + " WHERE event=?", (event,)
        return [{"event": r["event"], "ts": r["ts"], **json.loads(r["payload"])}
                for r in self._conn.execute(sql + " ORDER BY id", params)]

    def count(self, table: str) -> int:
        allowed = {"signals", "agent_decisions", "consensus", "orders", "fills", "positions", "closed_trades",
                   "account_snapshots", "events", "data_quality", "evaluations"}
        if table not in allowed:
            raise ValueError(f"unknown table {table}")
        return int(self._conn.execute(f"SELECT COUNT(*) AS n FROM {table}").fetchone()["n"])
