# ORIGINAL_YOUTUBE_STRATEGY: No Wick Strategy (omarnowick)

**Source studied:** video 1, "No Wick Strategy (85% Win Rate Trading System + Live Backtest)" by omarnowick, youtu.be/DD9A9hHYqvc (2:33:21). I read the full transcript the user pasted. Timestamps below refer to that video.

**Not yet studied:** video 2, "How to Actually Achieve an 85% Win Rate Trading No Wick Strategy", youtu.be/VafqLoSOve8 (setup grades S / A / B / C / Grandma, "valid but not good", exceptions). Its transcript hasn't been provided yet. Video 1 says the "S setup" and the exceptions to the 3-step confirmation are mentorship material (2:27:53).

**Tags used below:**
- **[E] Explicit:** stated or clearly demonstrated by the creator.
- **[I] Inferred:** likely from examples, but not stated.
- **[U] Unknown:** not defined; the value used in code is a labelled assumption.
- **[D] Discretionary:** the creator uses judgement. The code uses a separate deterministic interpretation, which is not part of the original.

---

## 1. Strategy specification

### Strategy name
ORIGINAL_YOUTUBE_STRATEGY: No Wick strategy, core "A setup" as taught publicly.

### Market
| Rule | Tag | Source |
|---|---|---|
| Forex best pairs: CADJPY, USDCHF, USDJPY, AUDUSD, AUDCAD | E | 1:50:07 |
| Forex secondary pairs: USDCAD, AUDJPY, GBPJPY, EURUSD, GBPUSD (GBPUSD "recently not the best") | E | 1:50:19 |
| Futures: ES, MES, NQ, MNQ, oil | E | 1:54:36 |
| Analyse forex on the OANDA feed and futures on the CME feed, because no-wick candles differ between feeds | E | 1:51:00, 1:56:16 |
| Signals may be analysed on the mini and executed on the micro | E | 1:55:00 |

### Timeframe
| Rule | Tag | Source |
|---|---|---|
| Forex: 15m and higher, 15m preferred, nothing below 15m | E | 1:57:40 |
| Futures: 5m or 15m, 5m preferred | E | 1:58:47 |
| No multi-timeframe analysis | E | 1:58:09 |

### Session
| Rule | Tag | Source |
|---|---|---|
| Any session (Asia, London, New York) except the "no trading zone" | E | 1:40:16 |
| No trading zone sits "between New York and Asia session". Exact hours are set in his indicator and not stated. Code default: 17:00–18:00 New York (the CME/FX daily break, where he mentions gaps). **Confirm from the indicator.** | U | 1:17:33, 1:40:33 |
| Futures: no trades 1 hour before to 1 hour after the zone ("we stop trading anything from 1 hour before to 1 hour after") | E (stated during the live backtest as a community rule) | 2:18:04 |
| Close any open trade before the zone. Nothing is taken in it, and no no-wick that forms in it is used | E | 1:40:47 |

### Indicators
| Rule | Tag | Source |
|---|---|---|
| No-wick candles: bullish = no bottom wick (open = low); bearish = no top wick (open = high). Exact at broker precision (his indicator is "100% accurate", zoom-level exact) | E | 1:12:31, 1:15:46 |
| A bullish candle with no top wick is NOT a bullish no-wick | E | 1:13:24 |
| Market structure (his own indicator, "not 100% accurate"). The rules below are what count | E | 1:10:04 |
| No moving averages or oscillators | E | (none mentioned) |

