"""Writes a backtest's tables, charts and a Markdown summary to disk."""

from __future__ import annotations

import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from trading.backtests.metrics import drawdown, equity_curve  # noqa: E402
from trading.backtests.runner import BacktestResult, cost_impact, read_test_ledger, regime_tables  # noqa: E402
from trading.charts import close_figure, render_chart  # noqa: E402
from trading.config.settings import Settings  # noqa: E402
from trading.strategies.original_youtube.chart import scan_chart_spec  # noqa: E402

PERIOD_COLORS = {"development": "#e3f2fd", "validation": "#fff8e1", "test": "#fce4ec", "post_test": "#f1f8e9"}
METRIC_ROWS = [
    ("trades", "Trades", "{:.0f}"), ("wins", "Wins", "{:.0f}"), ("losses", "Losses", "{:.0f}"),
    ("win_rate", "Win rate", "{:.1%}"), ("gross_profit", "Gross profit", "{:,.0f}"),
    ("gross_loss", "Gross loss", "{:,.0f}"), ("net_pnl", "Net P&L", "{:,.0f}"), ("net_r", "Net R", "{:+.2f}"),
    ("avg_win", "Average win", "{:,.0f}"), ("avg_loss", "Average loss", "{:,.0f}"),
    ("largest_win", "Largest win", "{:,.0f}"), ("largest_loss", "Largest loss", "{:,.0f}"),
    ("profit_factor", "Profit factor", "{:.2f}"), ("expectancy", "Expectancy / trade", "{:,.1f}"),
    ("expectancy_r", "Expectancy (R)", "{:+.3f}"), ("max_drawdown", "Max drawdown", "{:,.0f}"),
    ("max_drawdown_pct", "Max drawdown %", "{:.2%}"), ("max_consecutive_wins", "Max consecutive wins", "{:.0f}"),
    ("max_consecutive_losses", "Max consecutive losses", "{:.0f}"), ("total_costs", "Total costs", "{:,.0f}"),
]


def _fmt(v, f: str) -> str:
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return "n/a"
    if isinstance(v, float) and math.isinf(v):
        return "inf"
    return f.format(v)


def metrics_table(metrics: dict[str, dict]) -> str:
    cols = list(metrics)
    head = "| Metric | " + " | ".join(cols) + " |\n|---|" + "---|" * len(cols) + "\n"
    body = "".join(f"| {label} | " + " | ".join(_fmt(metrics[c].get(k), f) for c in cols) + " |\n"
                   for k, label, f in METRIC_ROWS)
    return head + body


def _shade(ax, res: BacktestResult, x0, x1) -> None:
    sp = res.split
    bounds = [("development", sp.start, sp.dev_end), ("validation", sp.dev_end, sp.val_end)]
    if res.include_test:
        bounds.append(("test", sp.val_end, sp.test_end))
    for name, a, b in bounds:
        ax.axvspan(pd.Timestamp(a), pd.Timestamp(b), color=PERIOD_COLORS[name], alpha=0.8, lw=0, label=name)


def plot_equity_and_drawdown(res: BacktestResult, balance: float, out: Path) -> tuple[Path, Path]:
    t = res.trades
    eq = equity_curve(t, balance)
    dd = drawdown(pd.concat([pd.Series([balance]), eq]).reset_index(drop=True))
    fig, ax = plt.subplots(figsize=(12, 4.5))
    if len(t):
        _shade(ax, res, None, None)
        ax.step(eq.index, eq.to_numpy(), where="post", color="#1565c0", lw=1.4)
    ax.axhline(balance, color="#9e9e9e", lw=0.8, ls="--")
    ax.set_title(f"{res.strategy}: closed-trade equity (risk-normalised sizing)", loc="left", fontsize=11)
    ax.legend(loc="upper left", fontsize=8)
    ax.grid(alpha=0.2)
    fig.tight_layout()
    p1 = out / "equity_curve.png"
    fig.savefig(p1, dpi=120)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(12, 3))
    if len(t):
        ax.fill_between(range(len(dd)), dd.to_numpy(), 0, color="#c62828", alpha=0.35, step="post")
    ax.set_title("Drawdown from peak (account currency), by trade number", loc="left", fontsize=11)
    ax.set_xlabel("trade #")
    ax.grid(alpha=0.2)
    fig.tight_layout()
    p2 = out / "drawdown.png"
    fig.savefig(p2, dpi=120)
    plt.close(fig)
    return p1, p2


def plot_distribution(res: BacktestResult, out: Path) -> Path:
    t = res.trades
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    if len(t):
        axes[0].hist(t["net_r"], bins=np.arange(-1.6, 1.61, 0.1), color="#5c6bc0", edgecolor="white")
        axes[0].axvline(0, color="black", lw=0.8)
        t["exit_reason"].fillna("?").str.replace(r" \(.*\)", "", regex=True).value_counts().plot.barh(
            ax=axes[1], color="#8d6e63")
    axes[0].set_title("Net R per trade (after costs)", loc="left", fontsize=10)
    axes[1].set_title("Exit reasons", loc="left", fontsize=10)
    fig.tight_layout()
    p = out / "trade_distribution.png"
    fig.savefig(p, dpi=120)
    plt.close(fig)
    return p


