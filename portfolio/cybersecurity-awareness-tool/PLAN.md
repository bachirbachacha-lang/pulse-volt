# Plan: Cybersecurity Awareness Tool (product name: Latchlight)

Written 14 Nov 2026 by Claude, working alone while the owner was away.

## Decisions (settled by Claude on 14 Nov 2026, at the owner's request)

The owner said "just decide yourself, don't ask me". So these are settled and the project is built on them. Nothing here is waiting for an answer. If you ever want one changed, say the number.

| # | Decision | Why, in plain words | How hard to change later |
|---|---|---|---|
| D1 | Product name is **Latchlight** | A latch keeps a door shut; a light lets you see who is knocking. Short and easy to say. Details in BRAND.md. | Easy (one name in a few files) |
| D2 | It is a **web app that works on a laptop and a phone** | Opens in any browser. No app store account, no payment. On a wide screen it shows a side menu; on a phone it shows tabs at the bottom. | Medium |
| D3 | Frontend: **React + Vite** | The most used tool for building screens, good for a CV. Same as the Potwise project, so you learn one stack. Free. | Hard (it is the whole screen code) |
| D4 | Backend: **Node.js + Express 5** | Same language (JavaScript) as the screens. Express is the most common Node server. | Medium |
| D5 | Database: **SQLite**, the one built into Node | The whole database is one file on your computer. No server to install, no account, no password. | Medium (the SQL is standard) |
| D6 | Styling: **plain CSS with variables** | You can read every style and explain it. Brand colours live in one place. | Easy |
| D7 | **Defence and awareness only** | The app teaches people to protect themselves. It contains no attack tools, sends no messages, and copies no real company. | This one should not change |
| D8 | Practice messages are **invented**, from invented senders, using `.example` addresses | `.example` is reserved by the internet standards for examples, so no address in the app can belong to a real company or person. | Easy (edit one data file) |
| D9 | The password checker **runs only in the browser**. The password is never sent to the server and never saved. | A password tool that sends your password somewhere would teach the wrong lesson. A browser test proves no request is made while typing. | Should not change |
| D10 | The "coach tip" is **not real AI**. One marked function, `getCoachTip()`, picks a sample tip for your weakest topic. | Real AI needs an API key or a paid service, which the rules forbid for now. One function means real AI can be plugged in later without touching the screens. | Easy (one file) |
| D11 | **No login.** One learner uses the app on their own computer. | Accounts need passwords, email and security work. Not needed to show the idea. "Small teams" is on the roadmap. | Medium |
| D12 | The app **starts with a little sample progress** | So the dashboard is not empty the first time you open it. It is labelled as sample, and **Start fresh** on the About screen wipes it. | Easy |
| D13 | Content: **4 topics, 8 short lessons, 20 quiz questions, 10 practice messages**, all written for this project | Original text. Small enough to finish in one sitting, big enough to show the idea. | Easy (edit one data file) |
| D14 | Pictures are **drawn by code** (simple icons and charts). No photos, no people. | Nothing copied from anyone. Works offline. | Easy |
| D15 | Language: **English only** for now | Keeps version 1 small. Arabic (right-to-left) is on the roadmap. | Medium |
| D16 | Tests: **Node's built-in test runner** for the backend, **Playwright** for clicking through the real screens | Built-in means nothing extra to install. Playwright is the standard free browser test tool. | Easy |
| D17 | Needs **Node.js 22.13 or newer** | That version includes the built-in database. It is the free standard download. | n/a |
| D18 | Fonts are **Bricolage Grotesque** (headings) and **Atkinson Hyperlegible** (text), installed with the app | Both free and open-licence. Atkinson Hyperlegible was designed to be easy to read, which suits an app about looking carefully. | Easy |
| D19 | Ports: server **3311**, developer mode **5311**, browser-test server **3319** | Chosen so it does not clash with the Potwise project if both run at once. | Easy |

## What the app does (version 1)

1. **Dashboard**: your awareness score, lessons done, quiz results, phish-spotting accuracy, activity this week, progress by topic, what to do next, and a sample coach tip.
2. **Lessons**: 8 short lessons in 4 topics (phishing, passwords, safe browsing, device safety). Mark each one done.
3. **Quiz**: 5 questions per topic. The server marks it and explains every answer.
4. **Spot the phish**: 10 invented messages. Decide "Phish" or "Looks safe", then see the clues.
5. **Password checker**: type a password and see how strong it is and why. Runs only in your browser. Also makes a random passphrase.
6. **About**: what is sample, what is private, and **Start fresh**.

## Tech stack in one picture

```
Laptop or phone browser
        |
   React screens (Vite)            <- what you see
        |        \
        |         checkPassword()  <- stays in the browser, never sent
        |  asks for data with fetch()
   Express server (Node.js)        <- the rules, marks the quizzes
        |              \
   SQLite file          getCoachTip()   <- the "smart" tip (sample logic for now)
   (lessons, questions, messages, your progress)
```

Everything is free and open source. Nothing needs an account, a key or a card.

## Roadmap

| Phase | What | Status on 14 Nov 2026 |
|---|---|---|
| 0 | Plan, brand, screen design, mockups | See STATUS.md |
| 1 | Working version with sample content, sample coach tip, tests, documents | See STATUS.md |
| 2 | More content: more lessons and messages, a certificate page to print, edit content in the app | Planned |
| 3 | Real AI coach behind `getCoachTip()`. Free route: a local model with Ollama on your own computer. Paid route: an AI API key. | Planned. Needs the owner / the owner's dad. |
| 4 | Arabic language and right-to-left layout, screen reader check | Planned |
| 5 | Small teams: login, a teacher view of the group's progress | Planned. Storing other people's data brings privacy duties. Needs the owner / dad. |
| 6 | Put it online | Planned. Needs hosting decisions and dad. |

## Needs the owner / the owner's dad

I did not do any of these, on purpose.

- **Real AI**: choosing a provider, creating an account, getting an API key, any payment.
- **Publishing**: putting the app on the internet.
- **Name check**: I did one quick web search and found no security awareness product called "Latchlight". That is not a legal trademark check. Do a proper check before using the name in public.
- **Content review**: the lessons are general good practice written by an AI assistant. Ask a lecturer or a security professional to read them before anyone relies on them.

## Risks I know about

- The built-in SQLite in Node prints an "experimental" warning on Node 22. It works and the warning is harmless, but that feature could change in a future Node version.
- A password checker can only estimate. A password it calls "strong" can still be unsafe if it has leaked or is reused. The screen says so.
- Security advice goes out of date. The lessons stick to habits that change slowly.
- Sample coach tips can look smarter than they are. Every tip is labelled as a sample.
