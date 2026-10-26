import pandas as pd

from trading.charts import ChartSpec, Level, close_figure, render_chart
from trading.core.schemas import AssetClass, MarketData, PaperFill, Side, Signal, SignalAction
from trading.data.instruments import session_for
from trading.data.validation import DataValidator
from trading.indicators import ema, rsi
from trading.tests.factories import make_ohlcv, session_index


def test_chart_renders_all_layers(settings, tmp_path):
    idx = session_index(session_for("ES=F", settings), "2024-03-03", "2024-03-12", "1h")
    raw = make_ohlcv(idx, start_price=5000, vol=0.0008)
    v = DataValidator(settings)
    clean, report = v.validate(raw, v.context_for("ES=F", "1h"))
    md = MarketData(symbol="ES=F", interval="1h", timezone="America/New_York", asset_class=AssetClass.FUTURES,
                    frame=clean, is_clean=True, report=report)
    ts = clean.index[100]
    price = float(clean["close"].iloc[100])
    sig = Signal(strategy="demo", symbol="ES=F", interval="1h", timestamp=ts, action=SignalAction.ENTER_LONG,
                 price=price, stop=price - 10, target=price + 20)
    fill = PaperFill(order_id="o", symbol="ES=F", side=Side.BUY, quantity=1, price=price, reference_price=price,
                     commission=0, slippage=0, timestamp=clean.index[101])
    spec = ChartSpec(
        overlays={"EMA 20": ema(clean["close"], 20)},
        panels={"RSI": rsi(clean["close"], 14)},
        signals=[sig],
        fills=[fill],
        levels=[Level(price - 10, "stop", "stop", start=ts), Level(price + 20, "target", "target", start=ts)],
    )
    out = tmp_path / "chart.png"
    fig = render_chart(md, spec, out)
    assert out.exists() and out.stat().st_size > 10_000
    assert len(fig.axes) == 3  # price, volume, RSI
    close_figure(fig)


def test_chart_last_n_and_unvalidated(tmp_path):
    idx = pd.date_range("2024-01-02", periods=50, freq="D", tz="UTC")
    md = MarketData(symbol="SPY", interval="1d", timezone="UTC", asset_class=AssetClass.EQUITY,
                    frame=make_ohlcv(idx))
    fig = render_chart(md, ChartSpec(last_n=20, show_volume=False))
    assert "UNVALIDATED" in fig.axes[0].get_title(loc="left")
    close_figure(fig)
