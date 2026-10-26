"""Command-line entry point: ``python -m trading <command>`` (run from the repo root).

    python -m trading config                     # show the loaded configuration
    python -m trading fetch ES=F -i 1h -p 60d    # download, validate, cache; print the report
    python -m trading chart ES=F -i 1h -p 60d    # same, plus a PNG in reports/
    python -m trading account                    # paper account state from the database
    python -m trading nowick ES=F -i 5m -p 30d   # run ORIGINAL_YOUTUBE_STRATEGY over the data, chart + CSV
    python -m trading backtest -s ES=F NQ=F -i 5m -p 60d            # dev + validation only
    python -m trading backtest -s ES=F NQ=F -i 5m -p 60d --include-test   # final report (logged)
    python -m trading paper-step -s ES=F NQ=F -i 5m  # one forward paper-trading decision per symbol (audited)
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone

from trading.config.settings import get_settings
from trading.core.log import setup_logging


def _load(args: argparse.Namespace):
    from trading.data.pipeline import MarketDataPipeline
    from trading.database import Database

    settings = get_settings()
    pipeline = MarketDataPipeline.from_settings(settings)
    md = pipeline.load(args.symbol, interval=args.interval, period=args.period, start=args.start, end=args.end,
                       force=args.force)
    with Database(settings.database_path) as db:
        db.save_validation_report(md.report, md.request_key)
    return settings, md


def _print_report(md) -> None:
    r = md.report
    print(f"\n{md.symbol} {md.interval}  rows {r.rows_in} -> {r.rows_out}  status: {r.status.value}")
    for i in r.issues:
        ex = f"  e.g. {', '.join(i.examples[:3])}" if i.examples else ""
        print(f"  [{i.severity.value:<7}] {i.code} ({i.count}): {i.message}{ex}")
    if len(md.frame):
        print(f"  range {md.frame.index[0]} -> {md.frame.index[-1]}")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="trading", description="Paper-trading research system (simulated money only)")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("config")
    for name in ("fetch", "chart", "nowick"):
        sp = sub.add_parser(name)
        sp.add_argument("symbol")
        sp.add_argument("-i", "--interval")
        sp.add_argument("-p", "--period")
        sp.add_argument("--start")
        sp.add_argument("--end")
        sp.add_argument("--force", action="store_true", help="ignore the cache")
        if name in ("chart", "nowick"):
            sp.add_argument("--last", type=int, default=200)
    sub.add_parser("account")
    ps = sub.add_parser("paper-step")
    ps.add_argument("-s", "--symbols", nargs="+", required=True)
    ps.add_argument("-i", "--interval", default="5m")
    ps.add_argument("-p", "--period", default="5d")
    bt = sub.add_parser("backtest")
    bt.add_argument("-s", "--symbols", nargs="+", required=True)
    bt.add_argument("-i", "--interval", default="5m")
    bt.add_argument("-p", "--period")
    bt.add_argument("--start")
    bt.add_argument("--end")
    bt.add_argument("--split", help="split name (defaults to interval + symbols)")
    bt.add_argument("--include-test", action="store_true", help="also compute the untouched TEST period (logged)")
    bt.add_argument("--experiment", help="run EXPERIMENT_NN instead of the original")
    bt.add_argument("--force", action="store_true", help="re-download data")
    args = p.parse_args(argv)

    settings = get_settings()
    setup_logging(settings)
    try:
        return _run(args, settings)
    except Exception as exc:
        from trading.data.sources import DataSourceError

        if isinstance(exc, DataSourceError):
            print(f"error: {exc}", file=sys.stderr)
            return 1
        raise


def _run(args: argparse.Namespace, settings) -> int:
    if args.cmd == "config":
        print(json.dumps(settings.model_dump(mode="json"), indent=2))
    elif args.cmd == "fetch":
        _, md = _load(args)
        _print_report(md)
        return 0 if md.report.status.value != "FAILED" else 2
    elif args.cmd == "chart":
        from trading.charts import ChartSpec, close_figure, render_chart
        from trading.indicators import ema

        settings, md = _load(args)
        _print_report(md)
        out = settings.reports_dir / f"{md.request_key}.png"
        fig = render_chart(md, ChartSpec(overlays={"EMA 20": ema(md.frame["close"], 20)}, last_n=args.last), out)
        close_figure(fig)
        print(f"  chart: {out}")
    elif args.cmd == "nowick":
        from trading.strategies import get_strategy
        from trading.strategies.original_youtube import default_definition
        from trading.strategies.original_youtube.chart import render_scan, setups_table

        settings, md = _load(args)
        _print_report(md)
        strat = get_strategy(default_definition([md.symbol], md.interval))
        result = strat.scan(md)
        for w in result.warnings:
            print(f"  warning: {w}")
        table = setups_table(result)
        stem = settings.reports_dir / f"nowick_{md.request_key}"
        stem.parent.mkdir(parents=True, exist_ok=True)
        table.to_csv(f"{stem}.csv", index=False)
        out = render_scan(md, result, f"{stem}.png", last_n=args.last)
        print("\n  " + "  ".join(f"{k}={v:.2f}" if isinstance(v, float) else f"{k}={v}"
                                   for k, v in result.summary().items()))
        if len(table):
            print(table.tail(15).to_string(index=False))
        print(f"  chart: {out}\n  setups: {stem}.csv")
    elif args.cmd == "backtest":
        from datetime import datetime, timezone

        from trading.backtests.report import write_report
        from trading.backtests.runner import run_backtest
        from trading.strategies.experiments import EXPERIMENTS, experiment_definition
        from trading.strategies.original_youtube import default_definition

        if args.experiment:
            if args.experiment not in EXPERIMENTS:
                print(f"error: unknown experiment {args.experiment}; registered: {sorted(EXPERIMENTS)}",
                      file=sys.stderr)
                return 1
            definition = experiment_definition(args.experiment, args.symbols, args.interval)
        else:
            definition = default_definition(args.symbols, args.interval)
        res = run_backtest(settings, definition, args.symbols, args.interval, period=args.period,
                           start=args.start, end=args.end, split_name=args.split,
                           include_test=args.include_test, force_download=args.force)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        out = settings.resolve(settings.backtest.results_dir) / f"{definition.name}_{stamp}"
        report = write_report(res, settings, out)
        for w in res.warnings:
            print(f"  warning: {w}")
        for period, m in res.metrics.items():
            print(f"  {period:<12} trades={m['trades']:<4} win_rate={m['win_rate']:.1%} net_r={m['net_r']:+.2f} "
                  f"pf={m['profit_factor']:.2f} maxdd={m['max_drawdown']:,.0f}" if m["trades"] else
                  f"  {period:<12} trades=0")
        print(f"  integrity: {'all passed' if res.integrity_ok else 'FAILED (see report)'}")
        print(f"  report: {report}")
    elif args.cmd == "paper-step":
        from trading.paper_trading.runner import PaperTradingEngine

        engine = PaperTradingEngine(settings, args.symbols, args.interval, period=args.period)
        out = engine.run_once()
        print(f"=== {out['label']} - virtual money only, no brokerage connection ===")
        for sym, r in out["symbols"].items():
            print(f"  {sym}: {r['outcome']} ({r['bars_processed']} new bar(s))")
            for e in r.get("evaluations", [])[-3:]:
                print(f"    {e['bar']}: {e['outcome']} - {e['reason'][:150]}")
            if r["outcome"] == "NO_DATA":
                print(f"    {r['reason']}")
        a = out["account"]
        print(f"  account: balance {a['cash']:,.2f} | equity {a['equity']:,.2f} | realised {a['realized_pnl']:+,.2f} "
              f"| unrealised {a['unrealized_pnl']:+,.2f} | today {a['daily_pnl']:+,.2f} | drawdown "
              f"{a['drawdown']:,.2f} ({a['drawdown_pct']:.1%}) | exposure {a['open_exposure']:,.2f}")
    elif args.cmd == "account":
        from trading.database import Database
        from trading.paper_trading import PaperBroker

        with Database(settings.database_path) as db:
            broker = PaperBroker(settings, db, require_consensus=False)  # read-only view of the account
            a = broker.account_state()
            print(json.dumps({**a.model_dump(mode="json"), "equity": a.equity, "drawdown": a.drawdown,
                              "drawdown_pct": a.drawdown_pct}, indent=2))
            for pos in broker.positions.values():
                print(pos.model_dump_json())
    return 0


if __name__ == "__main__":
    sys.exit(main())
