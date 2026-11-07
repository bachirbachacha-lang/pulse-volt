# Development Status – Dream Builders
Updated 7 Nov 2026 (22:xx Riyadh), by Claude, following the "Ultimate Roblox Game Overhaul" brief.

## Current phase
Phase 1 complete. Phases 6 and 8 started: metro doors, traffic signals, missions, school.

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


## Session 2 (7 Nov, 22:05–23:00): what changed
**Backup and assets**
- [x] Backup copy saved to the PC: `Downloads/DreamBuilders_backup_7Nov_after_phase1.rbxl`
- [x] **Model warnings re-investigated.**
  - All 117 MeshPart textures load: PreloadAsync = Success in Edit and on the client.
  - The 57 "Asset content representation is being generated" lines are logged once per AI-generated texture when a session starts. Roblox serves the original texture while it builds optimised versions. They're warnings, not failures.
  - The only 2 real failures are Roblox's default avatar face textures (player and NPC heads). That's on Roblox's side.
  - **Status: TESTED, harmless.** To remove the warnings, replace those models.

**Metro doors: COMPLETE (tested)**
- MetroDoors script + glass platform screen doors (48 leaves on 3 stations).
- When the train docks, the train doors slide 3.4 studs and the platform doors 2.2 studs, with a chime. Both close 2.5 s before departure.
- Doors stop blocking while open.

**Traffic signals + crosswalks: COMPLETE (tested)**
- 16 junctions, 64 signal poles, zebra crossings and stop lines (paint only, non-solid).
- SignalServer runs one city cycle: NS green 14 s → amber 3 s → all-red 1.5 s → EW.
- The AI traffic and the bus stop at red. In a 45 s test, each car still covered ~1,200 studs with waits.

**Missions / organisation: COMPLETE for v1 (single-player tested)**
- Dream Agency (fictional) board in the downtown plaza.
- 4 story missions:
  - VIP escort, airport → Dream Realty
  - Lost briefcase (marina)
  - Gala crates, Supply Yard → Club Mirage
  - City photo tour
- Everyone at the board joins the team, and any member can complete a step.
- Rewards each; reputation ranks Rookie → Agent → Senior Agent → Director; 15-minute time limit.
- Tested: VIP mission → +$260, rep 1.
- Multiplayer team play is untested (needs 2 players).

**School: TESTED — NEEDS POLISH**
- Dream City Academy on the new ground north of downtown, by the airport road.
- Rooms: reception (timetable + bell), maths room, computer room, science lab, library, cafeteria, staff office, lockers corridor, gym and sports field.
- Bell timetable: lesson 120 s / break 30 s.
- People: 1 AI teacher + 5 AI students, kept small on purpose.
- For players:
  - Maths quiz on the board (3 answer prompts): +$10 and +1 Grade.
  - Attendance pay ($5 / 30 s) for sitting in class.
  - New **Teacher job**: teach the lesson at the desk, +$45.
- Tested: 5 students seated, teach +$45, correct answer +$10, grade 1.
- Fixed: 36 classroom seats faced away from the board.
- Polish left: only the maths room runs lessons; no NPCs in other rooms.

**Jobs / phone**
- Teacher added to JobChoice, Phone › Jobs and the HUD hints.
- Maps destinations added: "School (Academy)" and "Dream Agency (Missions)". The taxi road map knows the school.

## Still not started (from the overhaul brief)
- Apartments and penthouses (Part 16)
- Hospital / doctor and police jobs
- Avatar editor, inventory, saved outfits (Part 18)
- Hotel
- Supermarket, electronics and furniture stores
- Yacht boarding / boat driving
- Downtown building interiors and facade variety
- Audio pass (city ambience per district)
- UI navigation rebuild
- EconomyService / PlayerDataService refactor

## Next session starting point
- **Exact next task:**
  1. Apartments + penthouse in one downtown tower (concierge, buy/rent, owner-only door, furnished penthouse with skyline view).
  2. Then hospital + doctor job.
  3. Then the EconomyService pilot.


