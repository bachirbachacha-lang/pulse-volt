# Backtester

```bash
python -m trading backtest -s ES=F NQ=F -i 5m -p 60d                 # development + validation only
python -m trading backtest -s ES=F NQ=F -i 5m -p 60d --include-test  # final look at the untouched test period (logged)
python -m trading backtest -s ES=F -i 5m -p 60d --experiment EXPERIMENT_01
```

Each run writes `reports/backtests/<STRATEGY>_<timestamp>/` with the following files:
- `REPORT.md`
- `trades.csv`, `open_trades.csv`, `setup_funnel.csv`
- `metrics.json`, `integrity.json`, `data_quality.json`, `regimes/*.csv`
- charts: equity curve, drawdown, trade distribution, regimes, and `examples/`

## Execution realism (conservative by default)

Configured in `[backtest.costs]` in `config/settings.toml`. "ticks" means pips for forex.

| Situation | Rule |
|---|---|
| Limit entry at the no-wick open | Fills only if price trades **through** it by `limit_through_ticks` (futures default: 1 tick). A touch is not a fill. A buy limit on forex needs the **ask** (bar price + spread) to reach it. |
| Entry timing | Never on the no-wick candle itself. Limit orders start on the next bar; S setups enter at the **next bar's open** plus spread and slippage. |
| Stop | Triggered when the bid (long) or ask (short) reaches it. Fills at the stop minus `slippage_ticks`, or at the **open** minus slippage if the bar gapped past it. |
| Target | A resting limit: needs trade-through like entries. A gap past the target fills at the open. |
| Stop and target in the same bar | **The stop is assumed to have filled first.** |
| Entry and stop in the same bar | Counted as a loss. |
| Entry and target in the same bar | Credited only for next-open (S) entries with the stop untouched. For a limit entry filled mid-bar, the target is **never** credited on the entry bar, because the order of prices is unknown. |
| Bar opens beyond the stop before entry | No trade. |
| No-trading zone / news | Pending orders are cancelled. Open trades exit at the last bar's close before the zone, plus spread and slippage. |
| Commission | Per contract (or lot) per side, both sides charged. |
| Sizing | Every trade risks the same money (`[risk] max_risk_per_trade_pct`), so P&L = net R × risk. Fixed 1-contract P&L is also in `trades.csv`. |

## Chronological split

- `DEVELOPMENT` / `VALIDATION` / `TEST` boundaries are created the first time a split name is used. They are frozen in `backtests/splits/<name>.json`, which should be committed.
- Data after the test end is `post_test`.
- Test results appear only with `--include-test`. Every such run is appended to `backtests/test_ledger.jsonl`.
- Experiments (`trading/strategies/experiments.py`) are compared on development and validation only.

## Integrity checks (run on every backtest, listed in REPORT.md)

- timestamps are tz-aware, unique and increasing
- the dataset didn't FAIL validation
- one setup per no-wick candle
- entry strictly after the no-wick bar
- exit at or after entry
- never two open positions
- entry/exit prices inside the bar's range (plus costs)
- no entries inside the no-trading zone
- futures P&L recomputed independently from prices

Trades that were open across bars flagged as possible rolls, gaps, missing data or suspicious moves are marked `data_suspect`. Metrics are shown with and without them.

`tests/test_backtest.py` covers the following:
- look-ahead (truncated history gives identical decisions)
- indicator/regime leakage
- same-bar entries
- timezone invariance
- DST-correct sessions
- duplicates and position state
- roll-flagged bars
- FAILED data
- fill rules and intrabar ties
- hand-calculated P&L and metrics
- split freezing and the test ledger

## Backtest vs paper engine equivalence

`python -m trading.backtests.equivalence 1 2 3` feeds the same validated bars to the
backtester and to the live path (three agents -> consensus -> paper broker, one bar at a
time) and compares every trade. Risk limits are opened wide so only strategy and execution
logic are compared. After the audit (see `trading/AUDIT.md`) they are identical; a test
(`tests/test_audit_fixes.py`) keeps it that way. Dollar sizing still differs by design:
the backtest is risk-normalised, the paper engine trades whole contracts (see the
"Position sizing feasibility" line in every report).