def plot_regimes(tables: dict[str, pd.DataFrame], out: Path) -> Path | None:
    keys = [k for k in ("trend_regime", "vol_regime", "session", "direction", "weekday", "category") if k in tables]
    if not keys:
        return None
    fig, axes = plt.subplots(2, 3, figsize=(14, 7))
    for ax, k in zip(axes.flat, keys):
        tb = tables[k].assign(**{k: tables[k][k].map(str)}).sort_values(k)
        colors = ["#2e7d32" if v > 0 else "#c62828" for v in tb["expectancy_r"]]
        ax.bar(tb[k], tb["expectancy_r"], color=colors)
        for x, (n, e) in enumerate(zip(tb["trades"], tb["expectancy_r"])):
            ax.annotate(f"n={n}", (x, e), ha="center", va="bottom" if e >= 0 else "top", fontsize=7)
        ax.axhline(0, color="black", lw=0.6)
        ax.set_title(f"Expectancy (R) by {k}", loc="left", fontsize=9)
        ax.tick_params(axis="x", labelsize=7, rotation=30)
    fig.tight_layout()
    p = out / "regimes.png"
    fig.savefig(p, dpi=120)
    plt.close(fig)
    return p


def plot_examples(res: BacktestResult, out: Path, n_random: int = 3, seed: int = 7) -> list[Path]:
    t = res.trades
    if t.empty:
        return []
    picks = {"best": t.loc[t["net_r"].idxmax()], "worst": t.loc[t["net_r"].idxmin()]}
    rest = t.drop(index=[picks["best"].name, picks["worst"].name], errors="ignore")
    for i, (_, row) in enumerate(rest.sample(min(n_random, len(rest)), random_state=seed).iterrows()):
        picks[f"random_{i + 1}"] = row
    paths = []
    (out / "examples").mkdir(exist_ok=True)
    for label, row in picks.items():
        run = next(r for r in res.runs if r.symbol == row["symbol"])
        idx = run.md.frame.index
        a = max(int(row["nowick_index"]) - 60, 0)
        b = min(int(row["exit_index"]) + 20, len(idx) - 1)
        spec = scan_chart_spec(run.md, run.result, start=idx[a], end=idx[b])
        spec.title = (f"{label}: {row['symbol']} {row['direction']} {row['category']}"
                      f"{'+S' if row['s_setup'] else ''}  net {row['net_r']:+.2f}R  ({row['exit_reason']})")
        p = out / "examples" / f"{label}.png"
        close_figure(render_chart(run.md, spec, p))
        paths.append(p)
    return paths


def write_report(res: BacktestResult, settings: Settings, out_dir: Path, title: str | None = None) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    balance = settings.account.starting_balance
    res.trades.to_csv(out_dir / "trades.csv", index=False)
    res.open_trades.to_csv(out_dir / "open_trades.csv", index=False)
    res.setup_funnel.to_csv(out_dir / "setup_funnel.csv", index=False)
    (out_dir / "metrics.json").write_text(json.dumps({"metrics": res.metrics,
                                                      "metrics_excluding_suspect_data": res.metrics_clean_data},
                                                     indent=2, default=str))
    (out_dir / "integrity.json").write_text(json.dumps(res.integrity, indent=2))
    (out_dir / "data_quality.json").write_text(json.dumps(res.data_quality, indent=2, default=str))
    tables = regime_tables(res.trades)
    (out_dir / "regimes").mkdir(exist_ok=True)
    for k, tb in tables.items():
        tb.to_csv(out_dir / "regimes" / f"{k}.csv", index=False)

    plot_equity_and_drawdown(res, balance, out_dir)
    plot_distribution(res, out_dir)
    plot_regimes(tables, out_dir)
    plot_examples(res, out_dir)

    sp = res.split
    ledger = [e for e in read_test_ledger(settings) if e.get("split") == sp.name]
    lines = [
        f"# {title or res.strategy + ' backtest'}",
        "",
        f"- Strategy: **{res.strategy}**, interval {res.interval}, symbols {', '.join(res.symbols)}",
        f"- Split `{sp.name}` ({'created by this run' if res.split_created else 'reused, frozen'}): "
        f"development {sp.start} -> {sp.dev_end}; validation -> {sp.val_end}; test -> {sp.test_end}",
        f"- Test period {'INCLUDED' if res.include_test else 'NOT shown (untouched)'}; "
        f"test results have been viewed {len(ledger)} time(s) for this split",
        f"- Sizing: each trade risks {settings.account.starting_balance * settings.risk.max_risk_per_trade_pct / 100:,.0f} "
        f"({settings.risk.max_risk_per_trade_pct}% of {balance:,.0f}); P&L = net R x risk",
        f"- Integrity checks: {'ALL PASSED' if res.integrity_ok else 'FAILURES - results not trustworthy'}",
        "",
        "## Results (after simulated costs)",
        "",
        metrics_table(res.metrics),
        "",
        "## Results excluding trades that held through suspect bars (possible roll, gap, missing data)",
        "",
        metrics_table(res.metrics_clean_data),
        "",
        "## Cost impact (R)",
        "",
        *[f"- {k}: {v:+.2f}" for k, v in cost_impact(res.trades).items()],
        "",
        "## Warnings",
        "",
        *([f"- {w}" for w in res.warnings] or ["- none"]),
        "",
        "## Integrity checks",
        "",
        *[f"- [{'x' if c['passed'] else ' '}] {c['check']} {c['detail']}" for c in res.integrity],
        "",
        "## Regimes (expectancy in R)",
        "",
    ]
    for k, tb in tables.items():
        lines += [f"### {k}", "", tb.to_markdown(index=False, floatfmt=".3f"), ""]
    lines += ["## Charts", "", "![equity](equity_curve.png)", "![drawdown](drawdown.png)",
              "![distribution](trade_distribution.png)", "![regimes](regimes.png)", ""]
    path = out_dir / "REPORT.md"
    path.write_text("\n".join(lines))
    return path
