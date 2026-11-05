# Dream Builders (Roblox game, with the owner's little brother)
Read owner.md first.

## Idea
Rich clients buy mansion plots; players take jobs (Construction Worker, Architect) and build the mansions together for money. Controls the owner wants: WASD, Space, Shift (run), E (interact).

## Where things are
- Browser prototype (Three.js, playable): `games/dream-builders/index.html`
- Roblox scripts: `games/dream-builders/roblox/` (run in the Studio command bar, edit mode). `01_world.lua` = the map.
- The place file on the PC: `C:\Users\PC\Downloads\DreamBuilders.rbxl` (open with Studio → File → Open from File).
- Free Roblox skills pack the owner liked (from an Instagram reel): github.com/SyphoDev-yt/roblox-ai-skills (roblox-map, roblox-3d-model, roblox-texture-gen, create-roblox-game …). Built for Claude Code on the owner's own computer + Studio MCP + Python + Blender. Read before using; never run downloaded scripts blindly.

Design doc with all ideas: `games/dream-builders/DESIGN.md`.

## Status (5 Nov): map v2 + gameplay installed in Studio and saved; play-tested by the owner

## Status (4 Nov)
- DONE: world built in Studio and saved: avenue, 3 cross streets, 6 mansion plots (Plot1–6, attribute Stage=0, FOR SALE signs), Dream Builders HQ, job pads (Construction Worker / Architect, attribute Job), Supply Yard with brick stacks, spawn at HQ.
- NEXT: step 2 gameplay (ServerScriptService): leaderstats Money; touch a job pad = take that job; Architect touches a plot sign = blueprint (Stage 1); Worker grabs a brick at the yard and delivers it to a plot = next stage (foundation → walls → floors → roof → pool); finished mansion pays everyone who helped; rich client NPC per plot.
- Then: UI (job + money HUD), sounds, nicer mansion models, save data (DataStore), publish (the owner publishes, not Claude).

## How Claude works on it
- Best: Studio's MCP (Assistant → ⚙️ → MCP Servers → "Enable Studio as MCP server"; it shows a JSON config / Claude Code CLI quick connect). On 4 Nov the Claude desktop app config was edited (Roblox_Studio entry) but the cloud chat never saw the tools.
- Fallback that works: computer use on Studio. Paste Luau into the command bar at the bottom, press the Run button (Ctrl+Enter didn't run it). Lighting.Technology can't be set from the command bar.
- Gotchas: Studio's "Auto Recovery File Found" dialog can render as a blank box and steal the keyboard: click Ignore. Don't use "open application" on Studio, it starts extra copies. Close Task Manager windows before working.
- CAPTCHA / login: never solve it for the owner. Quick Login (phone app → Settings → Quick Log In) or Studio just remembering the login worked.
- New Mac (MacBook Air M5, ordered): Roblox Studio runs on macOS; the same scripts work. Claude Code on the Mac can connect to Studio MCP directly with the "Claude Code CLI" quick connect.
