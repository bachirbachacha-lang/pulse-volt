# Adversarial audit: PAPER / SIMULATION trading system

Starting assumption: hidden bugs were making the strategy look better than it is.
I investigated first and wrote down findings before changing any code. Then I fixed
only genuine software and data-handling bugs. **No strategy rule was changed to
improve performance.** Everything stays PAPER / SIMULATION: there is no brokerage
code anywhere.

How to re-check:

```
cd trading && python3 -m pytest -q                              # 212 tests (197 before the audit + 15 audit regressions)
cd .. && python3 -m trading.backtests.equivalence 1 2 3 ... 24  # backtest vs paper engine
```

Real Yahoo Finance data could not be downloaded from this environment (the network
policy refuses `query1/query2.finance.yahoo.com` and `fc.yahoo.com`). Every check
below used synthetic data built by the test factories. Anything that depends on how
real Yahoo data behaves is listed under UNVERIFIED ASSUMPTIONS.

---

## CRITICAL ISSUES

### C1. Risk Manager rejected almost every trade once the account was in profit (FIXED)
`agents/risk_manager.py`. Per-trade budget = **equity** × 0.5%. Total-exposure cap =
**starting balance** × 0.5%. After any profit the correctly sized trade was larger
than the cap, so it failed `current_exposure`. In the replay this made the paper
engine stop trading after its first winner (seed 7: 25 backtest trades, 1 paper trade,
44 "current_exposure" rejections). The forward-test record would have been useless.
**Fix:** the cap uses the same basis as the budget (`budget × max_open_positions`).
Test: `test_exposure_cap_uses_equity_like_the_budget`.

### C2. Paper broker entered trades on bars that gapped through the stop (FIXED, optimistic bug)
`paper_trading/engine.py`. A buy limit at 4990 with stop 4985, on a bar that opened at
4980: the broker filled the entry at 4980 (below the stop), then exited at the stop
minus slippage (4989.75). That books **+$487.50 of fake profit** on a trade that was
already invalid. The backtester correctly cancels these ("bar opened beyond the stop").
**Fix:** limit and market entries are cancelled when the entry bar opens at or beyond
the stop. Tests: `test_limit_entry_is_cancelled_when_the_bar_opens_beyond_the_stop`,
`test_market_entry_is_cancelled_...`.

### C3. With the default $1,000 account, the paper engine cannot place any ES/MES trade (DOCUMENTED, not a code bug)
0.5% of $1,000 = $5 of risk per trade. One MES contract with a 2–5 point stop risks
$10–25; one ES contract risks $100–500+. The Risk Manager correctly rejects every one
as "position size rounds to zero". The backtest P&L is risk-normalised (it pretends you
can trade 0.02 contracts), so **its dollar figures cannot be achieved at $1,000**.
**Fix (reporting only):** every backtest trade now has `min_size_risk` and
`sizable_at_account`, and the report prints how many trades the paper account could
actually place. Forex XXX/USD pairs (1,000-unit micro lots) are sizable at $1,000.
Changing the account size or risk % is your decision, not a bug fix.

---

## HIGH PRIORITY

### H1. A crash mid-bar could leave half-written state (FIXED)
Each fill, position, order and account snapshot was its own transaction, and the audit
record was written last. A crash in between could restore a trade without its cash, or
run the same bar twice (double-counting the order's wait time).
**Fix:** `Database.transaction()` nests as savepoints, and `DecisionController.step`
commits the whole bar (broker events + snapshot + audit record) in one transaction. On
any error the database **and** the in-memory broker roll back to the previous bar.
Test: `test_a_crash_mid_bar_leaves_no_half_written_state`.

### H2. Futures roll / price-jump artifacts leaked into trades (FIXED with a documented safeguard)
The validator flags the jump bar, but the swing (and so the stop distance and 1:1
target) could come from before an artificial continuous-contract jump. Example: a +55
point jump on the session before expiry produced a long setup whose stop was 59 points
away, sized off the old contract's prices. Roll dates are only *estimated* (8 days before
the third Friday), so a jump on another day is labelled "large gap / suspicious move",
not "roll".
**Fix:** system safeguard `skip_structure_across_flagged_bars` (on by default, **not a
rule from the video**, marked as such in SPEC.md). It rejects a setup when a flagged
price discontinuity (possible roll, large gap, suspicious move, bar after missing data)
lies between the protective swing and the no-wick. Backtest reports already show
results with and without trades that held through suspect bars.
Test: `test_structure_spanning_a_flagged_price_jump_is_not_traded`.

### H3. A changed strategy could keep writing to the old forward-test record (FIXED)
Only the parameter hash was checked, and only while the process was running. After a
code change and a restart, the old track record continued as if nothing had changed.
**Fix:** every audit record stores `strategy_code_version`: a hash of the strategy,
agents, fill model, paper broker and validator source code plus the parameters. If the
database holds records from a different version, the engine refuses to start and says
to begin a new paper record (a new database path).
Test: `test_a_changed_strategy_cannot_continue_the_old_paper_record`.

