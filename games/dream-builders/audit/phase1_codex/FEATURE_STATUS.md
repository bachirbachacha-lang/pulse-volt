# Dream Builders — Feature Status

**Last updated:** 7 Nov 2026. **Scope:** evidence in the shared files and the dated Claude/Codex handoff log. Codex has not opened the Studio place for this pass.

## Status meanings

- **Fully working:** tested in Roblox Studio Play and recorded by the Studio owner. “Reported” identifies work Codex has not independently reproduced.
- **Partially implemented:** code or exported files exist, but important integration, review, persistence, or Play checks remain.
- **Planned:** named in the collaboration plan, with no implementation evidence in the shared files reviewed here.
- **Not started:** explicitly absent or stubbed in the reviewed implementation; this does not claim anything about unshared Studio changes.

## Current feature matrix

| Feature | Status | Evidence and remaining work |
|---|---|---|
| Property v1: villa purchase, owner sign, locked doors, My Home GPS, saved state | **Fully working (Claude-reported)** | Claude's 7 Nov handoff log says it was tested in Play. Codex has not independently retested it. |
| Luxury phone UI | **Partially implemented** | `ui/DreamUI.client.lua` exists and builds the UI. The shared file alone does not establish that every control works in the current place. |
| Daily spin and prize cooldown | **Partially implemented** | `ui/DreamUIServer.server.lua` contains weighted prizes and a 24-hour cooldown. Requires `leaderstats.Money`; current-place Play behavior is not verified here. |
| In-game shop purchases | **Partially implemented** | UI sends an item request and server allowlists IDs/logs requests; it does not grant or buy items. |
| Robux purchases | **Not started** | The shared shop server code explicitly has no Robux transaction handling. |
| EconomyService draft | **Partially implemented** | Draft file exists; not reviewed, integrated, or tested in Studio. |
| Employee hire/shift/pay draft | **Partially implemented** | Draft/config files exist; state is in-memory only. No NPC spawning/pathfinding, remotes, or persistence integration is evidenced. |
| Codex hard-surface prop handoff (19 FBX + 19 preview PNG) | **Partially implemented** | Files are exported under `DreamBuilders_models/codex_ready/`; all 19 FBXs re-imported successfully and are under 10k triangles. Not imported into Studio, collision-checked, or Play-tested. |
| Player job gameplay (real estate, car dealer, chef, delivery, fashion) | **Planned** | Listed in the work split; no playable implementation evidenced in shared files reviewed here. |
| Business persistence beyond property v1 | **Planned** | Listed in Claude's work lane; implementation status beyond property v1 is not established by these files. |
| Dreamgram, Messages, food delivery, construction supplies phone apps | **Planned** | Named in the work split; no working implementation evidenced in shared files reviewed here. |
| Traffic, pedestrians, buses, taxis | **Planned** | Named in the work split; no implementation evidence in the shared files reviewed here. |
| Airport terminal and small jet props | **Partially implemented** | Both FBXs and previews are delivered; they have not been imported into Studio or Play-tested. |
| Boats + furnished interior modules (6 FBX + 6 previews) | **Partially implemented** | Yacht, speedboat, living room, kitchen/dining, bedroom, and hotel lobby exported from Blender; all six FBXs re-imported with nonzero bounds and remain under 10,000 triangles. File handoff only; Claude has not imported or tested them in Studio. |

## Verification boundary

Only Claude edits/imports into `DreamBuilders.rbxl` and tests it in Play. File existence, successful export, and historical output messages do not prove a feature works in the current place. Update this matrix when Claude records new Studio evidence.




## 8 Nov 2026 — Live read-only evidence update
- **Phone ScreenFade:** Partially implemented; high-confidence argument-contract defect identified, not fixed or tested.
- **Asset loading:** 20 IDs warned “Asset content representation is being generated”; paths/final availability unknown.
- **Business, vehicle, metro, NPC:** content/scripts exist; current behavior unverified by Codex.
- **Map/access:** counts inventoried; coordinates, bounds, route graph and collision audit incomplete.
No place changes were made. Claude remains owner of implementation and Play verification.
