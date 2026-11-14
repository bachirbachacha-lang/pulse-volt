# Test results: Latchlight

Everything on this page was run by Claude on 14 Nov 2026, in this session, on a Linux cloud computer with Node.js 22.23.4 and the Chromium browser. Nothing here was run on Windows or on a real phone.

## Summary

| Test set | What it checks | Command | Result |
|---|---|---|---|
| Backend tests | Every server address with a throwaway database, the score and week sums, the sample coach, the sample content, and the password checker | `npm test` | **53 passed, 0 failed** |
| Browser tests | A real hidden browser using the built app like a person: dashboard, lesson, quiz, spot the phish, password checker, start fresh, phone layout, keyboard focus | `npm run test:e2e` | **27 passed, 0 failed** |
| Password privacy | Part of the browser tests: every request the page makes is recorded. Typing passwords made **no request**, the typed text appears in no request during the whole run, and browser storage and cookies stayed empty. | `npm run test:e2e` | **Passed** |
| Fresh copy check | Copied the `app` folder without `node_modules`, `dist` or the database to an empty folder, then `npm install`, `npm test` (53 pass), `npm run build`, `npm start`, opened `/api/health`, `/`, `/lessons/3` and `/api/dashboard`, then ran the browser tests there (27 pass) | by hand | **Worked** |
| Developer mode | `npm run dev` in the fresh copy, then asked for the app and `/api/health` through port 5311 | by hand | **Worked** |
| Tests can fail | Two deliberate mistakes, one at a time (see below) | by hand | **Tests failed as they should**, then passed again after the mistakes were removed |
| One-page preview | Built `app/preview/latchlight-preview.html`, wrapped it in an empty page and clicked through it: dashboard, lesson, quiz, spot the phish, password checker, start fresh, phone width | script | **11 steps worked.** No console errors. The only requests were the file itself and Google Fonts. |
| Mockups | Opened the 4 mockup files at laptop width (1200) and phone width (390) | script | No errors, no sideways scrolling |
| Colour contrast | Calculated with the WCAG formula | script | The 18 text and background pairs the design uses pass 4.5:1. One pair fails and is marked "shapes only" (table in BRAND.md). |

## Proving the tests can fail

A test that can never fail proves nothing, so I broke the app on purpose twice.

1. **Wrong sum.** In `server/progress.js` I changed the lesson weight in the awareness score from 50 to 40. Result: `npm test` gave **49 passed, 4 failed** (two score tests and two dashboard tests). `npm run test:e2e` gave **25 passed, 2 failed** (the two dashboard checks). I restored the file.
2. **Leaking the answers.** In `server/db.js` I made the quiz question list include the `answer` column. Result: `npm test` gave **52 passed, 1 failed** ("gives 5 questions and never the answers"). I restored the file.

After both were removed: 53 of 53 and 27 of 27 again.

## What happened on the way

- First backend run: 53 of 53.
- First browser run: 23 of 27. One real cause, three knock-on failures: the test looked for a link named exactly "Start quiz: Passwords", but the browser reads the name with a space before the colon. That was a mistake in the test, not the app. The test now accepts either.
- **A real bug the testing found.** While clicking through the one-page preview at phone width, the script could not find the menu link "Spot the phish". On a phone the tabs showed only the short word ("Spot"), which was hidden from screen readers, and the full name was removed completely, so a screen reader user would have heard six links with no names. Fixed in the stylesheet (the full name is now hidden visually but still readable), and the phone browser test now checks for it.
- A layout bug seen in the screenshots: the page column shrank to fit its content, so short pages sat in the middle and long ones on the left. Fixed with one line of CSS (`width: 100%`).

## Not tested (be careful claiming these)

- **Windows and macOS.** Only Linux was used. The code uses nothing Linux-only, but that is reasoning, not a test.
- **Real phones.** Only a phone-sized browser window (390 x 844) on a computer.
- **Other browsers.** Only Chromium. Not Safari, not Firefox.
- **Screen readers.** Labels, roles and focus outlines are in the code and one keyboard check is automated, but nobody has used the app with a screen reader, and no automatic accessibility scanner was run.
- **The lesson content.** It is general good practice written with an AI assistant. No security professional or lecturer has reviewed it. The tests only check its shape (counts, valid answers, `.example` addresses), not whether the advice is the best advice.
- **The password checker's judgement.** Tests fix its answers for about 30 example passwords. It was not compared with a well-known strength library, and it does not check passwords against lists of leaked passwords.
- **The published preview inside Claude's artifact viewer.** The file was tested locally in Chromium before publishing. I did not open the published page itself in a browser.
- **Many users at once, speed under load, security testing of the server.** The app is built for one person on their own computer and listens only on that computer.
- **Real AI.** There is none, so there is nothing to test.
- **Password managers or browser extensions** that might read the password box. The app cannot control those.

## Backend tests, full list (`npm test`)