## Session 3 (7 Nov, 22:23–23:30): what changed
**Dream Residences (Tower 3): COMPLETE (tested)**
- Hollowed the tower; the solid core block is backed up in ServerStorage.Phase1Backups.
- Lobby with concierge desk, sofas, chandelier and mailboxes.
- 14 furnished apartments: living room facing the skyline, kitchen, dining, bedroom, shower.
- Standard units are floors 1–3 ($8,000); Premium units are floors 4–7 ($15,000).
- Double-height penthouse ($80,000): sectional, piano, kitchen island, dining for 8, mezzanine master suite, bathtub.
- Roof terrace: pool, loungers, hot tub, glass rails.
- The elevator reuses TowerServer, with 10 stops (LOBBY, 1–7, PENTHOUSE, ROOF).
- The door opens for the owner and the owner's Roblox friends; sell back at 80%.
- Saving uses DataStore DreamResidence_v1 (untestable until published).
- Tested: elevator to the penthouse → buy → $80,000 taken → door opens for the owner.

**Taxi Driver job: COMPLETE (tested)**
- An AI passenger waves you down at one of 10 kerbside spots. Pull up next to them, drive to the destination, and get paid by distance, plus a fast-ride tip.
- Tested: pickup + drop-off, +$66.

**Dream City Hospital + Doctor job: COMPLETE (tested)**
- Building: reception, waiting room, pharmacy, 4 treatment bays (beds, monitors, curtains), ambulance bay, roof helipad.
- Up to 3 AI patients with symptoms. The Doctor calls the next patient to a bay and treats them (+$35 plus tips).
- Free check-up for everyone (heals to full).
- Tested: patient arrived in 25 s, treated in Bay 1, +$35.

**Dream Grand Hotel (Tower 1) + Hotel Receptionist job: COMPLETE (tested)**
- Hollowed the tower: hotel lobby + 14 rooms (re-using the tested apartment layout).
- Book a room ($150, 30 min, F key); the door opens for the guest and their friends.
- Receptionist job: check in AI guests (+$30).
- Tested: check-in +$30, booking -$150 (room 101), elevator to the floor, door opens.
- Fixed: the booking prompt and the guest prompt clashed on the E key.

**Jobs:** 13 now. The intro picker now scrolls and lists Teacher, Doctor, Taxi Driver and Hotel Receptionist. They're also in Phone › Jobs and the HUD hints.

**Maps:** added Dream Residences, Hospital and Dream Grand Hotel.

## Still not started (honest)
- Avatar editor, inventory, saved outfits
- Yacht boarding and boat driving
- Supermarket, electronics and furniture stores
- Police (safe "city patrol" version)
- Audio pass per district
- UI navigation rebuild
- EconomyService / PlayerDataService refactor
- Interiors for the remaining downtown towers (2, 5, 6)


## Session 4 (7 Nov, 22:37–23:10): what changed
**Yachts: COMPLETE (tested)**
- The 7 block yachts are replaced by real motor yachts. Old ones are backed up in Phase1Backups/OldYachts.
- Each yacht has a tapered bow, navy stripe, teak deck, cabin with window band, flybridge, radar arch, rails, aft sofa, swim platform, name on the transom and underwater lights.
- **Driving:** "Board yacht" from the pier side, then sit at the Helm (VehicleSeat; W/S throttle, A/D steer). The server moves the yacht and stops it before land, piers or boats. "Go ashore" from the swim platform.
- Tested: moved 14 studs, then auto-stopped before a pier. Reverse + 150° turn + cruise of 327 studs, driver still seated.