> Because this audit changed that code, an existing paper database must be started
> fresh. That is intended: the old record belongs to the old version.

### H4. Backtest sizing is not what the paper engine does (DOCUMENTED + reported)
Backtest: P&L = net R × fixed $ risk (fractional size). Paper: whole contracts,
rounded down, with every trade rejected that can't be sized (see C3). Same trades, same
prices, different dollar amounts. The report now states this.

### H5. Market-entry (S setup) target came from the signal close, not the actual fill (FIXED)
The backtester sets the 1:1 target from the actual fill price (open + slippage), as the
spec says. The paper engine used the signal bar's close, so its wins paid about 0.74R
instead of 1R, and its exits came 2 ticks different.
**Fix:** market entry orders carry `target_rr` (and `target_level` for the optional
wick-fill target). The broker re-anchors the take-profit to the actual fill.
Test: `test_market_entry_target_is_one_to_one_from_the_actual_fill`.

### H6. Agent 1 and order maintenance used different fill rules from the broker (FIXED)
The Signal Analyst scanned with zero costs and "touch = fill". The broker (and the
backtest) need price to trade 1 tick through a limit. So a limit that was only touched
looked "filled" to the strategy and was never cancelled when the setup was later
invalidated. The broker then filled it bars later: a trade the strategy would not take.
**Fix:** the controller passes the broker's own fill rules for the symbol to Agent 1.
Test: `test_signal_analyst_scans_with_the_brokers_fill_rules`.

### H7. Risk Manager traded a different set of setups from the strategy (FIXED)
The strategy keeps every valid no-wick pending and takes whichever is tapped first,
cancelling the others (SPEC: "When one pending order fills, the others are cancelled").
The Risk Manager rejected any new setup while an older order was pending, so the paper
engine often took the *older* setup instead.
**Fix:** pending entries for different setups on the **same** symbol are allowed. The
broker cancels the rest when one fills, so there is still at most one position per
market. A related instrument (ES while MES is pending) and the same setup twice are
still rejected.
Tests: `test_first_pending_entry_to_fill_cancels_the_others`,
`test_risk_manager_allows_another_pending_setup_on_the_same_symbol`.

### H8. A pending entry could fill inside the no-trading zone (FIXED)
If a position closed just before the zone, the paper engine evaluated a new signal on
that same bar and placed an order. The broker then filled it at 16:00, inside the
futures buffer. The strategy cancels pending orders when the zone starts.
**Fix:** the controller cancels all pending entries for the symbol whenever the current
bar is in the no-trading zone or a news window, independent of the scan.
Covered by `test_backtest_and_paper_engine_take_identical_trades[29]`.

---

## MEDIUM PRIORITY

### M1. Account-level rules exist only in the paper engine (DOCUMENTED)
The daily loss limit, the total-exposure cap and the stale-data checks are agent rules.
The backtester does not model them. With normal limits the paper engine can therefore
take *fewer* trades than the backtest. (The equivalence check opens those limits wide on
purpose so it compares only strategy and execution logic.)

### M2. Daily P&L ignored the open position's entry commission (FIXED)
`daily_pnl` (account and Risk Manager) left out the commission already paid on an open
position, so it showed a slightly smaller loss than reality.
Test: `test_daily_pnl_counts_the_open_positions_entry_commission`.

### M3. A hand-built approval object could open a paper trade (FIXED, hardening)
The broker checked that a `ConsensusResult` *looked* unanimous. Any code that built one
by hand, with three APPROVE decisions, was accepted.
**Fix:** the consensus engine seals each result with an HMAC (the key exists only in
process memory). The broker accepts only sealed results, and each one only once.
Test: `test_a_hand_built_unanimous_consensus_is_refused`.

### M4. Market-entry sizing uses the signal price, not the fill (NOT FIXED, small)
The Risk Manager sizes market entries from the signal-bar close. The fill is the next
open plus slippage, so actual risk can differ from the budget by a tick or a gap.
Whole-contract rounding usually absorbs this.

---

## LOW PRIORITY

- **L1.** Closing a position before the no-trading zone is stored as exit reason
  `manual` in the paper engine and as "closed before no-trading zone/news" in the
  backtest. Same price, different label. Not changed.
- **L2.** Swing significance (1.0 × ATR(14)), breathing room (10%) and the no-trading
  zone (17:00–18:00 ET) are interpretations or assumptions, clearly tagged in SPEC.md.
  They are not bugs, but every result depends on them.
- **L3.** The audit record stores the dataset-level data-quality status, not which bars
  were flagged. Bar flags are re-derived from the data on replay.

---

## PASSED CHECKS

- **No look-ahead in the strategy.** 80 truncation tests: scanning data cut at bar N
  gives exactly the same setups, entries, stops, targets, fills and exits up to N as
  scanning the full data.
- **No same-bar entry.** An entry is always on a bar after the no-wick
  (backtest integrity check plus paper `signal_still_current`).
