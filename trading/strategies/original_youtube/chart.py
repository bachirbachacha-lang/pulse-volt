"""Verification charts for ORIGINAL_YOUTUBE_STRATEGY.

Everything drawn here comes from the scan's numbers (structure, no-wick flags,
setup life cycles). The image is for a human to check the logic against the
video; nothing reads it back.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from trading.charts import Annotation, ChartSpec, Level, close_figure, render_chart
from trading.core.schemas import ClosedTrade, ExitReason, MarketData, PositionSide
from trading.strategies.original_youtube.strategy import ScanResult, SetupStatus

STATUS_COLOR = {
    SetupStatus.WON: "#2e7d32", SetupStatus.LOST: "#c62828", SetupStatus.CLOSED: "#6d4c41",
    SetupStatus.OPEN: "#1565c0", SetupStatus.PENDING: "#1565c0", SetupStatus.CANCELLED: "#9e9e9e",
    SetupStatus.REJECTED: "#bdbdbd",
}


def scan_chart_spec(md: MarketData, result: ScanResult, last_n: int | None = 250,
                    start: pd.Timestamp | None = None, end: pd.Timestamp | None = None) -> ChartSpec:
    df = md.frame
    idx = df.index
    if start is None:
        start = idx[-last_n] if last_n and last_n < len(idx) else idx[0]
    else:
        last_n = None
    end = end if end is not None else idx[-1]
    notes: list[Annotation] = []
    levels: list[Level] = []
    trades: list[ClosedTrade] = []

    for t, row in result.flags.loc[start:end].iterrows():
        if row["nowick_bull"]:
            notes.append(Annotation(t, df.at[t, "low"], marker="^", color="#26a69a", size=14))
        elif row["nowick_bear"]:
            notes.append(Annotation(t, df.at[t, "high"], marker="v", color="#ef5350", size=14))

    for e in result.structure.events:
        t = idx[e.index]
        if t < start or t > end:
            continue
        label = {"BOS": "BOS", "CHOCH": "CHoCH", "TREND_START": "trend"}[e.kind]
        if e.kind == "CHOCH":
            label += " (A)" if e.note.startswith("A") else " (C)"
        price = df["high"].iat[e.index] if e.direction == "bullish" else df["low"].iat[e.index]
        notes.append(Annotation(t, price, text=label, color="#2e7d32" if e.direction == "bullish" else "#c62828"))

    for s in result.setups:
        if s.nowick_time < start or s.nowick_time > end:
            continue
        color = STATUS_COLOR[s.status]
        tag = ("L" if s.direction == "long" else "Sh") + f" {s.category.value}{'+S' if s.s_setup else ''}"
        notes.append(Annotation(s.nowick_time, s.nowick_open, text=f"{tag}: {s.status.value}", color=color,
                                marker="o", size=22))
        if s.status in (SetupStatus.REJECTED,):
            continue
        end = s.exit_time if s.exit_time is not None else idx[min(s.nowick_index + 10, len(idx) - 1)]
        levels += [
            Level(s.entry, "", "other", start=s.nowick_time, end=end),
            Level(s.stop, "", "stop", start=s.nowick_time, end=end),
            Level(s.target, "", "target", start=s.nowick_time, end=end),
        ]
        if s.fill_price is not None and s.exit_price is not None:
            sign = 1 if s.direction == "long" else -1
            gross = sign * (s.exit_price - s.fill_price)
            reason = {"target": ExitReason.TARGET}.get(s.exit_reason or "", ExitReason.STOP
                                                       if "stop" in (s.exit_reason or "") else ExitReason.MANUAL)
            trades.append(ClosedTrade(
                symbol=md.symbol, side=PositionSide.LONG if s.direction == "long" else PositionSide.SHORT,
                quantity=1, entry_price=s.fill_price, exit_price=s.exit_price,
                entry_time=s.fill_time.to_pydatetime(), exit_time=s.exit_time.to_pydatetime(),
                gross_pnl=gross, commission=0.0, net_pnl=gross, exit_reason=reason,
            ))

    summary = result.summary()
    title = (f"{md.symbol} {md.interval}  ORIGINAL_YOUTUBE_STRATEGY  "
             f"won {summary['won']} / lost {summary['lost']} / cancelled {summary['cancelled']} "
             f"[{md.quality.value if md.quality else 'UNVALIDATED'}]")
    return ChartSpec(
        title=title,
        overlays={"protective level (HL/LH)": result.structure.protective_level},
        levels=levels, trades=trades, annotations=notes, last_n=last_n, height=9,
        start=start if last_n is None else None, end=end if last_n is None else None,
    )


def render_scan(md: MarketData, result: ScanResult, path: str | Path, last_n: int | None = 250) -> Path:
    fig = render_chart(md, scan_chart_spec(md, result, last_n), path)
    close_figure(fig)
    return Path(path)


def setups_table(result: ScanResult) -> pd.DataFrame:
    rows = []
    for s in result.setups:
        rows.append({
            "nowick_time": s.nowick_time, "direction": s.direction, "category": s.category.value,
            "s_setup": s.s_setup, "entry_mode": s.entry_mode, "clean_trend": s.clean_trend,
            "status": s.status.value,
            "entry": s.entry, "stop": s.stop, "target": s.target, "risk_units": round(s.raw_risk_units, 1),
            "omar_entry": s.omar_entry, "fill_time": s.fill_time, "exit_time": s.exit_time,
            "exit_price": s.exit_price, "r": s.r_multiple, "reason": s.reason or s.exit_reason or "",
        })
    return pd.DataFrame(rows)
