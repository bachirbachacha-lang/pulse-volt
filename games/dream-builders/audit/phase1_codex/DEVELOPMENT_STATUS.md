# Development Status — Dream Builders

**Updated:** 7 Nov 2026  
**Current phase:** Phase 1 — Foundation and repair (**in progress; Studio audit pending**)  
**Audit scope:** shared DreamBuilders files available under `Downloads\DreamBuilders_codex` and the documented handoff. This is not an audit of the live Roblox DataModel.
## Master-prompt status labels

| Work item | Status | Evidence |
|---|---|---|
| Audit of shared files | **COMPLETE (limited scope)** | Read handoff, UI client/server, EconomyService, EmployeeService, and config. |
| Full live Studio/DataModel audit | **BLOCKED** | Active owner split prohibits Codex from opening `DreamBuilders.rbxl`; Claude owns Studio inspection and Play tests. |
| Vehicle collision diagnosis/fix | **NOT STARTED** | The prompt reports the issue, but no vehicle/object path or collision properties were available to inspect. |
| Property v1 | **COMPLETE (Claude-reported)** | Handoff says property purchase/access/GPS/save were tested in Play; Codex did not independently retest. |
| 19 prop exports | **TESTED — NEEDS POLISH** | FBX re-import checks passed offline. They are blockouts and still need Studio import, collision and scene-fit review. |
| 6 boat/interior exports | **TESTED — NEEDS POLISH** | Offline FBX re-import passed for yacht, speedboat, living room, kitchen/dining, bedroom, and hotel lobby; Studio placement and Play checks remain. |
| Economy and employee modules | **IMPLEMENTED — NOT TESTED** | Drafts are on disk, but not integrated into the place or tested. |
| Shop purchase flow | **NOT STARTED** | Shared server handler only logs request IDs. |

## Access and ownership boundary

`WORK_SPLIT_Claude_Codex.md` says **ONLY CLAUDE EDITS ROBLOX STUDIO** and directs Codex not to open, change, or save `DreamBuilders.rbxl`. Claude imports files, tests in Play, and owns gameplay/world edits. I followed that rule. The actual place, Explorer tree, current Output, vehicle scripts, collision geometry, and live DataStore code were not accessible for this audit, so no Studio inspection or place change is claimed.

## Current project structure inspected

Available shared files:

