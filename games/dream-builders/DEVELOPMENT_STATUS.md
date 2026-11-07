# Development Status – Dream Builders
Updated 7 Nov 2026 (22:xx Riyadh), by Claude, following the "Ultimate Roblox Game Overhaul" brief.

## Current phase
Phase 1 — Foundation and repair. The collision and road blockers are done; one item is blocked (see below).

---

## Audit report (Studio inspected live through the Roblox Studio MCP, plus the repo)

### 1. Project structure (as it is now)
- **Workspace**
  - 14,743 parts (1,638 meshes), 233 models, StreamingEnabled on.
  - Everything sits under `Workspace.DreamBuilders`, in 37 district folders: Downtown, Homes, PalmIsland, CargoPort, Metro, Airport, Maldives, Transit, Businesses, JobStations, …
  - 15 drivable vehicles sit at the Workspace root.
- **ServerScriptService:** 30 scripts, one per system. Money / jobs / build loop live in GameServer. The other scripts: Business, Property, Phone, PhoneApps, PhoneExtras, Travel, Transit, Cargo, Careers, Chef, Salon, Staff, Garage, Metro, Ship, Tower, Vehicle, etc.
- **StarterPlayerScripts:** 15 LocalScripts (Phone, Intro, VehicleDrive, CityMap, DreamUI, weather/venue FX, …).
- **ServerStorage**
  - `DB_Tools` modules: NpcKit, BusinessKit, BuildKit, CarRig.
  - Backups: car backups, house backups, shop backups, `Phase1Backups` (new).
- **Remotes (ReplicatedStorage):** ElevatorGo, ChooseJob, BusinessEvent, PhoneRequest, plus remotes the scripts create at runtime: PhoneApps, PhoneExtra, TaxiRequest, ScreenFade, PhoneNotify, DreamVehicles/VehicleRequest, the DreamUI pack, TeleportServer.
- Every script is mirrored in `roblox/src/` in this repo, extracted from the saved .rbxl.

### 2. Working systems to preserve (all tested in Play earlier)
- **Getting started and getting around**
  - Intro + job picker
  - 15 drivable cars (E to drive, brake on exit, ownership)
  - Metro ride inside the train
  - Tower elevator
  - Ship interior
- **Jobs (9)**
  - Construction Worker / Architect build loop
  - Chef
  - Car Dealer
  - Real Estate Agent
  - Fashion Designer
  - Hair Stylist
  - Delivery (AI courier)
  - Cargo import/export
- **Property and businesses**
  - Businesses: rent, type, filtered brand, AI customers, up to 3 AI staff with wages, price tiers, decor
  - Property: buy villa, owner sign, locked doors, garages + driveways, park your car
- **Phone (13 apps):** Bank, Maps (fast travel + road-driving taxi), Jobs, Property, Business, Dreamgram, Messages, Dream Eats, Supplies, Assistant, Settings
- **City life:** bus loop, 4 traffic cars, 6 pedestrians
- **Travel:** airport + flights to the Maldives resort
- **Atmosphere:** weather + day/night lighting presets

### 3. Ten most serious issues found
| # | Issue | Status |
|---|---|---|
| 1 | **Beach Club building stood on the only road to the island bridge.** Cars stopped dead at x=635 (found by a real drive test). | **FIXED + tested** |
| 2 | **Sidewalks ran across the streets at junctions** (0.7-stud curbs in the road, 215 hits). The avenue median blocked cross traffic. | **FIXED + tested** |
| 3 | **Grass / sand / water terrain grew over roads** (up to +2.7 studs, 77 hits). | **FIXED** (re-scan clean on asphalt) |
| 4 | **Streets ran straight through buildings:** z=±150 through two Show Villas, two building plots and the beach. Plot pads overhung the road. | **FIXED**: streets now end at the avenues; pads trimmed |
| 5 | **579 road/runway/parking markings were solid parts** on the asphalt (small bumps). | **FIXED**: now non-solid, non-queryable |
| 6 | **Map edge was a void.** Cars could drive off the world (the airport test car fell to y = -128). | **FIXED**: outer ground on N/W/S, sea floor E, invisible world-edge walls at ±2100 |
| 7 | **Airport road went through the north-west dunes.** | **FIXED**: rerouted via a clear corridor at x=650; taxi route map updated; drive-tested |
| 8 | **"Asset content representation is being generated"** comes from the TextureIDs of AI-generated meshes: 15 cars (+ their backups), 27 beach lounge sets, the metro car. Roblox hasn't finished processing those textures, so they don't load. This is not a code bug. | **BLOCKED**: needs the asset owner to re-check / re-upload them on the Creator Dashboard, or replace the models (car realism needs new models anyway) |
| 9 | **No shared PlayerData/Economy service.** Money is changed directly by ~12 scripts (all server-side, validated, rate-limited), but there's no single owner and no transaction log. | Planned (Phase 8 refactor, incremental) |
| 10 | **DataStore saving can't be tested** until the place is published (owner's/Dad's decision). | BLOCKED |