### Market structure
| Rule | Tag | Source |
|---|---|---|
| Uptrend = higher highs and higher lows; downtrend = lower highs and lower lows | E | 9:02, 18:37 |
| BOS = break of the recent high (uptrend) or recent low (downtrend). Needs a **body close beyond the body** of that candle. Wicks never count, and any margin counts | E | 38:00–40:04 |
| A higher low / lower high is only confirmed after a BOS. Before that it is "potential" | E | 10:49, 19:20 |
| After every BOS, a new recent higher low (or lower high) is set with the "snake method": from the new extreme, walk back to the first turn | E | 13:41, 14:17 |
| Everything between the recent low and high is internal structure and is ignored | E | 14:06 |
| CHoCH = body close beyond the body of the recent higher low (uptrend) or lower high (downtrend). A wick through it is not a CHoCH | E | 25:36, 40:04, 1:05:10 |
| Trend reversal needs 3 steps: CHoCH, then a lower high (or higher low), then a BOS. Until then the market is "neutral" | E | 27:59, 58:58 |
| Only "proper" pullbacks count ("push, pullback, push"); small moves are not structure | **D** | 22:36, 58:23, 1:00:56 |
| Code interpretation: a turn counts once price retraces at least 1.0 × ATR(14) from the extreme | interpretation | |
| Which candle's body is the reference when the high/low spans several candles: code uses the candle with the extreme wick | I | |
| CHoCH followed by a move back through the old high/low ("CHoCH followed by CHoCH") is mentorship material. Code treats a body close back through the pre-CHoCH extreme as the old trend resuming | U | 2:28:16 |

### Long setup and trigger
| Rule | Tag | Source |
|---|---|---|
| Confirmed uptrend + bullish no-wick candle = buy | E | 1:20:23, 1:34:39 |
| Wait for the no-wick to close, then wait for price to come back and **tap the no-wick** (its open = its low). Entry is a **buy limit at the no-wick open** | E | 1:20:44, 1:26:46 |
| Price must come back within **max 10 candles**; the 11th is not allowed | E | 1:22:25, 1:43:34 |
| The 10 candles are counted from the first candle after the no-wick | I | 1:28:30 ("1 2 3 4 5 6 7th candle came back") |

### Short setup and trigger
Mirror of the long side: confirmed downtrend + bearish no-wick (open = high), sell limit at the no-wick open, tapped within 10 candles. [E] 1:23:38, 1:24:46

### Confirmations
| Rule | Tag | Source |
|---|---|---|
| Trend must be confirmed (3-step rule). No trading right after a CHoCH; reversal setups win about 70% and are avoided | E | 1:48:08 |
| Opposite-direction no-wicks are ignored while the trend holds | E | 1:27:50 |

### Invalidation (before entry)
| Rule | Tag | Source |
|---|---|---|
| Price comes close (forex about 2 pips, futures "a couple of ticks") without tapping, then hits TP: not valid | E | 1:38:11 |
| Code value for futures "couple of ticks": 2 ticks | I | |
| Price creates structure before tapping (a new higher low, so the tap would be a CHoCH): not valid | E | 1:39:00 |
| Code: cancel if a BOS after the no-wick fixed a new protective low/high, or the trend changes, before the tap | I (deterministic reading of that rule) | |
| Older pending orders are cancelled when the no-trading zone starts | I ("imagine as if this area doesn't exist") | 1:40:47 |
| If the bar opens beyond the stop (gap), there is no valid entry | I | |

### Stop
| Rule | Tag | Source |
|---|---|---|
| Buys: at the most recent higher low. Sells: at the most recent lower high. Plus breathing room | E | 1:21:29, 1:35:11 |
| Code uses the wick of that swing candle | I | |
| Breathing room size depends on price action. He refuses to give a fixed number publicly ("I used to say 10% or two pips") | **D** | 2:26:31 |
| Code interpretation: 10% of the entry-to-structure distance | interpretation | |
| Forex: minimum 5 pips before breathing room, otherwise no trade | E | 1:35:26 |
| Futures: "I don't mind it as much". In the backtest he skipped a 10-tick stop as "too small" | E / I | 1:35:45, 2:17:06 |
| Code default: no futures minimum (explicit rule only); configurable | | |

### Target
Fixed 1:1 risk-to-reward. [E] 1:21:41. Above 1:1 is discussed only as mentorship material. [E] 2:28:34