```
✔ GET /api/health
✔ GET /api/topics gives 4 topics with 2 lessons each
✔ GET /api/lessons gives 8 summaries without the full text
✔ GET /api/lessons/:id gives sections, points and the next lesson
✔ GET /api/lessons/:id handles a missing lesson and a bad id
✔ lessons: mark done, mark twice, un-mark
✔ GET /api/quizzes/:topic gives 5 questions and never the answers
✔ quiz: all right gives 5 of 5 and is saved as the best
✔ quiz: wrong answers are marked wrong, and a worse second try does not lower the best
✔ quiz: bad requests are refused and nothing is saved
✔ GET /api/phish/messages gives 10 messages and never the verdict or clues
✔ phish: a right and a wrong verdict, with clues
✔ phish: every message is marked right for the right verdict
✔ phish: only the latest answer for a message counts
✔ phish: bad requests are refused
✔ dashboard: a fresh start is all zeros and points at lesson 1
✔ dashboard: the sample progress gives the numbers the documents quote
✔ dashboard: doing things moves the score and this week
✔ DELETE /api/progress wipes progress but keeps the content
✔ there is no address that accepts a password
✔ unknown /api addresses give a JSON 404, and too-large requests are refused
✔ the server does not announce which software it runs
✔ awarenessScore: nothing done is 0, everything done is 100
✔ awarenessScore: lessons are half, quizzes a quarter, phish a quarter
✔ awarenessScore: empty content does not divide by zero
✔ weekActivity: 7 days, today last, counts land on the right day
✔ weekActivity: works across a month boundary
✔ nextStep: lesson first, then quiz, then phish, then done
✔ getCoachTip labels its answer as sample
✔ getCoachTip picks the weakest topic, and the first one on a tie
✔ getCoachTip has words for every situation
✔ topicProgress: lessons are half and the quiz is half
✔ content: 4 topics, 2 lessons and 5 questions for each
✔ content: every question has 4 different choices and a valid answer
✔ content: the right answer is not always in the same position
✔ content: 10 practice messages, a mix of phish and safe, each with clues
✔ content: every address and link in the practice messages ends in .example
✔ content: the sample progress points at lessons, topics and messages that exist
✔ an empty box gives no result
✔ very common passwords score 0, also in capitals
✔ swapping letters for symbols does not hide a common word
✔ anything shorter than 8 characters scores 0
✔ a season plus a year plus a symbol is weak
✔ keyboard and alphabet runs are found, forwards and backwards
✔ one letter repeated is long but not strong
✔ a four-word passphrase is very strong with nothing to fix
✔ a long random password is very strong; a medium one is in between
✔ longer is never weaker when nothing else changes
✔ Arabic and emoji are counted as characters and do not crash
✔ every result has a label, a summary and at least 3 checks
✔ the word list has 256 different plain words that do not trip the checker
✔ makePassphrase: 4 different words joined by hyphens, using the random function it is given
✔ the checker file never talks to a server, storage or the console
ℹ tests 53
ℹ pass 53
ℹ fail 0
```

## Browser tests, full list (`npm run test:e2e`)

```
  PASS  Dashboard shows the sample progress: 31%, 3 / 8 lessons, 80% quiz, 3 / 10 messages
  PASS  Brand fonts are loaded (Bricolage Grotesque for headings, Atkinson Hyperlegible for text)
  PASS  The coach tip is labelled as a sample and is about the weakest topic
  PASS  On a laptop the menu is a left side bar with 6 links and Dashboard marked as current
  PASS  "Next up" opens the first lesson that is not done
  PASS  Marking a lesson done shows the Done tag and survives a reload
  PASS  Lessons screen lists 4 topics and 8 lessons, 4 of them done
  PASS  Quizzes screen shows 4 quizzes, phishing with its best result
  PASS  A quiz cannot be checked until every question is answered
  PASS  The quiz page never receives the right answers before you submit
  PASS  Answering 4 right and 1 wrong gives "4 of 5" with every answer explained
  PASS  Spot the phish shows message 1 with the sender address in full and no clickable link
  PASS  Choosing "Phish" on a phish says you were right, shows 4 clues and hides the buttons
  PASS  Choosing "Phish" on an honest message says "Not this time" and explains why it was safe
  PASS  Finishing all 10 messages shows the result (9 of 10) and "Try again" starts over
  PASS  Dashboard has moved: 4 / 8 lessons, 2 quizzes taken, 9 / 10 messages, score 58%
  PASS  Password checker: an empty box shows no result; a common password is "Very weak"
  PASS  Passphrase maker: 4 words, "Make another" changes it, "Check this one" rates it Very strong
  PASS  PRIVACY: typing passwords made no network request, and nothing was put in browser storage
  PASS  The password box is empty again after leaving the screen and coming back
  PASS  About: "Start fresh" asks first, Cancel keeps the progress
  PASS  About: confirming "Start fresh" empties the dashboard, and it stays empty after a reload
  PASS  An address that does not exist shows a friendly message, and a missing lesson shows an error
  PASS  Opening a lesson address directly works (the server hands out the app for any address)
  PASS  On a phone-sized window the menu becomes bottom tabs and no screen scrolls sideways
  PASS  Keyboard: Tab reaches the menu first and the focused link has a visible outline
  PASS  No errors were printed in the browser console during the whole run
27 passed, 0 failed, 27 total
```

## One-page preview click-through

```
  ok 1  dashboard with sample progress 31% and preview bar
  ok 2  lesson opened and marked done
  ok 3  lessons list shows 4 done
  ok 4  quiz marked 5 of 5 with review
  ok 5  spot the phish: wrong answer shows 4 clues
  ok 6  spot the phish: second message right
  ok 7  password checker and passphrase
  ok 8  dashboard moved to 41%
  ok 9  start fresh gives 0%
  ok 10  phone width: no sideways scroll
  ok 11  no requests except the page itself and Google Fonts (5 requests in all)
  fonts loaded from Google Fonts: [ true, true ] | console errors: []
```

This click-through script was a one-off and lives outside the project. The preview has no automated test inside the project.

Screenshots from the browser tests are in `screenshots/`.