- **Conservative fills:** limit needs a trade-through; stop wins a same-bar tie; no
  target credit on the bar a limit fills; gaps fill at the open; spread on the ask side.
- **Commissions and slippage** are applied on both sides in backtest and paper, and the
  backtest P&L is recomputed independently from prices (integrity check).
- **Test-period protection.** The frozen chronological split and the test ledger record
  every look at test results. No experiments are registered, so nothing was tuned.
- **Strategy vs spec, rule by rule.** Every rule in SPEC.md (structure, BOS/CHoCH, the
  3-step reversal, grades Grandma/A/S/VNG+S traded and B/C not, 10-candle window, stop +
  breathing room, 1:1 target, forex 5-pip minimum, Omar entry, came-close and
  structure-before-tap invalidation, zone and news exits, one position at a time) matches
  `OriginalParams` and the scanner. The only non-video behaviours are the two documented
  data safeguards. `strategies/experiments.py` registers no experiments.
- **Agent authority.** Signal Analyst rejection → Risk Manager and Execution Validator
  not run. Risk Manager has no broker reference and cannot create orders. Execution
  Validator cannot bypass consensus. All 8 vote combinations: only APPROVE×3 trades.
  Broker refuses missing, non-unanimous, wrong-signal, wrong-quantity, forged and reused
  approvals.
- **Database.** No duplicate orders after restart (approved setup keys restored); a
  restart never re-runs a processed bar; open positions and pending orders are restored;
  timestamps are tz-aware UTC.
- **Discord has zero authority.** Messages are built after the bar is committed, from
  stored state, and handed to a background queue as plain strings. Nothing reads back
  from Discord. Its failures are caught and logged. The webhook is read from the
  environment only and redacted from logs.
- **Backtest vs paper engine on identical data:** after the fixes, **identical on 24 of
  24 datasets (393/393 trades)**, matching entry time, direction, entry price, exit time
  and exit price.

---

## UNVERIFIED ASSUMPTIONS

- **Real yfinance behaviour** (blocked here): how `ES=F` handles rolls (when Yahoo
  switches contracts, and whether prices are back-adjusted), how often 5m/1h bars are
  missing, duplicated or revised after the fact, and the timestamp and timezone
  conventions of the live feed. The validator checks all of these, but its thresholds
  have only been tested on synthetic data.
- **Estimated roll dates** (third Friday minus 8 days) are a convention, not Yahoo's
  actual switch date.
- **Costs** (1 tick of slippage, 1-tick limit trade-through, $2.25 per contract per side,
  1.2-pip FX spread) are assumptions, not broker measurements.
- **Strategy interpretations** tagged I / D / U in SPEC.md, above all swing size,
  breathing room and the no-trading zone.
- **No news calendar is connected**, so the "close 15 minutes before red-folder news"
  rule is inactive unless news times are supplied.

## DATA QUALITY WARNINGS

- Continuous futures contracts (`ES=F`, `MES=F`, ...) always carry a
  `CONTINUOUS_CONTRACT` notice. Price levels across a roll are not one tradable
  instrument.
- A calendar-spread jump on a day that isn't the estimated roll date shows up as
  `SUSPICIOUS_MOVE` / `LARGE_UNEXPLAINED_GAP`, not `POSSIBLE_ROLL`. The new safeguard
  (H2) stops it being traded, but the trend state just after a jump should still be
  treated as suspect.
- Results labelled "excluding trades that held through suspect bars" in the backtest
  report are the safer numbers to read.

## BACKTEST / PAPER DIFFERENCES

| | Before audit | After audit |
|---|---|---|
| 24 synthetic ES datasets, wide risk limits | 393 backtest trades vs **160** paper trades, **101** identical | 393 vs **393**, **393** identical |
| Seed 7 (example) | 25 vs 1 | 25 vs 25 |
| Gap through the stop | paper books a fake profit | both: no trade |
| S-setup target | paper ≈ 0.74R, backtest 1R | both 1R from the actual fill |

Differences that remain **by design** (documented, not bugs):
1. **Dollar sizing.** Backtest = risk-normalised fractional size. Paper = whole contracts,
   or no trade (C3, H4).
2. **Account rules** (daily loss limit, exposure cap, stale data) exist only in the paper
   engine (M1).
3. **Exit label** for the zone close (L1).
4. **Catch-up bars.** If the live engine misses bars (laptop asleep, network down), it
   processes them in order but rejects *new entries* on them as "no longer current". The
   backtest has no such gaps.

---

## BEFORE vs AFTER: what changed in results

- **Backtest results:** unchanged on clean data. The only backtest-side change is the
  H2 safeguard, which removes setups whose structure spans a flagged price jump. Real
  data with rolls will lose some trades that were partly artifacts.
- **Paper engine:** it now takes the same trades as the backtest at the same prices,
  where before it took fewer, different and sometimes impossible ones (C1, C2, H5–H8).
- **None of this says the strategy is profitable.** A backtest on synthetic random-walk
  data can't measure an edge, and no real-data backtest could run here. The forward
  (paper) test must start a new record under the new code version.