Other weaknesses seen:
- Repeated skyline towers (4,116 facade parts), and most towers have no interior.
- Cars look toy-like.
- Not started from this brief: school, apartments/penthouses, missions/organisations, avatar + inventory, hospital/police/teacher jobs.
- The metro has no animated doors.

### 4. Recommended architecture (incremental, nothing moved blindly)
1. Add `ServerScriptService/Server/Services/EconomyService` (module). Each money change goes through it, with a reason, a log and rate limits. Migrate scripts one at a time.
2. Add `PlayerDataService`: one DataStore session per player, with schema versioning and a migration that keeps the existing `DreamProperty_v1` / `DreamBusiness_v1` keys.
3. Keep feature scripts, but have them depend on services instead of each other's BindableFunctions.
4. Collision classes for new content: RoadSurface (solid, queryable), Decoration (non-solid), CharacterSolid, VehicleSolid. The scan script in this session becomes a reusable QA check.

---

## Completed (this session)
- [x] Full project audit (above)
- [x] Traced the "being generated" warnings to their exact assets
- [x] Road obstruction fixes #1–#7 above, all with backups in `ServerStorage.Phase1Backups` (Roads, Sidewalks, Lake, Beach, PalmBeach, HQ, Yard, BeachClub, OldAirportRoad, IslandRamp)
- [x] Wedge ramps where 22 driveways meet the road
- [x] Gap between the island ramp and the boulevard filled
- [x] Grass-inside-buildings scan: 0 floors affected

## Tests performed
- **Test:** road obstruction scan (raycasts every ~6 studs over all 21 road surfaces, ~7,800 samples)
  - **Result:** before, 22 kinds of obstruction. After, only intentional ramps and slopes remain.
- **Test:** real drive, street z=-450 → junction → beach → bridge → ramp → Palm Island boulevard
  - **Result:** PASS (reached x 1824). Before the fix it stopped at x 635.
- **Test:** real drive, avenue x=390 north through 6 junctions
  - **Result:** PASS
- **Test:** real drive, street z=-450 east across the x=0 median
  - **Result:** PASS
- **Test:** real drive, new airport road north + west
  - **Result:** PASS
  - **Note:** the overshoot past the road end exposed the void. Now fixed, with an end barrier and outer ground.
- **Test:** taxi Spawn → Airport over the new road
  - **Result:** PASS ($13, ~23 s)
  - **Client errors:** 0
- **Evidence:** tool outputs in this session; `FEATURE_STATUS.md` keeps the per-feature list.

## Blocked
- [ ] AI-mesh textures stuck "being generated". Needs the asset owner's Creator Dashboard, or replacement models.
- [ ] Persistence tests. Need the place published.
- [ ] Multiplayer tests (2+ players). Need a published test server or a Studio multi-client test run by the owner.

## Risks and follow-up
- **Risk:** players parked cars along the old z=474 street, which was lowered by 0.6. Parked cars may sit 0.6 high until they're driven once.
  - **Next action:** re-seat the parked cars.
- **Risk:** the Beach Club moved 76 studs north, and 7 nearby props (lamps / lounge sets / palms) were pushed out of its footprint.
  - **Next action:** a visual check of the beach layout.

## Next session starting point
- **Exact next task (Phase 1 → 2):**
  1. Re-seat the parked cars.
  2. Do the visual pass on the Palm Beach layout.
  3. Add EconomyService (module) and migrate one script (PhoneServer transfers) as the pilot.
  4. Start Phase 2: crosswalk markings + traffic lights at downtown junctions; give the roads a consistent kerb design.
