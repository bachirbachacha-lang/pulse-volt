# Technical notes: Latchlight

How the app is built, for someone who wants to read or change the code. Beginner explanations of the ideas are in LEARNING_NOTES.md.

## The three layers

```
Browser:  React screens (app/client)          checkPassword() runs here and stops here
             |  fetch("/api/...")  JSON
Server:   Express 5 (app/server/app.js)  ->  getCoachTip() (app/server/coach.js)
             |  SQL
Database: SQLite file (app/data/latchlight.db), through node:sqlite
```

- **Frontend:** React 19, React Router 7, built by Vite 8. Plain CSS in one file (`client/src/styles.css`) with variables for the brand colours. Fonts from `@fontsource` packages, bundled with the app.
- **Backend:** Node.js 22.13+ and Express 5. One file of routes (`app.js`), one file for the database (`db.js`).
- **Database:** SQLite through `node:sqlite`, which is built into Node. No database server and no extra install.
- **Shared:** `app/shared/password.js` and `words.js` are plain JavaScript used by the browser screen and by the backend tests.

There are three runtime packages besides React and the fonts: `express`, `react-router-dom`, and nothing else. Developer tools: `vite`, `@vitejs/plugin-react`, `concurrently`.

## Folder map

```
app/
  package.json           scripts: dev, build, start, test, test:e2e, build:preview
  vite.config.js         builds client/ into dist/, passes /api to the server in dev mode
  vite.demo.config.js    builds the one-file preview
  client/
    index.html
    src/main.jsx         start of the screens
    src/App.jsx          the menu plus which address shows which screen
    src/api.js           the only file that talks to the server
    src/api.demo.js      preview only: the same functions, with data in memory
    src/hooks.js         useLoad (loading / error / data) and useTitle
    src/components/      Menu, Logo, Icon, Status
    src/screens/         Dashboard, Lessons, Lesson, Quizzes, Quiz, Spot, Password, About
    src/styles.css       all styles (same file as design/mockups/latchlight.css)
  server/
    index.js             starts the server (port 3311, this computer only)
    app.js               every /api address, and the error handling
    db.js                tables, seeding, and the "store" functions
    progress.js          awarenessScore, weekActivity, nextStep (pure functions)
    coach.js             getCoachTip: the sample "smart" tip
    seed-data.js         topics, lessons, questions, practice messages, sample progress
    test/                api.test.js, logic.test.js, password.test.js
  shared/
    password.js          checkPassword, findSequence, makePassphrase
    words.js             256 words for the example passphrase
  e2e/e2e.mjs            the browser test
  preview/               the built one-file preview
  data/                  the database file appears here (not saved in git)
```

## The database

Eight tables. Four hold content and are filled once from `seed-data.js`. Three hold progress. One holds a single setting.

| Table | What is in it | Notes |
|---|---|---|
| `topics` | 4 rows: id, name, blurb, position | id is a word such as `phishing` |
| `lessons` | 8 rows | `sections` and `points` are lists saved as JSON text |
| `questions` | 20 rows | `choices` is JSON text; `answer` is the position of the right choice |
| `messages` | 10 rows | `is_phish`, `clues` (JSON text), `explain` |
| `lesson_progress` | one row for each lesson marked done | lesson id and time |
| `quiz_attempts` | one row for every quiz attempt | topic, score, total, time |
| `phish_answers` | one row for every verdict given | message, verdict, correct, time |
| `settings` | `sample_progress` while the starting sample progress is still there | removed by Start fresh |

Relationships: a topic has many lessons and many questions. A lesson has at most one progress row. A message can have many answers; only the latest one counts on the dashboard.

All SQL uses `?` placeholders. Nothing typed by a user is glued into SQL text.

## The server addresses

| Method and address | What it does |
|---|---|
| `GET /api/health` | `{ ok: true }` |
| `GET /api/dashboard` | Score, counts, the 7-day activity, topics, next step, coach tip |
| `GET /api/topics` | The 4 topics with lessons done and best quiz result |
| `GET /api/lessons` | The 8 lesson summaries |
| `GET /api/lessons/:id` | One lesson in full |
| `PUT /api/lessons/:id/done` | Mark as done |
| `DELETE /api/lessons/:id/done` | Mark as not done |
| `GET /api/quizzes/:topic` | The 5 questions **without** answers |
| `POST /api/quizzes/:topic/attempts` | Body `{ answers: { questionId: position } }`. Marks it, saves the attempt, returns the review with explanations. |
| `GET /api/phish/messages` | The 10 messages **without** verdict or clues |
| `POST /api/phish/messages/:id/answer` | Body `{ verdict: "phish" or "safe" }`. Saves it, returns right or wrong plus the clues. |
| `DELETE /api/progress` | Start fresh |

