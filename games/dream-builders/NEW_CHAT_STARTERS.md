# Dream Builders: prompts to start new chats

Paste one of these as the first message in a new chat. Each one tells Claude where everything is, so you don't have to explain the project again.

---

## 1. Main chat (whole project)

```
I'm the owner of Dream Builders, a luxury Dubai-style Roblox business + life roleplay game (Roblox user crrusher14, Riyadh time).

Where things are:
- Place file: C:\Users\PC\Downloads\DreamBuilders.rbxl (open in Roblox Studio; the Studio MCP is connected)
- Code + docs on GitHub: pulse-volt repo, branch claude/shopify-product-website-mrj6f2, folder games/dream-builders
- Read these first: games/dream-builders/DEVELOPMENT_STATUS.md, FEATURE_STATUS.md, SECURITY_REVIEW.md
- Scripts are copies in games/dream-builders/roblox/src (sync: save in Studio, extract scripts, commit)

Rules:
- Be honest: label everything Fully working / Partly done / Planned / Not started. Never say something works unless you tested it in Studio Play mode.
- Back up before big changes. Only one AI edits Studio at a time (Codex makes files only).
- No real brands, logos, car makes or plates; no ripped or copied models.
- Never publish the game or spend Robux. Money, publishing and contracts go through my dad.
- Never ask for passwords or API keys.
- Save everything to GitHub when done.

Start by reading the status files, then tell me the top 5 things to do next.
```

---

## 2. Design chat (buildings, houses, city looks)

```
Dream Builders design chat. Read games/dream-builders/DEVELOPMENT_STATUS.md on branch claude/shopify-product-website-mrj6f2 (pulse-volt repo) first.
Goal: make the city look Berry Avenue quality. Studio MCP is connected. Blender 5.2 is installed; I'll click "Start MCP Bridge Server" in Blender's side panel when you need it.
Useful code: ServerStorage.DB_Tools.ModernHouseKit and MarinaRowBuilder (part-built modern houses).
Test every change in Play mode (walk through doors and up the stairs) and show me screenshots. Same rules as the main project: honest status, no copied models or real brands, save to GitHub.
First task: [write what you want, e.g. "build the upper floors of towers 2, 5 and 6"]
```

---

## 3. Gameplay and jobs chat

```
Dream Builders gameplay chat. Read games/dream-builders/FEATURE_STATUS.md and DEVELOPMENT_STATUS.md (pulse-volt repo, branch claude/shopify-product-website-mrj6f2) first.
There are 14 jobs, a phone with 13 apps, businesses, villas, cars, metro, taxi, flights.
The server decides money and ownership (see SECURITY_REVIEW.md). Test every feature in Play mode before calling it done.
First task: [e.g. "main menu bar from the overhaul brief" or "let players place furniture in their home"]
```

---

## 4. NPC and city life chat

```
Dream Builders NPC chat. Read DEVELOPMENT_STATUS.md (pulse-volt repo, branch claude/shopify-product-website-mrj6f2) first.
NPC code: ServerStorage.DB_Tools.NpcKit, ServerScriptService.CityLifeServer (55 AI people), TransitServer (traffic, bus, walkers), LobbyServer (tower staff).
Goal: NPCs that look and act more alive (hair/outfits from Roblox's own free catalog items only, idle animations, more walking routes) while keeping the server at 60 fps.
```

---

## 5. Prompts and planning chat

```
Dream Builders planning chat. I want help writing clear prompts and plans for Claude and Codex.
Read games/dream-builders/WORK_SPLIT_Claude_Codex.md and DEVELOPMENT_STATUS.md (pulse-volt repo, branch claude/shopify-product-website-mrj6f2).
Keep Claude and Codex on different tasks so they don't block each other. Codex only makes files; Claude edits Studio.
```
