from datetime import datetime, timezone

import pandas as pd
import pytest
from pydantic import ValidationError

from trading.core.schemas import (
    AccountState,
    AgentDecision,
    AssetClass,
    Candle,
    ClosedTrade,
    ExitReason,
    IndicatorState,
    MarketData,
    PaperFill,
    PaperOrder,
    PaperPosition,
    PositionSide,
    RiskDecision,
    Side,
    Signal,
    SignalAction,
    StrategyDefinition,
    Verdict,
)

TS = datetime(2024, 3, 4, 15, 0, tzinfo=timezone.utc)


def test_candle_validates_ohlc():
    Candle(timestamp=TS, open=10, high=11, low=9, close=10.5, volume=100)
    with pytest.raises(ValidationError):
        Candle(timestamp=TS, open=10, high=9.5, low=9, close=10.5, volume=100)
    with pytest.raises(ValidationError):
        Candle(timestamp=TS, open=10, high=11, low=10.2, close=10.5, volume=100)
    with pytest.raises(ValidationError):
        Candle(timestamp=TS, open=0, high=11, low=9, close=10.5, volume=100)


def test_naive_timestamps_rejected():
    with pytest.raises(ValidationError):
        Candle(timestamp=datetime(2024, 1, 1), open=1, high=1, low=1, close=1, volume=0)


def test_signal_levels_must_be_on_correct_side():
    Signal(strategy="x", symbol="ES=F", interval="1h", timestamp=TS, action=SignalAction.ENTER_LONG,
           price=100, stop=99, target=102)
    with pytest.raises(ValidationError):
        Signal(strategy="x", symbol="ES=F", interval="1h", timestamp=TS, action=SignalAction.ENTER_LONG,
               price=100, stop=101)
    with pytest.raises(ValidationError):
        Signal(strategy="x", symbol="ES=F", interval="1h", timestamp=TS, action=SignalAction.ENTER_SHORT,
               price=100, target=101)
    with pytest.raises(ValidationError):
        Signal(strategy="x", symbol="ES=F", interval="1h", timestamp=TS, action=SignalAction.HOLD,
               price=100, confidence=1.5)


def test_marketdata_requires_ohlcv_and_datetime_index():
    idx = pd.date_range("2024-01-01", periods=3, freq="D", tz="UTC")
    good = pd.DataFrame({c: [1.0, 2.0, 3.0] for c in ("open", "high", "low", "close", "volume")}, index=idx)
    md = MarketData(symbol="SPY", interval="1d", timezone="UTC", asset_class=AssetClass.EQUITY, frame=good)
    assert md.has_quality_warning  # unvalidated data is never trusted
    assert len(md.candles()) == 3
    assert md.window(end=idx[1]).frame.index[-1] == idx[1]
    with pytest.raises(ValidationError):
        MarketData(symbol="SPY", interval="1d", timezone="UTC", asset_class=AssetClass.EQUITY,
                   frame=good.drop(columns="volume"))
    with pytest.raises(ValidationError):
        MarketData(symbol="SPY", interval="1d", timezone="UTC", asset_class=AssetClass.EQUITY,
                   frame=good.reset_index(drop=True))


def test_models_round_trip_json():
    objs = [
        StrategyDefinition(name="none", symbols=["ES=F"], interval="1h", indicators={"e": {"kind": "ema", "length": 9}}),
        IndicatorState(symbol="ES=F", interval="1h", timestamp=TS, values={"ema": 1.0, "rsi": None}),
        AgentDecision(agent="a", signal_id="sig_1", verdict=Verdict.APPROVE),
        RiskDecision(agent="r", signal_id="sig_1", verdict=Verdict.APPROVE, quantity=2, risk_amount=100),
        PaperOrder(symbol="ES=F", side=Side.BUY, quantity=1),
        PaperFill(order_id="o", symbol="ES=F", side=Side.BUY, quantity=1, price=10, reference_price=10,
                  commission=1, slippage=0, timestamp=TS),
        PaperPosition(symbol="ES=F", side=PositionSide.LONG, quantity=1, avg_price=10),
        ClosedTrade(symbol="ES=F", side=PositionSide.LONG, quantity=1, entry_price=10, exit_price=11,
                    entry_time=TS, exit_time=TS, gross_pnl=1, commission=0, net_pnl=1, exit_reason=ExitReason.TARGET),
        AccountState(starting_balance=100, cash=100),
    ]
    for o in objs:
        assert type(o).model_validate_json(o.model_dump_json()) == o


def test_position_unrealized_pnl_and_account_equity():
    p = PaperPosition(symbol="ES=F", side=PositionSide.SHORT, quantity=2, avg_price=5000, point_value=50,
                      last_price=4990)
    assert p.unrealized_pnl == 1000
    a = AccountState(starting_balance=100, cash=90, unrealized_pnl=15)
    assert a.equity == 105


def test_order_quantity_must_be_positive():
    with pytest.raises(ValidationError):
        PaperOrder(symbol="ES=F", side=Side.BUY, quantity=0)
