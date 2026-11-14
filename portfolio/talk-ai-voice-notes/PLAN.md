# Plan: Talk AI / Voice Notes (product name: Sayback)

Written 14 Nov 2026 by Claude, working alone while the owner was away studying.

## Decisions (made by Claude, every one can be changed)

You asked me to work without waiting for answers, so I chose. Nothing here blocks the work. If you want one changed, tell me the number.

| # | Decision | Why, in plain words | How hard to change later |
|---|---|---|---|
| D1 | Product name is **Sayback** | You say it once, the app gives it back when you need it (the audio, the words, the answer). Short, easy to spell. Details in BRAND.md. | Easy (one name in a few files) |
| D2 | It is a **web app for a laptop and a phone** | Opens in any browser. No app store account, no payment. Wide screen: side menu, main area, assistant panel. Phone: tabs at the bottom. | Medium |
| D3 | Frontend: **React + Vite** | The most used tool for building screens, good for a CV. Same as your Potwise and Latchlight projects, so you learn one stack well. Free. | Hard (it is all the screen code) |
| D4 | Backend: **Node.js + Express 5** | Same language (JavaScript) as the screens. Express is the most common Node server. | Medium |
| D5 | Database: **SQLite**, the one built into Node | The whole database is one file on your computer. Nothing to install, no account, no password. | Medium (the SQL is standard) |
| D6 | **Audio files are saved as files** in `app/data/audio/`, and the database only keeps the file name | Databases are good at small facts, disks are good at big files. This is how real products do it too (they use cloud file storage). | Medium |
| D7 | **Recording is real.** The browser's own recorder (`MediaRecorder`) captures your microphone and the server saves the file. | It is free, built into every modern browser, and needs no account. So the main feature really works, not a pretend button. | Medium |
| D8 | **Transcription is a sample for now.** One marked function, `transcribeAudio()`, returns a sample transcript. It does not listen to the audio. | Real speech-to-text needs either a paid service with a key (forbidden for now) or a large model downloaded to your computer (a choice for you). One function means the real thing plugs in later without touching the screens. | Easy (one file) |
| D9 | **The assistant is a sample for now, not AI.** One marked function, `askAssistant()`, answers with simple rules: it searches your transcripts, counts words and collects action items. | Same reason as D8. The answers are built from your real saved data, so it is useful and honest, but it does not understand language. The app says "sample" on the screen. | Easy (one file) |
| D10 | **Consent reminder before every recording.** You must tick "Everyone who will be recorded knows and agrees" before the record button works. The app saves that you ticked it. | Recording people without telling them is unfair and in many places against the law. The rules differ by country, so the app reminds, it does not give legal advice. | Should not be removed |
| D11 | **Everything stays on your computer.** The server only listens on `127.0.0.1` (this computer). Nothing is uploaded anywhere. | Voice notes are private. Also means no hosting, no cost. | Should not change without thought |
| D12 | **No login.** One person uses the app on their own computer. | Accounts need passwords, email and security work. Not needed to show the idea. | Medium |
| D13 | The app **starts with 14 sample recordings in 4 folders** | So the dashboard, search and assistant have something to show. They are invented, have a transcript but **no audio**, and are labelled "Sample". **Start fresh** in Settings removes them. | Easy (edit one data file) |
| D14 | All sample people, teams and projects are **invented**. No real companies, no real names. | Nothing copied, nobody's privacy touched. | Easy |
| D15 | Styling: **plain CSS with variables**, one dark look | You can read every style and explain it. Brand colours live in one place. A dark look fits the direction of your reference picture. | Easy |
| D16 | Icons are **drawn by code** (small SVGs written for this project). No photos, no icon packs. | Nothing copied from anyone. Works offline. | Easy |
| D17 | Language: **English only** for now | Keeps version 1 small. Arabic (right-to-left) is on the roadmap. | Medium |
| D18 | Tests: **Node's built-in test runner** for the backend, **Playwright** for clicking through the real screens | Built-in means nothing extra to install. Playwright is the standard free browser test tool. It can even feed a fake microphone, so recording is tested for real. | Easy |
| D19 | Needs **Node.js 22.13 or newer** | That version includes the built-in database. It is the free standard download. | n/a |
| D20 | Fonts are **Outfit** (headings) and **Figtree** (text), installed with the app | Both free and open-licence (SIL Open Font Licence). Installed from npm, so the app works offline. | Easy |
| D21 | Ports: server **3411**, developer mode **5411**, browser-test server **3419** | Chosen so it does not clash with Potwise or Latchlight if they run at the same time. | Easy |
| D22 | One recording can be at most **50 MB** (roughly an hour or more of speech in the browser's format) | A limit stops a mistake from filling the disk. | Easy (one number) |
| D23 | "This week" on the dashboard means **the last 7 days** | Simple to explain and to test. | Easy |

## What the app does (version 1)

1. **Dashboard**: greeting, total recordings, recordings in the last 7 days, total recorded time, recent recordings, and the assistant.
2. **Record**: consent reminder, then a real microphone recording with a timer and a level meter. Give it a title, a folder and a type (voice note or meeting). Save.
3. **Library**: every recording. Search by title or by words in the transcript. Filter by folder, by "Recent" or by "Favourites".
4. **Folders**: make, rename, delete. Deleting a folder keeps its recordings (they move to "No folder").
5. **Recording page**: play the audio, read the transcript, read the summary, tick off action items, rename, move, favourite, delete, and "Transcribe" (sample).
6. **Assistant**: ask about your recordings. Four ready-made questions (summary of recent recordings, trending topics, find recordings about something, what did I promise to follow up). Each answer links to the recordings it used. Sample, not AI.
7. **Settings**: what is sample, what is private, **Start fresh** (remove sample data), **Delete everything**.

## Tech stack in one picture

```
Laptop or phone browser
        |
   React screens (Vite)              <- what you see
        |        \
        |         MediaRecorder      <- the browser records the microphone
        |  asks for data with fetch()
   Express server (Node.js)          <- the rules
        |          |          \
        |          |           transcribeAudio()   <- SAMPLE for now (server/transcribe.js)
        |          |           askAssistant()      <- SAMPLE for now (server/assistant.js)
        |          |
   SQLite file     audio files
   data/sayback.db data/audio/*.webm
```

Everything in the picture is free and runs on your own computer.

## Why not other tools (short)

- **Python (Flask/Django)**: fine tools, but then you learn two languages at once. JavaScript on both sides is simpler.
- **Next.js**: popular, but it hides how the browser and the server talk. Seeing the two halves separately teaches more.
- **Firebase / Supabase / cloud storage**: need accounts, and voice notes would leave your computer.
- **Tailwind**: adds a build step and class names to learn. Plain CSS is easier to explain in a portfolio.
- **A real speech model now**: the free ones run on your computer but are a large download and slow on a small laptop. Your decision, see below.

## Roadmap

| Stage | What | Status |
|---|---|---|
| 1 | Plan, brand, UX and mockups | This run |
| 2 | First working version: record, store, folders, library, search, sample transcript, sample assistant, dashboard | This run |
| 3 | Tests and documents | This run |
| 4 | **Real transcription.** Free route: a speech model that runs on your computer (for example the open-source Whisper models). Paid route: a speech-to-text API. Either goes inside `transcribeAudio()`. | Needs the owner |
| 5 | **Real AI assistant.** Free route: a small local language model. Paid route: an AI API. Either goes inside `askAssistant()`. | Needs the owner / the owner's dad |
| 6 | Upload an audio file you already have; download a transcript as text | Planned |
| 7 | Speaker names in real transcripts, jump from a transcript line to that moment in the audio | Planned |
| 8 | Arabic and right-to-left layout | Planned |
| 9 | Login and many users; lock the app with a passcode | Planned |
| 10 | Installable phone app | Planned (store accounts need the owner's dad) |
| 11 | Put it online | Not started. Not allowed without the owner. Needs real privacy and security work first because it holds people's voices. |

## Needs the owner / the owner's dad

1. Real transcription and real AI: which route (free local model or paid API). Any account, key or payment is yours to decide and do. I did not do any of that.
2. A proper trademark check on the name "Sayback" before any public use. I only did one quick web search.
3. The recording-consent law where you live and study. The app reminds; it is not legal advice.
4. Publishing or deploying anywhere.
5. Your university's rules on AI help in portfolio work, and the lines marked [owner] in PORTFOLIO.md.
6. Trying it on your own computer (README) and telling me if anything fails, especially the microphone on Windows.
