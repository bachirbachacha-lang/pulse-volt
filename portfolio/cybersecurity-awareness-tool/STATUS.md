# Status: Cybersecurity Awareness Tool (Latchlight)

Last updated: 14 Nov 2026, end of the first unattended run (steps 1 to 7).

Words used: **Fully working** (I ran and tested it in this session), **Partly done**, **Planned**, **Not started**.

Tested on Linux with Node.js 22.23.4 and Chromium only. See TEST_RESULTS.md for exactly what was and was not tested.

## Documents

| Item | Status | Notes |
|---|---|---|
| PLAN.md (roadmap, tech stack, 19 decisions) | Fully working | Written. Decisions settled by Claude at the owner's request. |
| BRAND.md and logo SVGs | Fully working | Contrast calculated. Logo seen in the rendered app. Name is not trademark-checked. |
| design/UX.md and 4 HTML mockups | Fully working | Opened at laptop and phone width: no errors, no sideways scroll. Mockups show fallback fonts. Quiz and About screens were not drawn as mockups. |
| README.md | Fully working | Run steps were followed from a fresh copy of the app folder and worked. |
| TEST_RESULTS.md | Fully working | Real output from this session. |
| TECHNICAL.md, LEARNING_NOTES.md | Fully working | Written against the code as it is. |
| PORTFOLIO.md | Partly done | Draft. Lines marked [owner] need the owner's own words. |

## App

| Feature | Status | Notes |
|---|---|---|
| Dashboard: score ring, three counts, this week, progress by topic, next step | Fully working | Browser-tested |
| Coach tip on the dashboard | Fully working as a sample | Simple rules. **Not AI.** Labelled in the app. |
| Lessons: 8 lessons in 4 topics, mark done / not done | Fully working | Browser-tested |
| Quizzes: 4 quizzes of 5 questions, marked by the server, every answer explained, best result kept | Fully working | Browser-tested |
| Spot the phish: 10 invented messages, verdict, clues, result, try again | Fully working | Browser-tested |
| Password checker: strength, reasons, show/hide, clear | Fully working | Browser-tested. An estimate only. Proven to send and store nothing. |
| Passphrase maker (4 random words) | Fully working | Short 256-word list, for showing the idea. The screen says so. |
| About: what is sample, what is private, Start fresh | Fully working | Browser-tested |
| Laptop layout (side menu) and phone layout (bottom tabs) | Fully working | Tested in a laptop-sized and a phone-sized Chromium window only |
| Backend API (12 addresses) and SQLite database (8 tables) | Fully working | 53 backend tests pass |
| Sample content and sample starting progress | Fully working | Written for this project. **Not reviewed by a security professional.** |
| One-page preview (`app/preview/latchlight-preview.html`, `npm run build:preview`) | Fully working | Same screens, no server, data in memory, resets on reload. Clicked through locally in this session. Published as a private Claude artifact for the owner, not public. The published page itself was not opened in a browser by me. |
| Real AI coach | Planned | Needs the owner / the owner's dad (key or local model) |
| Runs on Windows / macOS | Not tested | Should work with Node 22.13+, but not tried |
| Real phone, Safari, Firefox | Not tested | |
| Screen reader check, accessibility scanner | Not started | One screen-reader naming bug was found and fixed by chance; there may be more |
| Checking passwords against leaked-password lists | Not started | Would need an outside service; decide with the owner |
| More lessons, messages, a printable certificate | Planned | Today: edit `app/server/seed-data.js` |
| Arabic / right-to-left | Planned | |
| Login, small teams, teacher view | Planned | Brings privacy duties; needs the owner / dad |
| Online deployment | Not started | Not allowed without the owner |

## Needs the owner / the owner's dad

1. (Settled) The 19 decisions in PLAN.md: the owner told Claude to decide, so they stand as written. Say a number to change one.
2. Real AI: which route (free local model or paid API), and any account, key or payment. Not done on purpose.
3. A proper trademark check on "Latchlight" before public use. I only did one quick web search.
4. A lecturer or security professional should read the lesson content before anyone relies on it.
5. Publishing or deploying anywhere. Not done on purpose.
6. University rules on AI assistance, and the [owner] lines in PORTFOLIO.md.
7. Try it on your own PC (README, "How to run it") and tell me if anything fails on Windows.
8. Nothing has been committed to git. The person who started this run will do that.
