# Trading Bot (paper trading research only)
Read owner.md first.

- Code: `trading/` (README.md, AUDIT.md). Python, yfinance data, ORIGINAL_YOUTUBE_STRATEGY (omarnowick's No Wick) in `trading/strategies/original_youtube/` with SPEC.md.
- PAPER / SIMULATION ONLY. No broker code, no real money, no "this will make money" promises. Any real-money idea goes to Dad first. Claude never places trades.
- Atlas (atlas/) has a Trading Lab module that is education/paper only too.
- Run: `pip install -r trading/requirements.txt`, then from the repo root `python -m trading nowick ES=F -i 5m -p 30d`. Tests: `cd trading && python -m pytest -q`.
- The cloud box can't download Yahoo data (blocked); real-data runs happen on the owner's computer (the new MacBook Air M5 is ideal).
