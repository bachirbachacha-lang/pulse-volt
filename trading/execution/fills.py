"""Fill model: how simulated orders are filled against OHLC bars.

Used by strategy scanners (setup verification) and by the backtester. It only
decides *prices*; strategy rules decide *whether* an order exists.

Conservative by construction:

* OHLC bars do not say in what order prices traded. Whenever an outcome
  depends on that order, the fill model and its callers assume the worse case
  (see ``trading/backtests/README.md``).
* Bar prices are treated as the bid (forex) or last trade (futures). A buy is
  executed at ask = bid + spread; a buy limit needs the ask to reach it.
* A resting limit (entry or take-profit) fills only if price trades *through*
  it by ``limit_through_ticks``; a mere touch is not guaranteed in real queues.
* Stops and market orders pay ``slippage_ticks`` beyond the trigger, and fill
  at the bar open (plus slippage) when the bar gaps past the stop.

With all costs at zero and ``limit_through_ticks = 0`` it reproduces "touch =
fill" exactly (the default used for setup verification charts).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FillConfig:
    spread_ticks: float = 0.0  # full bid/ask spread
    slippage_ticks: float = 0.0  # adverse slippage on market and stop fills
    limit_through_ticks: float = 0.0  # price must trade this far beyond a limit to fill it
    commission_per_unit_side: float = 0.0  # account currency per contract (or per lot) per side
    quantity: float = 1.0  # contracts (futures) or lots of ``lot_size`` units (forex)


@dataclass(frozen=True)
class FillModel:
    tick: float
    config: FillConfig = FillConfig()

    @property
    def spread(self) -> float:
        return self.config.spread_ticks * self.tick

    @property
    def slip(self) -> float:
        return self.config.slippage_ticks * self.tick

    @property
    def through(self) -> float:
        return self.config.limit_through_ticks * self.tick

    # ---------------------------------------------------------------- entries
    def limit_entry(self, long: bool, limit: float, o: float, h: float, lo: float) -> float | None:
        if long:  # buy limit: needs ask (= bid + spread) at or below limit - through
            if lo + self.spread <= limit - self.through:
                return min(limit, o + self.spread)
            return None
        if h >= limit + self.through:  # sell limit: bid must trade through
            return max(limit, o)
        return None

    def market_entry(self, long: bool, o: float) -> float:
        return o + self.spread + self.slip if long else o - self.slip

    # ---------------------------------------------------------------- exits
    def stop_triggered(self, long: bool, stop: float, h: float, lo: float) -> bool:
        # A long position is stopped when the bid reaches the stop; a short when the ask does.
        return lo <= stop if long else h + self.spread >= stop

    def stop_exit(self, long: bool, stop: float, o: float, same_bar_as_entry: bool = False) -> float:
        if long:
            ref = stop if same_bar_as_entry else min(stop, o)
            return ref - self.slip
        ref = stop if same_bar_as_entry else max(stop, o + self.spread)
        return ref + self.slip

    def target_exit(self, long: bool, target: float, o: float, h: float, lo: float) -> float | None:
        if long:  # sell limit at target
            if h >= target + self.through:
                return max(target, o)
            return None
        if lo + self.spread <= target - self.through:  # buy limit at target
            return min(target, o + self.spread)
        return None

    def forced_exit(self, long: bool, price: float) -> float:
        """Market exit at ``price`` (e.g. a bar close before the no-trading zone)."""
        return price - self.slip if long else price + self.spread + self.slip

    def commission(self) -> float:
        return self.config.commission_per_unit_side * self.config.quantity
