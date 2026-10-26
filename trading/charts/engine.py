"""Programmatic chart rendering (matplotlib, headless).

Charts are for humans: reviewing a backtest, eyeballing a data-quality flag,
or comparing against TradingView. Agents never read these images; they read
the same numbers from ``MarketData.frame`` and the indicator columns.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Sequence

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from trading.core.schemas import ClosedTrade, MarketData, PaperFill, Side, Signal, SignalAction  # noqa: E402

UP = "#26a69a"
DOWN = "#ef5350"
FLAG = "#ffb300"
OVERLAY_COLORS = ["#1e88e5", "#8e24aa", "#fb8c00", "#43a047", "#6d4c41", "#00acc1"]


@dataclass
class Level:
    """A horizontal level (stop, target...) drawn from ``start`` to ``end``."""

    price: float
    label: str = ""
    kind: str = "stop"  # "stop" | "target" | "other"
    start: pd.Timestamp | None = None
    end: pd.Timestamp | None = None


@dataclass
class Annotation:
    """A marker and/or text label at a bar (e.g. BOS / CHoCH, a detected setup)."""

    timestamp: pd.Timestamp
    price: float
    text: str = ""
    color: str = "#424242"
    marker: str | None = None  # matplotlib marker, e.g. "^", "v", "o"
    size: float = 40.0


@dataclass
class ChartSpec:
    title: str | None = None
    overlays: dict[str, pd.Series] = field(default_factory=dict)  # drawn on the price pane
    panels: dict[str, pd.Series | pd.DataFrame] = field(default_factory=dict)  # one extra pane each
    signals: Sequence[Signal] = ()
    fills: Sequence[PaperFill] = ()
    trades: Sequence[ClosedTrade] = ()
    levels: Sequence[Level] = ()
    annotations: Sequence[Annotation] = ()
    show_volume: bool = True
    show_flags: bool = True
    last_n: int | None = None
    width: float = 14.0
    height: float = 8.0


def _positions(index: pd.DatetimeIndex, stamps: Iterable[pd.Timestamp]) -> np.ndarray:
    """Map timestamps to integer bar positions (bars are drawn on an evenly spaced axis
    so session gaps and weekends do not leave holes)."""
    stamps = pd.DatetimeIndex([pd.Timestamp(s) for s in stamps])
    if len(stamps) == 0:
        return np.array([], dtype=int)
    if stamps.tz is None and index.tz is not None:
        stamps = stamps.tz_localize(index.tz)
    elif index.tz is not None:
        stamps = stamps.tz_convert(index.tz)
    pos = index.searchsorted(stamps, side="right") - 1
    return np.clip(pos, 0, len(index) - 1)


def render_chart(md: MarketData, spec: ChartSpec | None = None, path: str | Path | None = None) -> plt.Figure:
    spec = spec or ChartSpec()
    df = md.frame
    if spec.last_n:
        df = df.iloc[-spec.last_n:]
    if df.empty:
        raise ValueError("nothing to chart: frame is empty")
    idx = df.index
    x = np.arange(len(df))

    n_panels = 1 + int(spec.show_volume) + len(spec.panels)
    ratios = [4] + ([1] if spec.show_volume else []) + [1.3] * len(spec.panels)
    fig, axes = plt.subplots(n_panels, 1, sharex=True, figsize=(spec.width, spec.height),
                             gridspec_kw={"height_ratios": ratios})
    axes = np.atleast_1d(axes)
    ax = axes[0]

    # --- candles
    o, h, l, c = (df[k].to_numpy() for k in ("open", "high", "low", "close"))
    up = c >= o
    colors = np.where(up, UP, DOWN)
    ax.vlines(x, l, h, color=colors, linewidth=0.8)
    body_lo = np.minimum(o, c)
    body_h = np.maximum(np.abs(c - o), (h.max() - l.min()) * 0.0005)
    ax.bar(x, body_h, bottom=body_lo, width=0.7, color=colors, edgecolor=colors, linewidth=0.5)

    # --- data-quality flags
    if spec.show_flags and "flag_any" in df.columns:
        for pos in np.flatnonzero(df["flag_any"].to_numpy()):
            ax.axvspan(pos - 0.5, pos + 0.5, color=FLAG, alpha=0.18, linewidth=0)
        if "flag_roll_suspect" in df.columns:
            for pos in np.flatnonzero(df["flag_roll_suspect"].to_numpy()):
                ax.annotate("roll?", (pos, h[pos]), xytext=(0, 8), textcoords="offset points",
                            ha="center", fontsize=7, color="#e65100")

    # --- overlays
    for i, (name, series) in enumerate(spec.overlays.items()):
        s = series.reindex(idx)
        ax.plot(x, s.to_numpy(), label=name, linewidth=1.1, color=OVERLAY_COLORS[i % len(OVERLAY_COLORS)])

    # --- levels
    for lvl in spec.levels:
        x0 = _positions(idx, [lvl.start])[0] if lvl.start is not None else 0
        x1 = _positions(idx, [lvl.end])[0] if lvl.end is not None else len(df) - 1
        color = {"stop": DOWN, "target": UP}.get(lvl.kind, "#757575")
        ax.hlines(lvl.price, x0, x1, colors=color, linestyles="--", linewidth=1)
        if lvl.label:
            ax.text(x1, lvl.price, f" {lvl.label} {lvl.price:,.2f}", va="center", fontsize=7, color=color)

    # --- signals
    in_range = [s for s in spec.signals if idx[0] <= pd.Timestamp(s.timestamp) <= idx[-1]]
    for sig in in_range:
        pos = _positions(idx, [sig.timestamp])[0]
        if sig.action == SignalAction.ENTER_LONG:
            ax.scatter(pos, l[pos] * 0.998, marker="^", s=70, color=UP, zorder=5, edgecolors="black")
        elif sig.action == SignalAction.ENTER_SHORT:
            ax.scatter(pos, h[pos] * 1.002, marker="v", s=70, color=DOWN, zorder=5, edgecolors="black")
        elif sig.action == SignalAction.EXIT:
            ax.scatter(pos, c[pos], marker="x", s=60, color="black", zorder=5)
        for level, kind in ((sig.stop, "stop"), (sig.target, "target")):
            if level is not None:
                ax.hlines(level, pos, min(pos + 15, len(df) - 1), colors=DOWN if kind == "stop" else UP,
                          linestyles=":", linewidth=1)

    # --- fills / trades (entry and exit markers)
    for f in spec.fills:
        if not (idx[0] <= pd.Timestamp(f.timestamp) <= idx[-1]):
            continue
        pos = _positions(idx, [f.timestamp])[0]
        ax.scatter(pos, f.price, marker=">" if f.side == Side.BUY else "<", s=55,
                   color=UP if f.side == Side.BUY else DOWN, zorder=6, edgecolors="black")
    for t in spec.trades:
        e, xpos = _positions(idx, [t.entry_time, t.exit_time])
        ax.plot([e, xpos], [t.entry_price, t.exit_price], color=UP if t.net_pnl >= 0 else DOWN,
                linewidth=1.2, linestyle="-", alpha=0.8)
        ax.scatter([e], [t.entry_price], marker="o", s=30, color="white", edgecolors="black", zorder=6)
        ax.scatter([xpos], [t.exit_price], marker="s", s=30, color="black", zorder=6)

    # --- annotations
    for a in spec.annotations:
        if not (idx[0] <= pd.Timestamp(a.timestamp) <= idx[-1]):
            continue
        pos = _positions(idx, [a.timestamp])[0]
        if a.marker:
            ax.scatter(pos, a.price, marker=a.marker, s=a.size, color=a.color, zorder=7, linewidths=0.5)
        if a.text:
            ax.annotate(a.text, (pos, a.price), xytext=(0, 6), textcoords="offset points", ha="center",
                        fontsize=6.5, color=a.color)

    status = md.quality.value if md.quality else "UNVALIDATED"
    ax.set_title(spec.title or f"{md.symbol}  {md.interval}  [{status}]", fontsize=11, loc="left")
    if spec.overlays:
        ax.legend(loc="upper left", fontsize=8)
    ax.grid(alpha=0.2)

    # --- volume
    k = 1
    if spec.show_volume:
        axes[k].bar(x, df["volume"].to_numpy(), color=colors, width=0.7, alpha=0.7)
        axes[k].set_ylabel("Vol", fontsize=8)
        axes[k].grid(alpha=0.2)
        k += 1

    # --- extra panels (RSI, MACD...)
    for name, data in spec.panels.items():
        pax = axes[k]
        frame = data.to_frame(name) if isinstance(data, pd.Series) else data
        for j, col in enumerate(frame.columns):
            pax.plot(x, frame[col].reindex(idx).to_numpy(), linewidth=1,
                     color=OVERLAY_COLORS[j % len(OVERLAY_COLORS)], label=str(col))
        pax.set_ylabel(name, fontsize=8)
        pax.grid(alpha=0.2)
        if frame.shape[1] > 1:
            pax.legend(loc="upper left", fontsize=7)
        k += 1

    # --- time axis labels
    ticks = np.linspace(0, len(df) - 1, num=min(10, len(df))).astype(int)
    fmt = "%Y-%m-%d" if md.interval in {"1d", "5d", "1wk", "1mo", "3mo"} else "%m-%d %H:%M"
    axes[-1].set_xticks(ticks)
    axes[-1].set_xticklabels([idx[t].strftime(fmt) for t in ticks], rotation=30, ha="right", fontsize=8)
    fig.tight_layout()

    if path is not None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(path, dpi=120)
    return fig


def close_figure(fig: plt.Figure) -> None:
    plt.close(fig)
