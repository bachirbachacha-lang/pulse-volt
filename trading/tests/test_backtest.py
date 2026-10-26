"""Backtest-bug tests: look-ahead, leakage, same-bar entries, timezones, sessions,
duplicates, position state, contract rolls, bad data, P&L and intrabar ambiguity.

All data here is synthetic (random walks); these tests check the machinery, not
the strategy's merit.
"""

import json

import numpy as np
import pandas as pd
import pytest

from trading.backtests.metrics import compute_metrics
from trading.backtests.regimes import regime_features
from trading.backtests.runner import SplitPlan, load_or_create_split, read_test_ledger, run_backtest
from trading.data.instruments import session_for
from trading.data.pipeline import MarketDataPipeline
from trading.data.sources import YFinanceSource
from trading.execution.fills import FillConfig, FillModel
from trading.strategies.experiments import EXPERIMENTS, Experiment, register_experiment
from trading.strategies.original_youtube import OriginalParams, OriginalYoutubeScanner, default_definition
from trading.strategies.original_youtube.strategy import no_trade_mask
from trading.tests.conftest import FakeHistory
from trading.tests.factories import random_futures_bars

REALISTIC = FillConfig(spread_ticks=0, slippage_ticks=1, limit_through_ticks=1, commission_per_unit_side=2.25)


@pytest.fixture
def es(settings):
    return random_futures_bars(session_for("ES=F", settings), "2024-02-04", "2024-03-01", seed=3)


def clean(settings, raw, symbol="ES=F"):
    pipe = MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=FakeHistory(raw)))
    return pipe.load(symbol, interval="5m", start="2024-02-04", end="2024-03-02")


def scan(md, cfg=REALISTIC):
    return OriginalYoutubeScanner().scan(md.frame, md.symbol, md.interval, fill_config=cfg)


def key(s):
    return (s.nowick_index, s.direction, s.status.value, s.fill_index, s.fill_price, s.exit_index, s.exit_price)


# ------------------------------------------------------------------ look-ahead / leakage


def test_no_lookahead_truncated_history_gives_identical_trades(settings, es):
    md = clean(settings, es)
    full = {s.nowick_index: s for s in scan(md).setups}
    n = len(md.frame)
    for cut in (n // 3, n // 2, (3 * n) // 4):
        part = scan(md.window(end=md.frame.index[cut]))
        for s in part.setups:
            if s.exit_index is not None and s.exit_index < cut:
                assert key(s) == key(full[s.nowick_index])  # decided before the cut: identical
            # detection itself never depends on later bars
            f = full[s.nowick_index]
            assert (s.direction, s.category, s.nowick_open) == (f.direction, f.category, f.nowick_open)


def test_regime_features_use_only_past_bars(settings, es):
    df = clean(settings, es).frame
    full = regime_features(df)
    part = regime_features(df.iloc[:900])
    pd.testing.assert_frame_equal(part, full.iloc[:900])


def test_entry_never_on_the_nowick_bar(settings, es):
    # The no-wick candle's own low equals its open, so a same-bar fill would always "work".
    setups = scan(clean(settings, es)).setups
    filled = [s for s in setups if s.fill_index is not None]
    assert filled and all(s.fill_index > s.nowick_index for s in filled)


# ------------------------------------------------------------------ timezones / sessions


def test_timezone_of_source_does_not_change_trades(settings, es):
    a = scan(clean(settings, es))
    utc = es.copy()
    utc.index = utc.index.tz_convert("UTC")
    settings2 = settings.model_copy(update={"root": settings.root / "utc"})
    b = scan(clean(settings2, utc))
    assert [key(s) for s in a.setups] == [key(s) for s in b.setups]


def test_no_trade_zone_follows_new_york_time_across_dst():
    p = OriginalParams()
    stamps = pd.DatetimeIndex(["2024-01-10 16:30", "2024-07-10 16:30", "2024-01-10 15:30", "2024-07-10 19:30"],
                              tz="America/New_York").tz_convert("UTC")
    assert no_trade_mask(stamps, p, buffer_minutes=60).tolist() == [True, True, False, False]


def test_no_entries_in_zone_and_one_position_at_a_time(settings, es):
    res = run_backtest(settings, default_definition(["ES=F"], "5m"), ["ES=F"], "5m", start="2024-02-04",
                       end="2024-03-02", include_test=True,
                       pipeline=MarketDataPipeline.from_settings(
                           settings, source=YFinanceSource(history_fn=FakeHistory(es))))
    failed = [c for c in res.integrity if not c["passed"]]
    assert not failed, failed
    t = res.trades.sort_values("fill_index")
    assert (t["fill_index"].iloc[1:].to_numpy() >= t["exit_index"].iloc[:-1].to_numpy()).all()
    assert not t.duplicated(["symbol", "nowick_index"]).any()


# ------------------------------------------------------------------ data problems


def test_roll_flagged_bars_are_not_traded_and_trades_through_them_are_marked(settings, es):
    md = clean(settings, es)
    df = md.frame.copy()
    nowicks = [s for s in scan(md).setups if s.status.value != "rejected"]
    target = nowicks[3].nowick_index
    df.loc[df.index[target], ["flag_roll_suspect", "flag_any"]] = True
    rescanned = OriginalYoutubeScanner().scan(df, "ES=F", "5m", fill_config=REALISTIC)
    s = next(x for x in rescanned.setups if x.nowick_index == target)
    assert s.status.value == "rejected" and "flagged" in s.reason


def test_failed_dataset_is_not_backtested(settings):
    # 30-minute bars labelled as 5m -> INTERVAL_MISMATCH -> FAILED
    idx = pd.date_range("2024-02-05 09:30", periods=300, freq="30min", tz="America/New_York")
    raw = pd.DataFrame({"Open": 100.0, "High": 101.0, "Low": 99.0, "Close": 100.5, "Volume": 1.0}, index=idx)
    pipe = MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=FakeHistory(raw)))
    with pytest.raises(RuntimeError, match="no symbol had usable data"):
        run_backtest(settings, default_definition(["ES=F"], "5m"), ["ES=F"], "5m", start="2024-02-05",
                     end="2024-02-20", pipeline=pipe)