### Entry refinement: "Omar entry"
| Rule | Tag | Source |
|---|---|---|
| Forex: if the stop is above 10 pips, enter 2 pips before the no-wick open, and keep TP at 1:1 from the new entry | E | 1:36:23, 1:46:00 |
| Futures: discretionary, using price action such as support/resistance | **D** | 1:37:09 |
| Code: not applied to futures | | |

### Exit
| Rule | Tag | Source |
|---|---|---|
| Set and forget: TP or SL | E | 1:27:01 |
| Close before the no-trading zone | E | 1:41:07 |
| Close 15 minutes before red-folder news; trade again 15 minutes after. Futures: USD red folders. Forex: red folders of either currency (Forex Factory) | E | 1:42:16 |
| Code: supports a list of news times, but no calendar feed is connected yet | | |
| Moving the stop to break even, or closing early when "not comfortable", is done in the backtest but not taught | **D** | 2:16:06, 2:19:21, 2:25:17 |
| Code: not implemented | | |

### No-trade conditions
| Rule | Tag | Source |
|---|---|---|
| No-trading zone | E | |
| News window | E | |
| Counter-trend setups | E | |
| Neutral phase after a CHoCH | E | |
| Forex stop under 5 pips | E | |
| No-wick older than 10 candles | E | |
| Came close then hit TP | E | |
| Structure formed before the tap | E | |
| Consolidation / choppy market ("no trend, moving sideways") | **D** | 1:41:40, 2:16:38 |
| Code: not filtered in the original. The structure rules already block "no trend" phases, but not chop within a trend | | |
| A gap he wants filled first | **D** | 2:16:31 |

### Re-entry and multiple positions
| Rule | Tag | Source |
|---|---|---|
| He wouldn't take two no-wicks that share the same stop and sit close together | I | 2:14:47 |
| Code: one position at a time per symbol. While a position is open, new no-wicks are ignored. When one pending order fills, the others are cancelled | I | |
| Several no-wicks in one trend are taken one after another | E | 1:27:07, 1:29:29 |

### Special rules
| Rule | Tag | Source |
|---|---|---|
| Valid setup ≠ good setup; S setups; exceptions to the 3-step rule | U | 2:27:12 |
| Code: not implemented; may be partly covered by video 2 | | |
| Claimed results: 85% win rate; his live backtest went 8 wins, 2 losses | | 0:12, 2:24:00 |
| System safeguard, not his rule: no-wicks on bars flagged by the data validator (possible roll, missing data, ...) are not used | | |

---

## 2. Data differences that matter

- **Feed differences.** He analyses forex on OANDA and futures on CME (TradingView). yfinance forex (`=X`) comes from a different feed, so **no-wick candles will not match his chart** (he shows the same candle being a no-wick on OANDA and not on FXCM, 1:51:13). yfinance futures (`=F`) are the CME front-month continuous contract, which is closer, but rolls and missing bars still differ.
- **Contract roll.** He trades the dated contract (e.g. ESU), not a continuous series.

## 3. Verification status

- **Rule tests.** `tests/test_original_youtube.py` rebuilds the situations he explains or quizzes on:
  - BOS needs a body close
  - a wick below the higher low is not a CHoCH
  - the snake method picks the recent higher low, not the deeper swing low
  - a CHoCH alone is not a confirmed trend
  - the 10th candle is allowed and the 11th is not
  - counter-trend no-wicks are ignored
  - came close then hit TP
  - structure formed before the tap
  - no-trading zone rules
  - forex minimum stop and Omar entry

  The code gives his answer in every case.
- **Real-chart comparison: not done yet.**
  - His examples (USDCHF, ES, USDJPY, CADJPY, and the NQ 5m live backtest on a random 2024 date) don't show their dates in the transcript.
  - Yahoo Finance is also blocked in the build environment.
  - Comparing needs the example dates/times (from screenshots) and network access to yfinance.
