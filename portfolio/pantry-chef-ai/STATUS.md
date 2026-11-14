# Status: Pantry Chef AI (Potwise)

Last updated: 14 Nov 2026, end of the first unattended run (steps 1 to 6).

Words used: **Fully working** (I ran and tested it in this session), **Partly done**, **Planned**, **Not started**.

Tested on Linux with Node.js 22.23.4 and Chromium only. See TEST_RESULTS.md for exactly what was and was not tested.

## Documents

| Item | Status | Notes |
|---|---|---|
| PLAN.md (roadmap, tech stack, 15 decisions) | Fully working | Written. Decisions settled by Claude at the owner's request. |
| BRAND.md and logo SVGs | Fully working | Logo rendered and looked at. Name is not trademark-checked. |
| design/UX.md and 4 HTML mockups | Fully working | Opened at phone width: no errors, no sideways scroll. Mockups show fallback fonts. |
| README.md | Fully working | Run steps were followed from a fresh copy of the branch and worked. |
| TEST_RESULTS.md | Fully working | Real output from this session. |
| TECHNICAL.md, LEARNING_NOTES.md | Fully working | Written against the code as it is. |
| PORTFOLIO.md | Partly done | Draft. Lines marked [owner] need the owner's own words. |

## App

| Feature | Status | Notes |
|---|---|---|
| Home: greeting, search, chef card, categories, popular | Fully working | Browser-tested |
| Explore: search by name or ingredient, category filter | Fully working | Browser-tested |
| Recipe: facts, ingredients ticked from pantry, steps you can tick, save | Fully working | Browser-tested |
| Pantry: list, add, refuse duplicates and bad input, remove | Fully working | Browser-tested |
| Saved: list, survives reload | Fully working | Browser-tested |
| Chef: type ingredients, get ranked suggestions | Fully working as a sample | Rule-based matching. **Not AI.** |
| Chef: Use what I have | Fully working as a sample | |
| Chef: Random recipe | Fully working | |
| Chef: Diet plan (4 goals, 3 days) | Fully working as a sample | Simple rules. Not dietary advice. |
| Backend API (13 addresses) and SQLite database | Fully working | 47 backend tests pass |
| 16 sample recipes | Fully working | Sample text; nutrition numbers are estimates |
| One-page preview (`app/preview/potwise-preview.html`, `npm run build:preview`) | Fully working | The same screens with no server; data kept in memory and reset on reload. Clicked through in a browser in this session. Published as a private Claude artifact for the owner, not public. |
| Real AI chef | Planned | Needs the owner / the owner's dad (key or local model) |
| Runs on Windows / macOS | Not tested | Should work with Node 22.13+, but not tried |
| Real phone, Safari, Firefox | Not tested | |
| Screen reader check | Not started | |
| Add or edit your own recipes in the app | Planned | Today: edit `app/server/seed-data.js` |
| Shopping list, cook mode timers | Planned | |
| Arabic / right-to-left | Planned | |
| Login, many users | Planned | |
| Installable phone app, app stores | Planned | Store accounts need the owner's dad |
| Online deployment | Not started | Not allowed without the owner |

## Needs the owner / the owner's dad

1. (Settled) The 15 decisions in PLAN.md: the owner told Claude to decide, so they stand as written.
2. Real AI: which route (free local model or paid API), and any account, key or payment. Not done on purpose.
3. A proper trademark check on "Potwise" before public use.
4. Publishing or deploying anywhere. Not done on purpose.
5. University rules on AI assistance, and the [owner] lines in PORTFOLIO.md.
6. Try it on your own PC (README, "How to run it") and tell me if anything fails on Windows.