Errors always come back as `{ "error": "a sentence" }` with a fitting status (400 bad input, 404 not found, 413 too large, 500 server fault). Any other address serves the built app, so opening `/lessons/3` directly works.

There is no address that accepts a password, and a test checks that.

## Design decisions worth knowing

- **The server marks the quiz.** The right answers and explanations are not sent to the browser until an attempt has been submitted. The same goes for the phish verdicts and clues. This is not strong security (the content is in a public file in this repository) but it is the correct habit: do not send the browser what it should not yet know.
- **The password checker never touches the network.** `Password.jsx` does not import `api.js`. `shared/password.js` contains no `fetch`, no storage and no logging, and a test reads the file to make sure it stays that way. The password lives in React state on one screen and is gone when you leave it. The browser test records every request and proves none is made.
- **The passphrase maker uses `crypto.getRandomValues`,** not `Math.random`, with "rejection sampling" so every word is equally likely. The word list is only 256 words, which the screen states: four words from 256 give about 4 billion combinations, which is fine for showing the idea and too few for a real account.
- **Practice links cannot be clicked.** Links in practice messages are shown as text, never as `<a>` elements. All addresses end in `.example`, a name reserved for examples, and a test checks every one.
- **The coach is one function.** `getCoachTip({ topics })` returns `{ source: 'sample', topicId, topicName, text }`. It is `async` already, so swapping in a real model later does not change the code that calls it.
- **Pure functions for the sums.** `awarenessScore`, `weekActivity` and `nextStep` take plain values and return plain values. The clock is passed in (`now`), so tests can pick a date.
- **The server listens on 127.0.0.1 only**, so other devices on the network cannot reach it. Request bodies are limited to 10 kB.

## The awareness score

```
score = round( 50 * lessonsDone / 8
             + 25 * average over the 4 topics of (best quiz score / 5, or 0 if not taken)
             + 25 * messagesJudgedRight / 10 )
```

With the starting sample progress: 50 * 3/8 + 25 * (0.8 / 4) + 25 * 3/10 = 18.75 + 5 + 7.5 = 31.25, shown as 31%.

The "quiz average" tile on the dashboard is a different number: the average over only the quizzes you have taken.

## The password score

`checkPassword(text)` returns `{ score 0 to 4, label, summary, checks }`.

1. Points from length: 20+ characters = 4, 14+ = 3, 10+ = 2, 8+ = 1, otherwise 0.
2. One extra point for three or more kinds of character when there are at least 10 characters.
3. One point off for each of: a common word (after undoing swaps such as @ for a), a year, a run of 4 neighbours (abcd, 4321, qwer), the same character 3 times in a row. Two off when it uses 4 or fewer different characters.
4. Straight to 0 when it is in the very-common list or shorter than 8.

This is a simple, explainable estimate. It is not zxcvbn (a well-known open-source library), and it does not look up leaked passwords.

## The one-file preview

`npm run build:preview` uses `vite.demo.config.js`. It swaps `api.js` for `api.demo.js` (same function names, data in memory, reusing the real `seed-data.js`, `progress.js` and `coach.js`), starts from `main.demo.jsx` (a memory router instead of the address bar, plus a "Preview" bar), then glues the built script and styles into `preview/latchlight-preview.html`. Fonts in the preview come from Google Fonts by link, because one file cannot carry the font packages sensibly.

## Known weak points

- `node:sqlite` is marked experimental in Node 22. The start scripts pass `--no-warnings` to hide the notice.
- No login and no per-user data. Adding users means a `users` table and a user id on the three progress tables.
- `styles.css` is a copy of `design/mockups/latchlight.css`. If you change one, copy it to the other.
- The preview's `api.demo.js` repeats some logic from `db.js` in plain JavaScript. A change to the rules in one must be made in the other.
- No accessibility scan, and no test of the lesson text itself.
