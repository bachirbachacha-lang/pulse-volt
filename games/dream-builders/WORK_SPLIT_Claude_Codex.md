# Dream Builders: who works on what (Claude + Codex)
Updated 8 Nov 2026 by Claude. Read this before you start. Check it again before every new task.

## Change on 8 Nov (owner's master prompt pack)
- **Claude** is the only agent that edits, saves or Play-tests the live place (DreamBuilders.rbxl).
- **Codex** is the read-only auditor, planner and code reviewer. Codex may read files, scripts and logs, write plans and review notes, and review Claude's changes. Codex must not edit or save the place, move map objects, or run anything destructive, unless the owner changes this rule.
- The "Codex makes files" lanes below are kept for history only. Don't start new Codex file work unless the owner asks for it.

## Golden rule
- ONLY CLAUDE EDITS ROBLOX STUDIO (DreamBuilders.rbxl).
- Codex must not open, change or save DreamBuilders.rbxl. If two agents save the same place, one deletes the other's work.
- Codex makes files. Claude imports them into Studio and tests them in Play.

## Claude (Roblox Studio: gameplay + world)
- Property: buying villas, driveways, garages, yards
- Business saving between sessions
- Phone apps: Dreamgram, Messages, Food delivery, Construction supplies
- Gameplay for each job: Real Estate Agent, Car Dealer, Chef, Delivery Driver, Fashion Designer
- Roads, NPC traffic, pedestrians, buses and taxis inside Studio
- Testing everything in Play mode and writing STATUS.md

## Codex (files only: Blender + docs + Lua drafts)
1. Blender props, in Codex's OWN Blender window. Export FBX to `Downloads\DreamBuilders_models\codex_ready\`:
   - FBX settings: scale 1 unit = 1 stud, Forward -Z, Up Y, apply scale "FBX All"
   - Under 10k triangles each
   - One .png render per model
   - Models:
     - street: traffic light, bus stop shelter, bench, bin, street sign (no real brands)
     - home: garage door, driveway gate, garden lights, sun lounger, outdoor sofa
     - shop interiors: salon chair, clothing rack, gym bench, café counter, jewellery display case
     - delivery scooter, food delivery bag
     - airport terminal + small jet, for later
2. Docs, written as .md files in `Downloads\DreamBuilders_codex\docs\`:
   - PROJECT_OVERVIEW
   - TECHNICAL_ARCHITECTURE
   - GAME_SYSTEMS
   - ASSET_INVENTORY
   - VISUAL_STYLE_GUIDE
   - DEVELOPMENT_ROADMAP
   - KNOWN_ISSUES
   - SKILLS_AND_INTEGRATIONS
3. Lua drafts, as files in `Downloads\DreamBuilders_codex\lua\`, NOT pasted into Studio:
   - EconomyService ModuleScript: one secure place for money, salaries and purchases, with server checks only
   - AI employee system draft: hire, pay, shifts
   - Claude reviews, imports and tests these.

## Cars
- Don't make more procedural cars. The last ones were judged toy-like.
- Car models wait for the owner's decision: a pro pack through Dad, or vetted original models.

## When you finish something
Add one line at the bottom of this file: date, who, what file.

## Log
- 7 Nov, Claude: property v1 done in Studio (buy villa from the phone, owner sign, locked doors, My Home GPS, saved). Tested in Play.
- 8 Nov, Claude: Phase A from Codex's handoff. Backup made, Phone:342 ScreenFade fix in LobbyServer (tested), asset warnings mapped (harmless), smoke tests passed. See PHASE_A_RESULTS.md.
- 8 Nov, Claude: fixed the 4 Phase A bugs (buried villa, shop sign, rent board, Serve/Hire key) in Studio, each tested in Play. See BUGFIX_REPORT_2026-11-08.md. Codex: please review the BusinessServer/StaffServer diff.
