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

## Paper-trading engine (PAPER / SIMULATION)

`python -m trading paper-step -s MES=F -i 5m` runs one cycle. Run it on a schedule, e.g. every 5 minutes.

- **Virtual balance:** $1,000 by default (`[account] starting_balance`). No brokerage connection exists anywhere in the code.
- **Lifecycle:** yfinance data → validation → for every new closed bar, oldest first: strategy signal → agents 1/2/3 → consensus → paper order → simulated fill → open position → monitoring → simulated exit → P&L → account update.
- **Separate tables:** signals, orders (with fill and cancel timestamps), fills, positions and closed trades are stored separately.
- **Order types:** the strategy's own orders only. That's a limit at the no-wick open that expires after 10 candles, or a next-open market order for S setups, each with its stop and 1:1 target.
- **Fills:** use the backtest cost model (`[backtest.costs]`): spread, slippage, commission, and trade-through for limit orders. A gap past the stop fills at the open, minus slippage.
- **Account:** tracks starting balance, current virtual balance, realised and unrealised P&L, equity, peak equity and drawdown, daily P&L, open exposure and open risk.
- **Missing or failed data:** that symbol is skipped, open positions are left unchanged, and the gap is recorded. Missed bars are caught up in order once data returns.
- **Restart:** restores the account, positions, pending orders, the last processed bar and the setups already approved, so no duplicate orders are placed.
- **Account size warning:** at $1,000 with 0.5% risk per trade ($5), no ES and almost no MES stop fits the risk budget, so the risk manager rejects those trades. Raise the balance or the risk setting deliberately if you want futures trades to size.

## Discord notifications (PAPER / SIMULATION)

Discord is for notifications only. Messages are built from the system's own stored state after each step, and nothing is ever read back from Discord.

Messages sent (each starts with **[PAPER / SIMULATION]**):
- **PAPER SIGNAL DETECTED**
- **AGENT DECISION:** each agent's ✓ / ✕ and APPROVED / REJECTED with the reason. Sent only for bars that had a signal.
- **PAPER TRADE OPENED**, sent when the entry is actually filled.
- **PAPER TRADE CLOSED:** WIN / LOSS / BREAKEVEN, entry, exit, P&L, exit reason, updated virtual balance.

**To enable:**
1. Put the webhook URL only in the `DISCORD_WEBHOOK_URL` environment variable, never in a file.
2. Set `[discord] enabled = true` and `dry_run = false`.

**Security:**
- Only `https://discord.com/api/webhooks/...` URLs are accepted.
- The URL and token are redacted from every log line and error.
- `@everyone` and role mentions are disabled.

**Reliability:**
- Messages go through a bounded background queue, so they never block the engine.
- Up to 3 attempts per message with exponential backoff, honouring Discord's rate-limit wait time.
- Messages that still fail are logged and dropped.
- A Discord outage or a bug in the notifier cannot stop or change the simulation.

## Dashboard (PAPER / SIMULATION, read-only)

Run `python -m trading dashboard` and open http://127.0.0.1:8050. It refreshes every 5 seconds.

- **Reads the existing state only.** The SQLite database is opened read-only, and charts use the validated-data cache. There are no write endpoints, and the browser holds no trading state of its own.
- **Account overview:** starting balance, virtual balance, equity, today's and total P&L, current and maximum drawdown, win rate, profit factor, average win and loss, trade count, exposure.
- **Live market:**
  - candles and the strategy's stop level (HL / LH)
  - strategy setups (grey circles)
  - **SIGNAL** (violet diamond: Agent 1 approved)
  - **FILLED paper entry** (blue triangle) and paper exit (square)
  - stop and target lines, and pending limit orders
  - hover any bar for details
- **Agent panel:** SIGNAL / RISK / EXECUTION AGENT, each with ✓ / ✕ and an expandable reason listing every check, followed by the consensus result. The decision feed lets you inspect any past bar.
- **Positions and trade history.** Click a trade to open an inspector with its chart, strategy conditions, the three agent decisions, the signal, the paper order, the simulated fills and the exit.
- **Analytics:** equity curve, drawdown, wins and losses, performance by setup grade and direction, and the last 20 trades in R.
- **No external dependencies:** standard library only, and the front end loads nothing from a CDN.

## Decision system (paper trading only)

`python -m trading paper-step -s ES=F -i 5m` evaluates the latest closed bar for each symbol.

```
validated data -> AGENT 1 signal analyst -> AGENT 2 risk manager -> AGENT 3 execution validator
               -> consensus controller (all three must APPROVE) -> paper broker
```

- **Agent 1** (`agents/signal_analyst.py`) checks every strategy condition on the latest bar and lists which passed and which failed. It can only approve a setup the strategy itself produced.
- **Agent 2** (`agents/risk_manager.py`) does risk checks only:
  - the stop must equal the strategy's invalidation-based stop (never widened)
  - position size from the configured risk
  - exposure and open positions, including ES/MES and NQ/MNQ counted as the same market
  - daily loss limit
  - duplicate exposure
  - stale data
- **Agent 3** (`execution/order_validator.py`) checks that the paper order matches the signal and the risk decision exactly:
  - symbol, direction, strategy, quantity, entry, stop and target
  - the signal is still current and the data is fresh and clean
  - no duplicate of an order already placed or a setup already approved
- **Controller** (`agents/controller.py`) is the only code that submits orders. The broker refuses any opening order without an approving consensus from all three agents.
- **Audit trail:** every evaluation, including rejected opportunities and bars with no signal, is stored in the `evaluations` table. Each record holds the market state, strategy state, each agent's inputs and outputs, the consensus reason and a timestamp.
- **Strategy safety:** a fingerprint of the strategy parameters is checked on every step. Any change while running stops the system.

## Data quality

The validator returns a clean frame plus a `ValidationReport` with status `OK`, `DATA QUALITY WARNING` or `FAILED`.
It drops unusable rows (NaN or non-positive prices, broken OHLC, duplicates) and reports each one.
Bars it keeps but doesn't trust get `flag_*` columns. The execution validator rejects a signal when:

- the dataset has a warning about the series as a whole, or
- a recent bar near the signal is flagged.

For futures (`=F`), price gaps that fall in an estimated contract-roll window are flagged `POSSIBLE_ROLL`.
They are never treated as genuine moves.