**Dream Mart + Inventory: COMPLETE (tested)**
- Store on the north ground, with a path to the airport road. Sections: Grocery, Tech, Style.
- 16 products on shelves with price tags; checkouts. Prices come from the server's own catalogue.
- Food and drinks go to the backpack (health / speed). Holdables: flowers, camera.
- Wearables (headphones, watch, sunglasses, gold chain, cap, designer bag) and collectibles go to **Phone › Inventory**: tap to wear, and they come back after respawn.
- Saved with DreamInventory_v1 (needs publishing).
- Tested: $71 spent; sandwich in the backpack; sunglasses + cap in the inventory and worn.

**District audio: COMPLETE (tested)**
- AmbienceFX crossfades by district: Downtown traffic, beach/island/marina/Maldives waves, port harbor, Palm Hills/school/hospital birds.
- Yacht wash plays while driving a yacht.
- Sounds: licensed Roblox Pro Sound Effects + one free waves track. All 5 checked with PreloadAsync = Success.
- Tested: spawn → city 0.12; Palm Beach → waves 0.35.

**Style app (avatar colours + 3 saved outfits): COMPLETE (tested)**
- Shirt, trousers and skin palettes, validated on the server.
- Applying removes the player's Roblox clothing in this game only. "Back to my Roblox avatar" resets it.
- Saved with DreamOutfits_v1.

**City Patrol Officer job (non-violent): COMPLETE (tested)**
- Calls every ~25 s: lost tourist, broken-down car, lost pet, noise complaint, parking trouble.
- Blue marker; help prompt pays $40–55. Patrol cap while on duty.
- Tested: lost-dog call +$50.

**Jobs:** 14 (intro picker, Phone › Jobs, HUD hints).

**Phone:** 13 apps (+Inventory, +Style).

**Maps:** + Dream Mart.

**Output:** 0 server errors and 0 client errors in the last Play test.

