"""Command-line entry point: ``python -m trading <command>`` (run from the repo root).

    python -m trading config                     # show the loaded configuration
    python -m trading fetch ES=F -i 1h -p 60d    # download, validate, cache; print the report
    python -m trading chart ES=F -i 1h -p 60d    # same, plus a PNG in reports/
    python -m trading account                    # paper account state from the database
"""

from __future__ import annotations

import argparse
import json
import sys

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
    for name in ("fetch", "chart"):
        sp = sub.add_parser(name)
        sp.add_argument("symbol")
        sp.add_argument("-i", "--interval")
        sp.add_argument("-p", "--period")
        sp.add_argument("--start")
        sp.add_argument("--end")
        sp.add_argument("--force", action="store_true", help="ignore the cache")
        if name == "chart":
            sp.add_argument("--last", type=int, default=200)
    sub.add_parser("account")
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
    elif args.cmd == "account":
        from trading.database import Database
        from trading.paper_trading import PaperBroker

        with Database(settings.database_path) as db:
            broker = PaperBroker(settings, db)
            a = broker.account_state()
            print(json.dumps({**a.model_dump(mode="json"), "equity": a.equity}, indent=2))
            for pos in broker.positions.values():
                print(pos.model_dump_json())
    return 0


if __name__ == "__main__":
    sys.exit(main())