- `ui/DreamUI.client.lua` — client-created Shop, Daily Spin, and Settings panels.
- `ui/DreamUIServer.server.lua` — creates `ReplicatedStorage.DreamUI` remotes, grants spin rewards on the server, and leaves shop requests inert.
- `lua/EconomyService.lua` — standalone money-service draft; not imported.
- `lua/EmployeeService.lua` and `lua/EmployeeConfig.example.lua` — in-memory employment/pay draft and example config; not imported.
- `docs/` — project notes, feature matrix, and this status report.
- `WORK_SPLIT_Claude_Codex.md` — Claude/Codex boundary and dated progress log.
- `Downloads\DreamBuilders_models\codex_ready\` — 19 FBX props and matching PNG previews, plus README. Blender re-import checks passed; these are blockout assets and have not been imported into Studio.

Not inspected: `Workspace`, `ReplicatedStorage`, `ServerScriptService`, `ServerStorage`, `StarterGui`, `StarterPlayer`, `Lighting`, `SoundService`, `Teams`, terrain, roads, properties, vehicles, metro, NPCs, live remotes, current Output, current place backup, and DataStore schema. The shared files do not include these systems.

## Existing feature inventory

| System | Current evidence/status |
|---|---|
| Property v1 | **Claude-reported tested in Play:** villa purchase from phone, owner sign, locked doors, My Home GPS, saved property. No independent re-test in this audit. |
| Luxury UI | **Implemented in shared client file; not verified in current place.** Three panels exist: Shop, Spin, Settings. |
| Daily spin | **Implemented in shared server file; not verified in current place.** Server chooses weighted prizes and sets a 24-hour cooldown using a Player attribute. Cash prizes require `leaderstats.Money` (`IntValue`). |
| Shop | **Placeholder / not functional as a purchase.** The client displays `R$ ???`; server only allowlists/logs item requests and performs no purchase. |
| Economy service | **Draft only.** It reads/writes `leaderstats.Money`; the live balance owner and persistence integration are unknown. |
| Employee system | **Draft only.** Hire/shift/pay state is in memory; no NPC, remotes, persistence, or Studio integration in these files. |
| Prop models | **File handoff complete; game integration not tested.** 19 FBXs and 19 PNGs; Blender re-import checks passed under the 10k-triangle cap. |
| Jobs, extra phone apps, traffic/NPC transit | **Planned in the handoff.** No implementation evidence in the shared files inspected. |
| Robux purchases | **Not started in the shared shop implementation.** No MarketplaceService purchase flow is present there. |
| Metro and road network | **Unknown for this audit.** Prior notes mention metro station folders and an earlier StairTower edit; current state and geometry must be checked by Claude. |

## Working systems to preserve

- Preserve Claude's reported property v1 behavior and its saved-data compatibility. Review before changing its schema or ownership rules.
- Preserve the server-side spin prize selection and cooldown logic while checking how its cooldown and rewards interact with live persistence and other balance writers.
- Preserve existing vehicle physics, road surfaces, collision groups, and metro behavior until the responsible Studio owner reproduces and documents the actual fault. No live implementation was available to inspect.
- Treat existing property, business, UI, metro, and place scripts as protected until Claude inventories dependencies and backs up the affected content.

## Broken, incomplete, and unknown systems

- The shop advertises Robux prices but has no purchase behavior; clicks only send an item ID to a logging placeholder.
- Settings toggles only change local Player attributes in the supplied client file. No persistence or consumer for music, SFX, and minimap settings is shown. Graphics changes `Lighting.GlobalShadows` locally.
- Spin cooldown is stored as a Player attribute in the supplied server file; persistence across leaving/rejoining is not implemented in that file.
- The spin script directly writes `leaderstats.Money`, while the separate EconomyService draft also writes that value. There is no shared live integration evidence showing one approved balance owner.
- The employee draft resets when the server closes and has no world/remote integration.
- UI uses fixed pixel panel dimensions and contains only Shop, Spin, and Settings navigation; responsive behavior and other navigation categories are not evidenced.
- The earlier `Toast is not a valid member of ScreenGui "DreamHUD"` and asset-representation warnings are historical observations. Their current presence, source, and cause are unknown. Do not suppress them or guess at asset permissions without checking current Output and the referenced asset/code.
- The master brief reports vehicle obstructions from floor tiles, grass, and decorations. The object names, collision settings, vehicle chassis, and root cause are **not inspected**, so the reported issue is not diagnosed or fixed here.
- Current roads, vegetation, building access, interiors, lighting, performance, DataStore behavior, and multiplayer behavior are unknown from the available files.

## Ten highest-priority issues to resolve

Ranks reflect risk stated in the brief and the evidence gaps; they are not claims of independent Studio verification.

1. **Vehicle obstruction (reported by the brief; root cause unknown).** Reproduce with the actual vehicle on each affected surface, then identify the exact collidable object/proxy before changing collision.
2. **Unknown collision and vehicle setup.** Chassis, wheel contacts, collision groups, query/touch settings, and road/driveway surfaces have not been inspected.
3. **No current project backup/restore evidence in the shared files.** Claude should confirm a recoverable place copy and data/schema notes before any Studio edit.
4. **Balance ownership is unclear.** Spin directly mutates `leaderstats.Money`; EconomyService is an unintegrated second writer candidate.
5. **Shop displays a price but cannot purchase.** `R$ ???` is misleading; the server handler only logs an allowlisted request.
6. **Reward cooldown persistence is unproven.** The supplied spin code uses a Player attribute, which does not establish a cross-session 24-hour limit.
7. **Current errors and asset warnings are undiagnosed.** Historical logs are not enough to identify whether the cause is code, availability, permissions, loading, or asset type.
8. **Persistence and migration safety are unknown.** No live player/business/property DataStore schema or failure handling is present in the shared files inspected.
9. **UI settings and responsive behavior are incomplete/unverified.** Several toggles lack a shown consumer or persistence; fixed pixel layouts may not fit mobile screens.
10. **No verified integration/test evidence for most game systems.** Jobs, traffic/NPCs, business operations, metro travel, shop purchase, multiplayer, and asset imports need owner-run checks and evidence.

## Visual and gameplay weaknesses

**Evidenced in shared UI code:** it uses a consistent charcoal/gold/ivory palette, but the available navigation exposes only three panels; the shop has a fake price and inert action; settings lack visible save/load or application logic in these files. The client layout uses fixed pixel sizes.

**Reported in the supplied master brief, not independently inspected:** unwanted vehicle bumps/blocking from floor tiles, grass, and decoration; overly saturated or rough visual areas; poor vegetation placement; gaps in the environment. The actual map quality and affected locations remain unknown until Claude inspects the place.

## Technical and performance risks

- Client-set attributes must not be treated as authoritative for purchases, ownership, or other security-sensitive state.
- Confirm only one server-owned balance service writes money before enabling purchases or payroll.
- If the spin cooldown must persist across sessions, store it through the existing approved player-data path; do not introduce a competing schema.
- Employee payroll needs server scheduling, rate/ownership checks, persistence decisions, and bounded work before it is wired to remotes.
- Inspect event connection cleanup, repeated UI construction, NPC/object spawn caps, part counts, physics load, and streaming in the actual place; no conclusion is possible from the shared files alone.
- Do not globally disable collisions. Classify road surfaces, vehicle-solid objects, character-solid objects, and decoration, then test intended interactions.
- Model FBX readability and triangle limits were checked offline, but Studio import scale, materials, pivots, collision, and scene fit remain unverified.

## Recommended architecture

Adapt incrementally after inspecting the live tree; do not mass-move or replace existing systems.

- Keep client controllers/UI in StarterPlayer/StarterGui and shared, non-authoritative config/types in ReplicatedStorage.
- Keep authoritative player data, economy, property, business, vehicle, mission, metro, and NPC services in ServerScriptService, with templates/assets in ServerStorage or the existing approved asset location.
- Define one server-owned player-data contract and route money changes through one economy service. Validate every remote request on the server and add request rate limits where actions can be spammed.
- Keep persistence changes backward-compatible and migration-aware; preserve the existing property v1 save format until Claude inspects it.
- Use an explicit collision classification and simple collision proxies; keep noninteractive grass/decor out of vehicle collision without disabling intended character/object interactions.
- Integrate one small system at a time, and require Studio owner review, relevant Play checks, and saved evidence before calling it tested or complete.

## Phased implementation plan

1. **Foundation and repair:** Claude backs up the current place, inventories the live tree and Output, reproduces the driving fault, diagnoses errors/references, then makes the smallest verified collision/code fixes.
2. **World reconstruction:** repair only confirmed road connections, residential/downtown gaps, entrances, and accessible destinations; preserve working place content.
3. **Visual quality:** establish consistent lighting/material rules and fix verified vegetation/building/interior issues.
4. **Properties and lifestyle:** preserve property v1, audit its saves/permissions, then add homes/interiors incrementally.
5. **Islands/commercial areas:** build named destinations and interactions after map/transport dependencies are known.
6. **Transportation:** validate vehicles and metro before adding routes/doors/destinations; do not add destinations that do not exist.
7. **NPCs/interactions:** add bounded, scheduled NPC activity with measured performance.
8. **Gameplay systems:** integrate economy, jobs, businesses, missions, inventory, avatar, phone, and social features one service at a time.
9. **UI/final QA:** make navigation responsive, wire real actions, verify multiplayer/data flows, inspect Output, and profile performance.

## Exact first changes to make

No place change is safe to specify until Claude completes the missing inspection. The first Studio actions are:

1. Verify/record a restorable copy and inventory the current place scripts, remotes, collision groups, vehicle chassis, and relevant DataStore schema.
2. Capture current Output and reproduce one vehicle obstruction on a named road/driveway/floor/grass object using the existing vehicle.
3. Record the offending object's path and collision properties plus the vehicle's result before changing anything.
4. Apply the smallest source-level correction to that specific surface/object, keeping character and intended interaction collision intact.
5. Retest that surface with the actual vehicle, then test nearby road/driveway transitions and character interaction; record the result and any regressions.

These actions belong to Claude under the active work split. Codex has not changed Studio.

## Tests performed

- Read the shared collaboration note, UI client/server source, EconomyService draft, EmployeeService draft, and example config.
- Blender 5.2.3 FBX re-import check: 19/19 models contained mesh geometry, had nonzero bounds, and were under 10,000 triangles. Highest observed: airport terminal at 2,376 triangles.
- No Studio, Play, multiplayer, collision, DataStore, or live Output tests were performed in this audit.

## Files and systems changed

- Added this audit/status report. Roblox Studio systems and the place were not changed.
- Earlier Codex deliverables remain in the shared folders and in `DreamBuilders_Codex_Deliverables.zip`; model files remain unimported.

## Risks and follow-up

- The live place may have changed since the dated handoff; all source-derived statuses need comparison with the current Studio tree.
- Claude should review the previously recorded `Station_Downtown.StairTower` change before deciding whether to keep or revert it.
- Property v1 is marked fully working only as Claude-reported in the handoff log; Codex did not reproduce the Play test.

## Next session starting point

Claude: inspect the live vehicle/collision setup and reproduce the reported obstruction on one named surface, using the five-step change procedure above. Codex: continue only after the Studio owner records the audited tree, root cause, and approved file-only task in the shared handoff.


## 7 Nov 2026 — separate Blender asset lane

Added six blockout assets under `DreamBuilders_models/codex_ready/interiors_boats/`: luxury yacht, coastal speedboat, living room set, kitchen/dining set, bedroom suite, and boutique hotel lobby. All have matching PNG previews. Blender 5.2.3 exported FBX files with metre-to-stud scaling, Forward -Z, Up Y, and Apply Scale. Offline FBX re-import checks passed: dimensions are nonzero and triangle counts are 2,184–4,236. This does not establish Studio integration, appearance after Roblox import, collisions, or playability. Claude's open Studio work and house designs were left alone.


## 8 Nov 2026 — Live read-only inspection supplement
Studio remains owned by Claude. Codex inspected the live hierarchy/source/Output read-only; no DataModel changes or saves were made. Current file is 4,591,091 bytes (8 Nov 01:06). The available 7 Nov backup is older and restoreability unverified.

| System | Status | Evidence |
|---|---|---|
| Property v1 | Fully working (Claude-reported only) | 7 Nov handoff reports purchase, sign, locked doors, GPS, save tested in Play; Codex did not reproduce. |
| Phone ScreenFade | Partially implemented; defect identified, not fixed | LobbyServer sends no message; Phone assigns event argument to TextLabel.Text. |
| Asset content | Unknown; warnings observed | 20 IDs logged as “Asset content representation is being generated”; paths/availability unresolved. |
| Business, vehicle, metro | Present; function unverified | Scripts/folders observed; no test by Codex. |
| AI people | Partially implemented; behavior unverified | Output said 55 people placed; pathing/interactions not tested. |
| Day/night | Unknown | Lighting/scripts present; no controlled cycle test. |
| District/access | Not measured | Counts inventoried; no coordinates or route graph. |

The older scope statement saying no live Studio inspection was performed is superseded for read-only review on 8 Nov. No bounds, collision graph, data schema, or gameplay test was performed. See PHASE_A_CLAUDE_HANDOFF.md.