## Still not started (honest)
- EconomyService / PlayerDataService refactor (internal)
- Main-menu navigation rebuild (the brief's Avatar/Vehicles/Properties/… bar)
- Interiors for downtown towers 2, 5 and 6
- Furniture placement in owned homes

## (previous) Next session starting point
- **Exact next task (Phase 1 → 2):**
  1. Re-seat the parked cars.
  2. Do the visual pass on the Palm Beach layout.
  3. Add EconomyService (module) and migrate one script (PhoneServer transfers) as the pilot.
  4. Start Phase 2: crosswalk markings + traffic lights at downtown junctions; give the roads a consistent kerb design.

## Session 5 (7–8 Nov): fixes from the owner's playtest
Saved in DreamBuilders.rbxl (Ctrl+S done). Every item below marked **tested** was checked in Studio Play mode.

| Owner's complaint | What was done | Status |
|---|---|---|
| Signs unreadable | All 240+ wall signs switched from stretched 800×600 to pixels-per-stud. Big signs use fewer pixels per stud so the text can be large (Roblox caps scaled text at 100 px). HUD uses a bold font now. | COMPLETE (checked on screenshots) |
| Grass everywhere / grass inside houses | Grass under 49 buildings changed to plain ground; grass blades shorter | COMPLETE |
| 4 palms flying | 449 of 559 palms re-seated on the ground; spot-checked 10 areas (gap ≤0.6 studs) | COMPLETE |
| Signs/stairs blocking you | 250 furniture meshes + 1,607 thin poles, lamps, sign boards and screens are now walk-through | IMPLEMENTED — owner should re-check in play |
| Metro stairs (again) | Real walkable stairs (35 steps, glass rails, landing to the bridge) at all 3 stations. "Take escalator up" still works too. | COMPLETE (tested: walked up at Downtown, Beach and Park in 4.5 s each) |
| Car wheels don't spin | Your own car already spun. Other players' cars, traffic cars and taxis didn't. New WheelSpinFX spins them on every screen. | COMPLETE (tested: 4 traffic cars + own car) |
| Garages blocked | Garage doors roll up by themselves when the owner (or a friend they allow) comes within 34 studs, and close when they leave. Strangers still see a closed door. | COMPLETE (tested with an owned villa) |
| Big building has no door / towers empty | Towers 2, 5 and 6 now have real lobbies with sliding auto-doors: **Dream Bank** (2 tellers, 2 ATMs, sofas), **Sky Tower** (host, city model, lift to a new Sky Deck at 275 studs with telescopes and lounge), **Dream Café & Gym** (barista sells Karak/Latte/Juice). The floors above the lobbies are still solid. | COMPLETE for lobbies (tested walking in, lift up/down, buying a Latte −$5) |
| Hospital, school and mart "built behind", names unreadable | New North District front: sidewalk, plaza, lawns, hedges, palms, street lamps, a parking lot linking the road to each front door, 4 big double-sided monument signs at the road, big roof signs | COMPLETE (checked on screenshots) |
| No NPCs | CityLifeServer adds 55 AI people: office workers in Tower 4, guests at the beach club, Sky Deck, café and bank, people waiting on metro platforms, friends chatting on the plaza, 4 slow strollers. Server stays at 60 fps. | COMPLETE (tested) |
| Phone app tiny | Phone scale raised (minimum 0.95, max 1.6) | IMPLEMENTED — not re-checked on a small screen |
| Modern houses, different designs | **Marina Row**: 6 new waterfront houses, each a different design (Cube, Timber, Butterfly roof, 3-storey Tower with roof terrace, L-shaped Courtyard, Glass Box). Each has furnished rooms, walkable stairs to every floor, a pool deck, an owner-only garage and front doors. Buyable in Phone › Property for $45,000; added to Maps/taxi. Built from parts in Studio (ModernHouseKit + MarinaRowBuilder), **not in Blender**, because the Blender link is still off. | COMPLETE (tested: walked in and up the stairs in all 6; Tower reached floors 2, 3 and the roof; all 6 listed at $45,000) |

**Still not started (honest)**
- Blender-made house models (the Blender link is off; Marina Row was built in Studio instead)
- Upper floors of towers 2, 5 and 6 (only the lobbies are done)
- NPC hair/accessories (they're plain blocky avatars)
- EconomyService / PlayerDataService refactor
- Main-menu navigation bar from the brief
- Furniture placement in owned homes

## Session 6 (8 Nov, 02:15–03:00): Phase A, stabilise before city work
Workflow change (owner's master prompt pack, 8 Nov): **Claude is the only agent that edits, saves or Play-tests the place. Codex is the read-only auditor and reviewer.** Codex's audit pack is in `audit/phase1_codex/`. Full results, with numbers, are in `PHASE_A_RESULTS.md`.

| Item | Status |
|---|---|
| Fresh backup `Downloads\DreamBuilders_backup_8Nov_before_phaseA.rbxl`, byte-identical to the saved place, parses cleanly | **COMPLETE** (opening it in Studio not tested) |
| Phone:342 nil-Text error: LobbyServer's Sky Deck lift sent ScreenFade with no caption. Now sends caption + 2.5 s and moves the player once the screen is black. | **COMPLETE (tested):** lift up and down, both flights, 0 game errors |
| "Asset content representation is being generated": all 20 IDs mapped to car MeshPart textures (owner's own uploads); 70 warned IDs preloaded = Success | **TESTED, harmless**; no change made |
| Smoke tests: spawn, money, property, business, car, metro | **PASS** (1 player) |
| Save/rejoin, 2-player tests | **BLOCKED / NOT TESTED** (publish needed; Studio multi-client run by the owner) |
| New bugs found: buried villa (PalmHills_1), shop sign back face, rent board text, Serve vs Hire staff key clash | Listed in FEATURE_STATUS "Known bugs". **Not fixed**; waiting for the owner's OK |

**Next session starting point**
1. Fix the 3 shop bugs in BusinessServer (one small batch, then test).
2. Free Villa_PalmHills_1_Classic from the dune (one part; backup first).
3. Then start the measured map/road audit Codex asked for (bounds, road endpoints, entrances) before any city rebuilding.
