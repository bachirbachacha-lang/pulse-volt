# PC setup (Windows) for Pixel & Co.

New Claude account: bachirbachacha188@gmail.com. Start on the FREE plan; move Pro over when the old account's month ends (cancel old Pro through support chat). Dad approves every payment.

## Day 1 (must have)
1. Claude desktop app: claude.ai/download → sign in with the 188 email.
2. GitHub Desktop: desktop.github.com → log in → clone `bachirbachacha-lang/pulse-volt` → switch branch to `claude/shopify-product-website-mrj6f2`.
3. Git for Windows: git-scm.com
4. Node.js 22 LTS: nodejs.org (needed for Atlas and running sites)
5. VS Code: code.visualstudio.com
6. Claude Code: claude.com/claude-code, follow the Windows steps (works with Pro).
7. Then read START-HERE.md and paste its first message into Claude.

## Videos and design
- CapCut desktop or DaVinci Resolve (free) for reels. Final Cut is Mac only.
- Canva desktop app.
- Later: Figma (plan sites), Spline (easy 3D), Blender (pro 3D, uses the graphics card).
- For Claude's video tools: Python 3 (python.org, tick "Add to PATH") and ffmpeg (`winget install ffmpeg`).

## AI tools
- Ollama (ollama.com): free AI that runs on the PC's graphics card. Atlas can use it with no API key.
- Codex (OpenAI): optional, needs a ChatGPT plan.
- 21st.dev: website components, use it in the browser.
- API keys: never paste them in a chat; they go only in `atlas/.env`.

## Atlas (personal command center)
```
cd pulse-volt/atlas
npm install
npm run build
npm start
```
Open http://127.0.0.1:4317. Details in atlas/README.md.

## Accounts already made
- GitHub: bachirbachacha-lang (check Settings → Emails uses an inbox you can open)
- Netlify: team Pixel & Co. (for putting client sites online)
- Canva: posts and flyers

## Safety
- Download only from the official sites above. No cracked apps, .exe from DMs or "free Pro" tools.
- Keep Windows Defender and updates on.