# ------------------------------------------------------------------ fills / intrabar ambiguity


def test_limit_needs_trade_through_and_spread():
    fm = FillModel(0.25, FillConfig(limit_through_ticks=1))
    assert fm.limit_entry(True, 100.0, 101, 101.5, 100.0) is None  # touch only
    assert fm.limit_entry(True, 100.0, 101, 101.5, 99.75) == 100.0
    fx = FillModel(0.0001, FillConfig(spread_ticks=1.0))  # buy limit needs ask = bid + 1 pip
    assert fx.limit_entry(True, 1.1000, 1.1010, 1.1012, 1.09995) is None
    assert fx.limit_entry(True, 1.1000, 1.1010, 1.1012, 1.0999) == 1.1000


def test_stop_slippage_and_gap_fill_at_open():
    fm = FillModel(0.25, FillConfig(slippage_ticks=1))
    assert fm.stop_exit(True, 100.0, o=101.0) == 99.75
    assert fm.stop_exit(True, 100.0, o=98.0) == 97.75  # gapped through: open minus slippage
    assert fm.stop_exit(False, 100.0, o=102.0) == 102.25


def test_stop_wins_when_stop_and_target_share_a_bar():
    from trading.strategies.original_youtube.strategy import Setup, SetupStatus

    s = Setup("long", 0, pd.Timestamp("2024-01-02", tz="UTC"), 100, 100, 99, 101, 1, 4, 99, 0,
              status=SetupStatus.OPEN, fill_price=100)
    closed = {}

    def close(st, j, price, reason, status):
        closed.update(price=price, reason=reason, status=status)

    OriginalYoutubeScanner._manage(s, 5, o=100, h=101.5, lo=98.5, close=close, fm=FillModel(0.25))
    assert closed["status"] == SetupStatus.LOST and closed["reason"] == "stop"


def test_target_not_credited_on_limit_entry_bar(settings):
    # Bar after the no-wick dips to the entry AND reaches the target: order unknown -> stays open.
    from trading.tests.test_original_youtube import bull_setup_df

    df = bull_setup_df([(110.0, 115.0, 107.9, 108.5)] + [(108.5, 108.9, 108.3, 108.6)] * 3)
    s = OriginalYoutubeScanner().scan(df, "ES=F", "5m").setups[0]
    assert s.fill_index == 15 and s.status.value == "open"


# ------------------------------------------------------------------ P&L and metrics


