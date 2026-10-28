"""Performance statistics for a list of closed trades (one row per trade)."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd


def _streaks(wins: np.ndarray) -> tuple[int, int]:
    best_w = best_l = cur_w = cur_l = 0
    for w in wins:
        if w:
            cur_w, cur_l = cur_w + 1, 0
        else:
            cur_l, cur_w = cur_l + 1, 0
        best_w, best_l = max(best_w, cur_w), max(best_l, cur_l)
    return best_w, best_l


def equity_curve(trades: pd.DataFrame, starting_balance: float, column: str = "net_pnl") -> pd.Series:
    """Equity after each trade, ordered by exit time (closed-trade equity)."""
    if trades.empty:
        return pd.Series([starting_balance], dtype=float)
    t = trades.sort_values(["exit_time", "entry_time"])
    eq = starting_balance + t[column].cumsum()
    return pd.Series(eq.to_numpy(), index=pd.DatetimeIndex(t["exit_time"]), name="equity")


def drawdown(equity: pd.Series) -> pd.Series:
    peak = equity.cummax()
    return equity - peak


def compute_metrics(trades: pd.DataFrame, starting_balance: float) -> dict[str, float | int]:
    """Metrics on net (after-cost) P&L. A trade is a win if its net P&L is > 0."""
    n = len(trades)
    if n == 0:
        return {"trades": 0, "wins": 0, "losses": 0, "win_rate": math.nan, "gross_profit": 0.0, "gross_loss": 0.0,
                "net_pnl": 0.0, "avg_win": math.nan, "avg_loss": math.nan, "largest_win": math.nan,
                "largest_loss": math.nan, "profit_factor": math.nan, "expectancy": math.nan,
                "expectancy_r": math.nan, "net_r": 0.0, "max_drawdown": 0.0, "max_drawdown_pct": 0.0,
                "max_consecutive_wins": 0, "max_consecutive_losses": 0, "total_costs": 0.0}
    t = trades.sort_values(["exit_time", "entry_time"])
    pnl = t["net_pnl"].to_numpy(float)
    wins_mask = pnl > 0
    gp = float(pnl[wins_mask].sum())
    gl = float(pnl[~wins_mask].sum())
    eq = equity_curve(t, starting_balance)
    dd = drawdown(pd.concat([pd.Series([starting_balance]), pd.Series(eq.to_numpy())], ignore_index=True))
    peak = pd.concat([pd.Series([starting_balance]), pd.Series(eq.to_numpy())], ignore_index=True).cummax()
    w_streak, l_streak = _streaks(wins_mask)
    return {
        "trades": n,
        "wins": int(wins_mask.sum()),
        "losses": int((~wins_mask).sum()),
        "win_rate": float(wins_mask.mean()),
        "gross_profit": gp,
        "gross_loss": gl,
        "net_pnl": float(pnl.sum()),
        "avg_win": float(pnl[wins_mask].mean()) if wins_mask.any() else math.nan,
        "avg_loss": float(pnl[~wins_mask].mean()) if (~wins_mask).any() else math.nan,
        "largest_win": float(pnl.max()) if wins_mask.any() else math.nan,
        "largest_loss": float(pnl.min()) if (~wins_mask).any() else math.nan,
        "profit_factor": (gp / -gl) if gl < 0 else (math.inf if gp > 0 else math.nan),
        "expectancy": float(pnl.mean()),
        "expectancy_r": float(t["net_r"].mean()),
        "net_r": float(t["net_r"].sum()),
        "max_drawdown": float(dd.min()),
        "max_drawdown_pct": float((dd / peak).min()),
        "max_consecutive_wins": w_streak,
        "max_consecutive_losses": l_streak,
        "total_costs": float(t["costs"].sum()) if "costs" in t else 0.0,
    }


def group_metrics(trades: pd.DataFrame, by: str) -> pd.DataFrame:
    rows = []
    for key, g in trades.groupby(by, observed=True, dropna=False):
        pnl = g["net_pnl"]
        gp, gl = pnl[pnl > 0].sum(), pnl[pnl <= 0].sum()
        rows.append({by: key, "trades": len(g), "win_rate": float((pnl > 0).mean()),
                     "net_pnl": float(pnl.sum()), "expectancy_r": float(g["net_r"].mean()),
                     "profit_factor": float(gp / -gl) if gl < 0 else math.nan})
    return pd.DataFrame(rows).sort_values("trades", ascending=False) if rows else pd.DataFrame()
