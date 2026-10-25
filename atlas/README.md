# Atlas: personal command center

Atlas is a local-first app that runs on your own computer: projects and tasks, an AI assistant that knows your projects, a Code Lab for your websites and scripts, a Design Studio, an Engineering Lab, a Trading Lab (research, backtests and paper trading only), a Knowledge Vault, automations, and a real system monitor.

Everything is stored in one SQLite file on your computer. Nothing is sent anywhere unless you add an AI or service key.

---

## Quick start (MacBook)

1. Install **Node.js 22 LTS or newer** from [nodejs.org](https://nodejs.org).
2. Open Terminal, go to this folder and install:
   ```bash
   cd pulse-volt/atlas
   npm install
   ```
3. Start it:
   ```bash
   npm run build      # once, and after updating
   npm start          # opens on http://127.0.0.1:4317
   ```
   Or, while changing Atlas's own code: `npm run dev` and open http://127.0.0.1:5173.
4. Optional: turn on AI. Copy `.env.example` to `.env` and add **one** of:
   - `ANTHROPIC_API_KEY=` (Claude, [console.anthropic.com](https://console.anthropic.com))
   - `OPENAI_API_KEY=` (also enables image generation)
   - Free and offline: install [Ollama](https://ollama.com), run `ollama pull llama3.2`, and leave it running. No key needed.

   Restart Atlas, then open **Integrations** and press **Test**.

5. In **Code Lab**, press **Add workspace** and choose a project folder (for example this repo). Atlas can only open folders you add.

> Never paste API keys into a chat or commit them. `.env` is git-ignored, and the Security review warns you if it ever gets committed.

### Using it from the iPad
Atlas only answers on the computer itself by default. To open it from an iPad on the same Wi-Fi, set both of these in `.env`:
```
ATLAS_HOST=0.0.0.0
ATLAS_ACCESS_TOKEN=<a long random string, 24+ characters>
```
Then on the iPad open `http://<your-mac's-ip>:4317/?token=<that string>` once. Atlas refuses to start on the network without a token.

---

## What works, what needs a key, what's planned

| Module | Works now | Needs setup | Planned / not built |
|---|---|---|---|
| **Mission Control** | Active projects with real progress, open tasks (tick to complete), counts (due today, overdue, done this week), activity feed, AI jobs, live CPU/memory/disk, quick actions. **Customize**: show, hide and reorder widgets (saved). | n/a | Calendar and Shopify widgets |
| **AI Assistant** | Chat history saved per conversation, streaming replies, project context (tasks, notes, activity go into the prompt), attach workspace files or vault notes, tool-use status chips. Tools: search Atlas, list tasks, add a task, save a note, read a workspace file, system status. Collapsible side panel (⌘/Ctrl J) that follows the project you're viewing. | An Anthropic or OpenAI key, or Ollama running | Voice input, image input |
| **Project Manager** | Projects (status, colour, pin, linked code folder), tasks with due dates and priority, board view (To do / In progress / Done), per-project notes, chats and activity. | n/a | Drag and drop between columns |
| **Code Lab** | Authorized workspaces, file tree, code editor (CodeMirror, ⌘/Ctrl S), git status, diff, commit history, commit (secret files refused), run `package.json` scripts and `npm install` with live logs, error highlighting and Stop, sandboxed preview of static sites, Open in VS Code, Ask AI about a file. | VS Code's `code` command for "Open in VS Code" | git push/pull, Python script runner, GitHub PRs |
| **Design Studio** | Boards (moodboard, references, UI concept, assets), drag-and-drop uploads, tags, move between boards, download. | Image generation needs `OPENAI_API_KEY` (images are tagged **AI**) | Figma import (connection test only for now), Canva |
| **Engineering Lab** | Markdown docs with Mermaid diagrams, diagram editor, calculator with units (math.js: `5 kg * 9.81 m/s^2 to N`), saved calculations, experiment log, 3D viewer for STL/OBJ/GLB/GLTF, open files in Blender/FreeCAD/OpenSCAD when installed. | Blender / FreeCAD / OpenSCAD installed for "Open in…" | Parametric CAD inside Atlas |
| **Trading Lab** | CSV price import, a clearly labelled synthetic practice series, price chart with 50-day average, backtests (buy & hold, MA crossover, RSI, breakout) with fees, slippage and next-day fills, metrics vs buy & hold, trade list, paper-trading accounts with positions and P&L. | Alpha Vantage key for downloading prices | Live prices, alerts. **No broker connection or real money, by design.** |
| **Knowledge Vault** | Markdown notes, tags, pin, full-text search (also used by the AI and ⌘/Ctrl K), import a folder of `.md` files, download as `.md`. | n/a | Google Drive / Notion import |
| **Automation Center** | Scheduled or manual jobs: database backup (a daily one is pre-made), website up-check, git snapshot, run an approved script (blocked if the script changes after approval), AI daily digest saved to the vault. Full job logs, cancel. | AI digest needs a provider | Notifications, Shopify order alerts, file triggers |
| **System Monitor** | Real CPU (total and per core), load, memory, disks, uptime, Atlas's own size and memory. Security review (open to the network? `.env` committed or readable? backups recent? secrets committed in workspaces?). Error log. | n/a | Temperatures, GPU, battery (Node can't read them; listed as "Not available") |
| **Integrations** | Status of every provider and tool, one-click connection tests. | Keys in `.env` | Shopify, Google Drive, Calendar |
| **Settings** | Your name, default AI provider and models, standing AI instructions, backup count and downloads. | n/a | Light theme |

Every button either works or is marked **Planned** or **Needs setup**.

**Shortcuts:** ⌘/Ctrl K search and commands · ⌘/Ctrl J AI panel · `g` then a letter to jump (g m, g a, g p, g c, g d, g e, g t, g k, g u, g s, g i) · `[` collapse sidebar · `?` all shortcuts.

---

## How Atlas keeps you safe

- **Local only by default.** The server listens on `127.0.0.1` and rejects requests whose `Host` isn't localhost (this blocks DNS-rebinding attacks from websites).
- **No cross-site requests.** Every change needs a custom header plus a same-origin check, so another website can't click buttons for you.
- **Confirmation is enforced by the server**, not just the UI: deleting things, saving files, running scripts, git commits and adding workspaces all require an explicit confirmation header. Deleting a project also makes you type its name.
- **File access is fenced in.** Only folders you add as workspaces. `..` paths and symlink escapes are blocked. `.env`, keys and credential files can't be read, written, previewed, attached to AI or committed. Writing inside `.git` is blocked. Every save keeps the previous version in `data/backups/files/`.
- **Scripts:** only scripts already in the project's `package.json` (plus `npm install`) can run, without a shell. Scheduled scripts are pinned to the exact command you approved.
- **Previews are sandboxed** (opaque origin + CSP `sandbox`), so a previewed site can't call the Atlas API, and preview URLs contain a random per-run secret so other websites can't read your files through them. Uploaded SVGs are served sandboxed too.
- **API keys never reach the browser.** Only the server reads `.env`.
- **AI tools only add data** (tasks, notes); they can't delete, edit files, run commands, trade or spend money.

## Backups and restore

- A **Daily database backup** automation is created on first run (keeps 14). Run one any time with **Back up now** (Mission Control, Settings or ⌘K).
- Backups are in `atlas/data/backups/` and can be downloaded from Settings.
- **Restore:** stop Atlas → move `data/atlas.db` aside → copy a backup to `data/atlas.db` (delete any `atlas.db-wal` / `atlas.db-shm`) → start Atlas.
- To move Atlas to a new computer, copy the whole `data/` folder.

## Architecture

```
atlas/
  server/                 Fastify API (TypeScript, run with tsx)
    index.ts              start-up: loads .env, refuses unsafe network config
    app.ts                builds the app (also used by tests)
    config.ts             all settings from environment variables
    db/                   node:sqlite (built into Node 22) + append-only migrations
    lib/                  security, path guard, process runner, metrics, search, errors
    ai/                   provider abstraction: Anthropic (official SDK), OpenAI-compatible (OpenAI, Ollama), tools
    jobs/                 persistent job queue + scheduler + automation handlers
    integrations/         integration registry, desktop-tool detection, connection tests
    trading/engine.ts     indicators, backtester, CSV parser, synthetic data
    routes/               one file per module
  web/                    React 19 + Vite + Tailwind v4 UI
    src/components/ui     design-system primitives (Button, Card, Modal, charts…)
    src/components/shell  sidebar, command palette, AI panel, shortcuts
    src/modules           one file per module
  tests/server            Vitest API and unit tests (mock AI servers, temp git repos)
  tests/e2e/smoke.mjs     Playwright run through every module at desktop, iPad and phone sizes
```

Design choices, kept deliberately simple:
- **SQLite via `node:sqlite`**: no database server and no native compile step. Fine for one person; PostgreSQL only if Atlas ever becomes multi-user.
- **In-process job queue** stored in SQLite: survives restarts (interrupted jobs are marked failed), no Redis needed.
- **Providers behind one interface** (`server/ai/types.ts`): adding Gemini or another OpenAI-compatible server is one file. Claude conversations replay the exact native transcript (append-only) so tool use and thinking stay valid across turns; Claude requests opt in to server-side refusal fallbacks.
- Design tokens live in `web/src/styles.css` (dark "OLED" developer style from the UI/UX Pro Max skill; chart colours checked with a colour-blind-safety validator).

### Environment variables
See `.env.example`. Main ones: `ATLAS_PORT` (4317), `ATLAS_HOST` (127.0.0.1), `ATLAS_ACCESS_TOKEN`, `ATLAS_DATA_DIR` (./data), `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-opus-5-5`), `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_IMAGE_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TOOLS=1` (let local models use tools), `GITHUB_TOKEN`, `FIGMA_TOKEN`, `ALPHAVANTAGE_API_KEY`.

## Tests

```bash
npm run typecheck        # TypeScript, server + web
npm test                 # 41 API/unit tests (security, path guard, CRUD, search, trading engine,
                         # Code Lab with a real git repo, AI streaming + tool loops against mock servers, jobs)
npm run build && npm run test:e2e   # browser run-through; needs: npm i -D playwright && npx playwright install chromium
```

The AI tests use local mock servers. They prove the streaming and tool-call plumbing, not a live provider. Use **Integrations → Test** with your own key for that.

## Troubleshooting

- **"No AI provider is set up yet"**: add a key to `.env` (or start Ollama) and restart Atlas.
- **"Open in VS Code" fails**: in VS Code, run *Shell Command: Install 'code' command in PATH*.
- **A script says npm not found**: install Node.js and restart Terminal.
- **Port already in use**: change `ATLAS_PORT` in `.env`.
- Errors from AI, jobs and the server appear in **System Monitor → Logs**.
