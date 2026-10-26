# Paper-trading research system (foundation stage)

**Simulated money only.** There is no live-broker code in this project, and `mode` is locked to `"paper"`.
Market data comes from **yfinance**. TradingView is optional, for visual cross-checks only.

Strategy: `strategies/original_youtube/` implements **ORIGINAL_YOUTUBE_STRATEGY**, omarnowick's No Wick strategy as taught in youtu.be/DD9A9hHYqvc. Every rule, and whether it's explicit, inferred, unknown or discretionary, is in [`strategies/original_youtube/SPEC.md`](strategies/original_youtube/SPEC.md). That package is the unoptimised reference; experiments go in a separate package.

```
YFINANCE → RAW OHLCV → DATA VALIDATION → CLEAN MARKET DATA → INDICATORS → STRATEGY ENGINE
  → SIGNAL AGENT → RISK AGENT → EXECUTION VALIDATOR → CONSENSUS ENGINE → PAPER-TRADING ENGINE
  → DATABASE → DASHBOARD + DISCORD
```

## Setup

```bash
pip install -r trading/requirements.txt
cd trading && python -m pytest          # offline test suite
cd .. && python -m trading fetch ES=F -i 1h -p 60d   # download + validate + cache, print the report
python -m trading chart ES=F -i 1h -p 60d            # same, plus reports/<key>.png
python -m trading account                            # paper account from the database
python -m trading config                             # effective configuration
python -m trading nowick ES=F -i 5m -p 30d           # run ORIGINAL_YOUTUBE_STRATEGY: setups table + chart in reports/
```

Run `python -m trading` from the repository root (the folder that contains `trading/`).

## Layout

| Folder | What it holds |
| --- | --- |
| `config/` | `settings.toml` (every tunable value) + `settings.py` (pydantic validation, env overrides) |
| `core/` | `schemas.py` shared types (`MarketData`, `Candle`, `Signal`, `PaperOrder`…), `log.py` structured JSON logging |
| `data/` | `sources.py` yfinance adapter, `cache.py` raw/clean storage, `validation.py` validator, `pipeline.py` loader, `instruments.py` sessions, intervals and roll calendar |
| `data/raw`, `data/clean`, `data/cache` | Downloaded and validated datasets (git-ignored) |
| `indicators/` | SMA, EMA, Wilder RMA, RSI, ATR, true range, MACD, Bollinger, session VWAP, rolling high/low |
| `charts/` | matplotlib chart engine: candles, volume, overlays, indicator panes, signals, fills, trades, stop/target lines, data-quality shading |
| `strategies/` | `Strategy` interface + registry; `original_youtube/` = ORIGINAL_YOUTUBE_STRATEGY (structure engine, no-wick detection, setup scanner, verification charts, SPEC.md) |
| `agents/` | `Agent`/`SignalAgent` interfaces, `ConsensusEngine` (unanimous with veto) |
| `risk/` | `RiskAgent` interface; limits in `[risk]` |
| `execution/` | `ExecutionValidator`: the data-quality and sanity gate |
| `paper_trading/` | `PaperBroker`: simulated fills, costs, slippage, positions, stops and targets, restart-safe |
| `database/` | SQLite store for every signal, decision, order, fill, position, trade, account snapshot and data-quality report |
| `notifications/` | Discord webhook notifier (off by default; URL from env var only) |
| `backtests/`, `dashboard/` | Placeholders for the next stage |
| `tests/` | pytest suite (offline; yfinance is faked) |
| `reports/`, `logs/` | Charts and `trading.jsonl` structured logs (git-ignored) |

## Data quality

The validator returns a clean frame plus a `ValidationReport` with status `OK`, `DATA QUALITY WARNING` or `FAILED`.
It drops unusable rows (NaN or non-positive prices, broken OHLC, duplicates) and reports each one.
Bars it keeps but doesn't trust get `flag_*` columns. The execution validator rejects a signal when:

- the dataset has a warning about the series as a whole, or
- a recent bar near the signal is flagged.

For futures (`=F`), price gaps that fall in an estimated contract-roll window are flagged `POSSIBLE_ROLL`.
They are never treated as genuine moves.
