# Technical notes: Potwise

For someone who wants to know how it is built. Beginner explanations are in LEARNING_NOTES.md.

## Overview

```
Browser (React single-page app, built by Vite)
   |  fetch("/api/...")  JSON
Express 5 server (Node.js, ES modules)
   |-- app.js        routes, input checks, error handling
   |-- chef.js       suggestMeals() and buildDietPlan()   <- sample logic, the AI seam
   |-- ingredients.js  text -> ingredient key
   |-- db.js         SQLite schema, seed, queries (node:sqlite, built into Node)
   `-- seed-data.js  16 sample recipes, 5 categories, starter pantry
SQLite file: app/data/potwise.db (created on first start, not in git)
```

In production mode (`npm start`) Express serves both the API and the built screens from `app/dist` on port 3001. In development (`npm run dev`) Vite serves the screens on 5173 and proxies `/api` to 3001.

## Versions used (installed and run on 14 Nov 2026)

Node.js 22.23.4, Express 5.3, React 19.3, React Router 7.18, Vite 8.3, SQLite 3.53 (bundled with Node). Exact versions are locked in `app/package-lock.json`.

## Folder map

```
app/
  package.json          scripts: dev, build, start, test, test:e2e
  vite.config.js        root = client, proxy, build to ../dist
  client/
    index.html
    public/favicon.svg
    src/
      main.jsx          entry: fonts, styles, router
      App.jsx           routes, tab bar, holds the chat messages
      api.js            the only place that calls fetch()
      hooks.js          useLoad (loading / error / data), useTitle
      styles.css        design system (same file as design/mockups/potwise.css plus a few app-only rules)
      components/       Icon, Logo, PlateArt, RecipeCard, Status, TabBar
      screens/          Home, Explore, Recipe, Chef, Saved, Pantry
  server/
    index.js            starts the server (PORT, HOST, POTWISE_DB can be set)
    app.js  chef.js  ingredients.js  db.js  seed-data.js
    test/               ingredients.test.js, chef.test.js, api.test.js
  e2e/e2e.mjs           Playwright browser test
  data/                 potwise.db lives here
```

## Database

| Table | Columns | Notes |
|---|---|---|
| `recipes` | id, title, description, category, minutes, difficulty, servings, kcal, protein, tags, colors, popular | `tags` and `colors` are JSON text |
| `recipe_ingredients` | id, recipe_id, position, key, name, quantity | `key` is the matching word; `name` is shown |
| `recipe_steps` | id, recipe_id, position, text | |
| `pantry_items` | id, name, key (unique), added_at | unique key stops "Egg" and "Eggs" both being added |
| `saved_recipes` | recipe_id (primary key), saved_at | |

Foreign keys are on, with `ON DELETE CASCADE`. Seeding runs inside one transaction and only when `recipes` is empty.

## API

All answers are JSON. Errors look like `{ "error": "message" }`.

| Method | Address | Does | Notable answers |
|---|---|---|---|
| GET | `/api/health` | Is the server up | 200 |
| GET | `/api/categories` | 5 categories with recipe counts | 200 |
| GET | `/api/recipes?category=&q=&popular=1` | List, filtered | 200, 400 unknown category |
| GET | `/api/recipes/random` | One random recipe | 200 |
| GET | `/api/recipes/:id` | Full recipe; each ingredient has `have` | 200, 400 bad id, 404 |
| GET | `/api/pantry` | Pantry list | 200 |
| POST | `/api/pantry` `{name}` | Add | 201 new, 200 `alreadyThere`, 400 bad name, 413 too large |
| DELETE | `/api/pantry/:id` | Remove | 204, 404 |
| GET | `/api/saved` | Saved recipes | 200 |
| PUT / DELETE | `/api/saved/:id` | Save / unsave | 200, 404 unknown recipe |
| POST | `/api/chef/suggest` `{usePantry:true}` or `{text}` or `{ingredients:[]}` | Suggestions | 200 with `source`, `reply`, `understood`, `suggestions`; 400 |
| POST | `/api/chef/diet-plan` `{goal}` | 3-day plan. Goals: balanced, vegetarian, high-protein, lighter | 200, 400 |

## The AI seam

`suggestMeals({ ingredients, recipes, limit })` in `server/chef.js` is the single function the route calls for suggestions. It is `async` already, so a network call to a model can replace the body without changing the route or the screens. It returns `{ source, suggestions: [{ recipe, uses, missing, matchPercent }] }`. Today `source` is `"sample"`.

Current sample logic: turn every typed ingredient into a key, then for each recipe count which non-staple ingredients are present and which are missing. Drop recipes with nothing in common. Sort by fewest missing, then most used, then shortest time, then title. Take the top 5.

Suggested path to real AI (not done): send the model the pantry and the recipe list, ask for a ranked list of recipe ids with a one-line reason each, validate that every id exists, and fall back to the sample logic if the call fails. Keep the key on the server only, in an environment variable, never in the client code or in git.

## Ingredient matching

`toKey()` lowercases, removes digits and punctuation, drops describing words (fresh, chopped, ground, cooked...), makes the last word singular with three simple rules, then looks the result up in a small synonym table (scallion -> spring onion, spaghetti -> pasta...). Matching is exact on the key. A test checks that every seeded ingredient name turns into its own key.

Known limits: the singular rules are simple English only ("couscous" becomes "couscou", which still matches itself). Words not in the synonym table are separate ingredients ("noodles" is not "pasta"). Salt, water and black pepper are staples and never count as missing.

## Safety choices

- Every SQL value goes in through `?` placeholders. `LIKE` wildcards typed by the user are escaped.
- Input is checked on the server: ids must be positive whole numbers, pantry names 1 to 40 letters (any alphabet), chef text at most 500 characters, JSON bodies at most 10 kB, pantry at most 100 items.
- The server listens on 127.0.0.1 only by default, so other devices on the network cannot reach it. Set `HOST=0.0.0.0` to open it to your own Wi-Fi (for trying on a phone). Do that only on a network you trust: there is no login.
- React escapes all text it shows, so typed text cannot become HTML.
- No secrets exist in the project. There is nothing to leak.
- Not done: rate limiting, HTTPS, security headers, accounts. They matter before any public deployment and do not matter on one computer.

## Accessibility choices

Semantic elements (`main`, `nav`, `form`, headings in order), text labels for every input and icon-only button, `aria-pressed` on toggles, a live region for chat and status messages, visible focus outlines, 44 px minimum targets, AA contrast, reduced-motion respected. Not verified with a screen reader (see TEST_RESULTS.md).

## Things I would improve next

- Move focus to the new screen's heading on navigation.
- Share `styles.css` between mockups and app instead of keeping two copies.
- A proper inflection library or a curated ingredient list instead of the simple singular rules.
- Component tests for the React screens (today they are covered only by the browser tests).
- Outline the wordmark in `logo-full.svg`.