def test_pnl_hand_calculation(settings):
    from trading.backtests.runner import SymbolRun, trade_rows
    from trading.config.settings import CostEntry
    from trading.strategies.original_youtube.strategy import ScanResult, Setup, SetupStatus

    idx = pd.date_range("2024-02-05 10:00", periods=5, freq="5min", tz="America/New_York")
    df = pd.DataFrame({"open": 5000.0, "high": 5011.0, "low": 4989.0, "close": 5000.0, "volume": 1.0}, index=idx)
    for f in ("flag_roll_suspect", "flag_large_gap", "flag_after_missing", "flag_suspicious_move", "flag_any"):
        df[f] = False
    s = Setup("long", 0, idx[0], 5000, 5000, 4990, 5010, 10, 40, 4990, 0, status=SetupStatus.WON,
              fill_index=1, fill_time=idx[1], fill_price=5000, exit_index=3, exit_time=idx[3], exit_price=5010,
              exit_reason="target")
    from trading.core.schemas import AssetClass, MarketData
    md = MarketData(symbol="ES=F", interval="5m", timezone="America/New_York", asset_class=AssetClass.FUTURES,
                    frame=df)
    run = SymbolRun("ES=F", md, ScanResult([s], None, None), CostEntry(commission_per_unit_side=2.25))
    split = SplitPlan("x", str(idx[0]), str(idx[2]), str(idx[3]), str(idx[4]), "now")
    row = trade_rows(run, settings, 1000.0, split)[0]
    assert row["gross_fixed"] == 500.0  # 10 points x $50
    assert row["net_pnl_fixed"] == pytest.approx(495.5)  # minus 2 x 2.25
    assert row["net_r"] == pytest.approx(495.5 / 500.0)
    assert row["net_pnl"] == pytest.approx(991.0)  # risk-normalised: 0.991 R x $1000
    assert row["period"] == "development" and not row["data_suspect"]
    run.md.frame.loc[idx[2], "flag_roll_suspect"] = True  # a possible roll while the trade was open
    assert trade_rows(run, settings, 1000.0, split)[0]["data_suspect"]


def test_metrics_hand_calculation():
    t = pd.DataFrame({
        "net_pnl": [100.0, -50.0, -50.0, 200.0, -50.0],
        "net_r": [1.0, -0.5, -0.5, 2.0, -0.5],
        "entry_time": pd.date_range("2024-01-01", periods=5, freq="h", tz="UTC"),
        "exit_time": pd.date_range("2024-01-01 00:30", periods=5, freq="h", tz="UTC"),
        "costs": 1.0,
    })
    m = compute_metrics(t, 1000.0)
    assert (m["trades"], m["wins"], m["losses"]) == (5, 2, 3)
    assert m["gross_profit"] == 300 and m["gross_loss"] == -150 and m["net_pnl"] == 150
    assert m["profit_factor"] == 2.0 and m["expectancy"] == 30.0
    assert m["max_drawdown"] == -100.0  # 1100 -> 1000
    assert m["max_consecutive_losses"] == 2 and m["max_consecutive_wins"] == 1
    assert m["largest_win"] == 200 and m["largest_loss"] == -50


# ------------------------------------------------------------------ split discipline


def test_split_is_chronological_frozen_and_test_is_hidden_by_default(settings, es):
    pipe = MarketDataPipeline.from_settings(settings, source=YFinanceSource(history_fn=FakeHistory(es)))
    kw = dict(start="2024-02-04", end="2024-03-02", pipeline=pipe)
    res = run_backtest(settings, default_definition(["ES=F"], "5m"), ["ES=F"], "5m", **kw)
    sp = res.split
    assert pd.Timestamp(sp.start) < pd.Timestamp(sp.dev_end) < pd.Timestamp(sp.val_end) < pd.Timestamp(sp.test_end)
    assert "test" not in res.metrics and (res.trades["period"] != "test").all()
    assert read_test_ledger(settings) == []
    # A later run with more data reuses the frozen boundaries.
    again, created = load_or_create_split(settings.resolve(settings.backtest.splits_dir), sp.name,
                                          pd.Timestamp("2023-01-01", tz="UTC"), pd.Timestamp("2025-01-01", tz="UTC"),
                                          0.5, 0.25)
    assert not created and again == sp
    assert sp.label(pd.Timestamp(sp.test_end) + pd.Timedelta(days=1)) == "post_test"
    res2 = run_backtest(settings, default_definition(["ES=F"], "5m"), ["ES=F"], "5m", include_test=True, **kw)
    assert "test" in res2.metrics and len(read_test_ledger(settings)) == 1


def test_experiments_are_separate_and_validated():
    with pytest.raises(ValueError):
        register_experiment(Experiment("MY_IDEA", "h", "e", {}))
    with pytest.raises(TypeError):
        register_experiment(Experiment("EXPERIMENT_99", "h", "e", {"not_a_param": 1}))
    assert "EXPERIMENT_99" not in EXPERIMENTS
    assert OriginalParams().max_return_candles == 10  # original untouched


def test_no_edge_on_random_walks(settings):
    # Sanity check against optimistic fills: on pure noise the gross expectancy must not be positive.
    gross = []
    for seed in (11, 12, 13):
        raw = random_futures_bars(session_for("ES=F", settings), "2024-02-04", "2024-03-01", seed=seed)
        md = clean(settings.model_copy(update={"root": settings.root / str(seed)}), raw)
        for s in scan(md).setups:
            if s.exit_price is not None:
                gross.append(s.r_multiple)
    assert len(gross) > 100
    assert np.mean(gross) < 0.05
