# Dream Builders – status log (honest: "tested" = run in Roblox Studio Play)

## Stage 1 – stabilise (6 Nov)
| Issue | Cause found | Fix | Tested |
|---|---|---|---|
| Cars roll by themselves | parked cars were unanchored physics; owner's PC also sends a ghost throttle of 0.24 | parked cars anchored until someone sits (`VehicleOwnership`); throttle dead-zone 0.3, steer 0.15 | yes – 1.5 s idle, 0.00 studs |
| Steering didn't work | hinge/servo rig fought itself (target -32°, wheel at +28°) | replaced with arcade controller on the driver's client (`VehicleDrive`), wheels are visual Motor6Ds | yes – sedan: 0→54 in 1.4 s, D turns right 53° in 0.6 s, brake, reverse, stops when released |
| Drift | – | hold Shift: low side grip, faster turning | logic only (Shift can't be pressed from the test harness) |
| Head through hypercar roof | Roblox avatars are big vs. real-scale cars | every vehicle +30 %, seat lowered | yes – hypercar head 5.74 < roof 6.03; sedan 6.06 < 8.38 |
| SUV / car jitter | idle unanchored cars sliding (BigSUV 2.2 studs/s idle) | anchored when parked | yes |
| Map flicker | 121 pairs of map parts at exactly the same height (z-fighting) | smaller part raised 0.02 | scan re-run: fixed 121 |
| Pool: stood on water | pool was a flat 5 cm glass mesh on the deck | raised pool with stone coping, steps, lights and real terrain water (sunken pool comes with the Blender mansion rebuild) | yes – character state "Swimming" |
| Head-on obstacle | some parked spots sit on props/curbs | – | known: forklift wheels too small for curbs |

Known / not done: excavator not drivable; motorbikes + bicycle not built; car looks (Stage 2: artist models for main cars, AI+texture for extras); no engine sounds yet.

## Extra (6 Nov): hologram build effect
Owner's reel (Ropilot "Astra 6" demo) – buildings materialising with a holo scan. Rebuilt ourselves: `BuildFX` LocalScript + GameServer tags each plot-house piece. Tested in Play on the mansion (ring sweeps, pieces fade in).
Reels reviewed: Claude-context tips, Opus x Roblox Studio workflow, Roblox shop decoy pricing (for later, Dad approves Robux), skill directory.
- Steering v2: real turning circle from wheelbase, no sideways slide (tested 5 deg slip), calmer drift; parked-car headlights no longer blown-out neon blobs.

## Stage 3 start (6 Nov): bigger city
- Backup first: `Downloads\DreamBuilders_backup_6Nov_before_bigger_map.rbxl`.
- Whole `workspace.DreamBuilders` scaled x1.5 about the origin (7,988 parts, 232 light ranges); 1700-stud ground split into 4 tiles (2048 limit); sea + mansion pool terrain water cleared and refilled at the new size.
- City map window widened to -1000..1250 x -1150..1150 (now includes Palm Hills + Downtown); drawn map scaled to match.
- Cars re-parked in a showroom row 58 studs in front of the spawn (spawn now 0,1.5,504).
- Tested in Play: spawn OK, server + UI scripts start, MapData has 22 plots, mansion pool = Swimming.
- Next: fill the new space (beach club + beach workspace, cargo port, downtown towers with glass curtain walls), better palms/landscaping.
- Car textures (6 Nov): Roblox Studio's built-in AI `generate_texture` (Quality) run on every car's Body_Paint with its Codex picture as the hint + a text prompt (no logos/text). All 13 drivable vehicles now have SurfaceAppearance paint (grilles, seams, chrome, rust on the starter car, pallets on the flatbed). Old glass/headlight zones toned to dark tint so they don't fight the texture. Backups of every car before texturing: ServerStorage.CarBackups.
- Owner idea logged: metro station (with airport + port in Stage 3/5).
- Sketchfab route dropped: site needs an account the owner can't make (age rule) – not working around it.
- **Cars v3 (6 Nov): Roblox's own AI mesh generator** (`generate_mesh`, explicit parts body/windows/4 wheels/lights, max 20k tris, original designs, prompts say no logos/text/plates). All 13 drivable vehicles regenerated and rigged with `ServerStorage.DB_Tools.CarRig` (src/CarRig.module.lua: geometric front/back detection because generator wheel labels are unreliable; `FlipFront` attribute override). Old AI cars kept in ServerStorage.CarBackups.
  Tested in Play: hypercar 0→89 in 1.5 s + steering; pickup forward/steer/stop; seated in pickup, mixer, flatbed, forklift, muscle, big SUV.
  Known: excavator still the old AI blob (static); luxury sedan texture is plain silver; bikes not built.

## City glow-up while the owner was out (6 Nov evening) – all in Studio, NOT saved yet (owner presses Ctrl+S)
- **Glass towers:** 6 new Downtown towers (`Downtown.Facades`) with glass curtain walls: tinted reflective glass, mullions every ~6 studs, spandrel bands, floor slabs, lit ceiling strips, crown + lobby canopy. 29 older Skyline/HQ towers got the same glass skin (`SkylineFacades`). Interiors (offices, trading floor) still to do.
- **Real palms:** blocky palms replaced with a generated palm mesh (487 palms, invisible trunk colliders), oversized ones capped at 32–40 studs.
- **Cargo port** (`CargoPort`, quay around 750,-980): 238 containers, 3 Dream Logistics warehouses, gate + "DREAM PORT · CARGO TERMINAL" sign, 3 gantry cranes, a 210-stud cargo ship docked. Decoration only so far (no delivery jobs yet).
- **Palm beach** (`PalmBeach`): sand strip x 660–783, palm promenade with lamps, **Sahil Beach Club** restaurant (deck, pavilion, bar, tables, sittable chairs), **Beach Workspace** cabanas (desks, laptops, seats), 27 sun-lounger sets.
- Cars scaled another 1.2x (wider/bigger, attribute `Big12`).
- **Dream Metro** (`Metro`): 1,270-stud elevated viaduct along z 735 (pillars on the sidewalk, moved off cross-roads), 3 stations – Park (x -570), Downtown (x 40, stairs onto the Downtown Plaza), Beach (x 520) – each with marble platforms, yellow edge lines, glass screen-door walls, benches, white roof with gold trim + lighting, stair tower, "DREAM METRO · NAME" sign. Train = 2 generated driverless cars (white/silver, gold stripe) that run Park ⇄ Downtown ⇄ Beach with 10 s stops (`MetroTrainRunner`). Ticket gate prompt "Ride to …" takes you to the next station (`MetroServer`).
  Tested in Play: train moved -570 → 40 and stopped at the Downtown platform; holding the Downtown gate prompt moved the player to the Beach station exit (x 475). Players can't ride *inside* the moving train yet (it's a fast-travel gate for now).
- Scripts copied into the repo: `src/VehicleDrive.client.lua` (full v2), `src/MetroServer.server.lua`, `src/MetroTrainRunner.server.lua`.
- **Dream Realty Tower (Tower4, x 300) – first real interior:** solid core removed (backup `ServerStorage.DB_Tools.CoreBackups`), door opening cut into the glass, automatic sliding glass lobby doors. Inside: marble lobby with reception, "DREAM REALTY" wall sign, sofas you can sit on, planters, floor directory. Floor 1 Dream Realty sales office (desks + monitors + chairs, glass meeting room with TV, listings wall, manager desk). Floor 2 Dream Exchange trading floor (20 desks with 3 screens each, DREAM EXCHANGE ticker wall). Floors 3–13 open-plan offices. Plaster ceilings with light strips (old blinding neon ceiling removed). Elevator on every floor: prompt opens a floor-picker menu, server checks you're at the elevator before moving you (`TowerServer`, `ElevatorUI`).
  Tested in Play: doors slid open (296 → 288.5) when the player walked up; elevator prompt opened the picker with all 14 floors; picked 2 → arrived y 29.5 (trading floor), picked 13 → y 172.5. Note: like every Roblox prompt it only shows when the elevator is on screen.
  Other 5 glass towers are still solid inside (next).

## Vehicles fix + new vehicles (6 Nov night)
- **Found a real bug:** after the 1.2x car scale-up the showroom row sat half on the curb/sidewalk and some cars had been lifted onto palm-tree tops by a bad ground check (ray hit palm leaves). In Play most cars wouldn't move (0.7 studs in 2 s). Fix: all vehicles re-parked parallel on the road in front of the spawn (z 472, facing +X, 20-stud gaps), grounded by their wheel colliders with a ray that ignores non-collidable parts; cars that landed over a sidewalk/median were moved (Hypercar, StarterCar, BigSUV now at x 458–550).
  Tested in Play, all 15 vehicles one after the other (throttle + steer 1.2 s): every one drives off its spot (12–25 studs, 0 idle creep, all stay upright). Excavator only did 5 studs in that run (it reached its 16 top speed in an earlier run) – check by hand.
- **New excavator** (Roblox generator: tracks, body, cab, windows, boom, bucket) replaces the old AI blob; drivable (slow, seat in the cab). Old one in `ServerStorage.CarBackups`.
- **New SportBike** (red/black sport motorbike): rigged with 4 hidden stabiliser wheels so it can't tip; real front tyre steers and both tyres spin; seat on the saddle. Tested: 0→96 in 2 s on open road, turns.
- **Sounds (6 Nov night):** every vehicle has an engine loop (Roblox Resources "Car-Engine-Loop"; diesel loop for trucks, pickup, big SUV, forklift, excavator) whose pitch and volume follow speed, plus a tyre-skid sound when the car slides sideways (drift). Everyone nearby hears occupied cars. Background music playlist of 5 free Creator Store tracks (OUD SUNSET, Nice Day, Holiday, Networking, Solar Wind). Settings toggles MUSIC and SOUND EFFECTS work with them.
  Tested in Play: engine, diesel, skid and music all load; engine pitch rose 0.86 → 1.26 while accelerating; skid volume reached 0.8 during a Shift-drift (37 studs/s side slip); music playing.

## Owner test feedback round (6 Nov 22:00) – fixes
- **Press E to drive:** every vehicle has a "Drive <name>" prompt (E). Hidden while someone drives it. Tested: prompt seated the player in the Big SUV.
- **Car stops by itself when you get out:** server takes the car back and brakes it (70 studs/s²), then parks/anchors it. Tested: got out at 69 → stopped in 1.0 s, anchored, prompt back.
- **Car size/proportions:** cars were ~2x too big and too stubby (sedan 28 x 18 x 11 studs next to a 5-stud avatar). Every vehicle re-shaped to real-world ratios (sedans ~18.5 L x 7.6 W x 5.4 H, SUVs 19.5 x 8.2 x 7.4, trucks 28–31 long), wheels kept round, welds/motors rebuilt, seats lowered. Backup of the old big cars: `ServerStorage.CarBackups_BeforeResize`. Re-parked along the curb (z 460) in front of spawn.
  Tested in Play: all 15 drive off their spot; seated head below the roof in every car (e.g. hypercar head 2.4 / roof 3.0 above chassis); screenshot with the avatar standing next to the GT sedan looks right.
- **Metro you can ride inside:** each train car has an interior (36 blue bench seats, poles, handrails, ceiling light, window band, doors, route display "NOW AT / NEXT STOP"). Street gate (hold E) → takes you up to the platform; green "EXIT ⇧ STREET" sign on each platform → back down. When the train is docked (14 s per station) a "Board train" prompt appears at its doors and seats you inside; you ride along with it. Get up (Space) → you're put on the platform of the station you're at.
  Tested in Play: gate → platform; boarded at Park, rode to Downtown seated; boarded at Beach, rode to Downtown; got up → on the Downtown platform, train seat stayed in place. (Bug found + fixed during the test: getting up too early dragged the seat out of the train.)
- **Houses = our mansion design:** the 24 blocky houses in Palm Hills (17) and Show Villas (7) are gone (backup `ServerStorage.HouseBackups`). 20 lots now have copies of the Blender mansion (60 % size so it fits the lot, real 2-floor interior: living room, kitchen, bedroom, bathroom, study, garage, terrace pool with water) in 4 colour versions – Classic, Sand, Charcoal, Pearl – all facing their street. Doors open with E (existing door script). 4 lots left empty with a "LOT FOR SALE · Dream Realty" sign (`ForSaleLots`). The 16 build plots stay as they were.
  Tested in Play: walked from the street through the front door into a villa. 45 palms that stood inside the new houses were removed.
- Removed the fake block cars (168 parts) and block trucks (16) parked around the city (backup in `HouseBackups`).
- **Cargo port moved to its own industrial area:** the whole port (quay, 238 containers, warehouses, cranes, ship) moved 560 studs south, away from Palm Hills, onto new port land (x 340–860, z -1780..-1260) with new sea around it. Its own access road: Palm Hills street extended east, then a 400-stud causeway road (with railings) over the water down to the port gate. Old port spot is open sea again. Backup: `ServerStorage.PortBackup`.
- **Cargo ship has an inside:** green "BOARD SHIP" sign + gangway on the quay → crew deck (bunks, galley with stove/fridge, mess table with 6 seats, sofa, TV, portholes) → "▲ BRIDGE" → captain's bridge (wide windows, consoles with screens, radar, ship's wheel, 2 captain chairs, chart table) → "▼ CREW DECK", "GANGWAY ▸ QUAY" back ashore. While you're inside, the ship's outer mesh is hidden on your screen so it doesn't poke through the walls (`ShipInteriorView`).
  Tested in Play: board → crew deck (y 83), bridge (y 95), back to crew, ashore (quay). Bug found + fixed: if you were sitting on a seat, the teleport dragged the seat along – now you stand up first.
- **Palm Island (new district, map is bigger):** a 790-stud round island in the sea east of the beach (centre 1580, -450) with sand beach ring, 100+ palms and a 500-stud bridge road (railings + street lamps) from the end of the z -450 avenue. "WELCOME TO PALM ISLAND" gantry, palm boulevard with sidewalks, 4 more mansion villas (Pearl, Sand, Charcoal, Classic). Venues with real interiors and sittable seats:
  - **Club Mirage** – nightclub: light-up dance floor that changes colour, DJ booth with turntables + LED wall, speakers, moving coloured spotlights, mocktail bar with stools, 3 VIP booths, red carpet + rope outside, its own dance music inside (background music fades out).
  - **Sahara Grill** – restaurant: 6 tables x 4 chairs with candles, open kitchen with grill fire, oven, fridge, menu board, chandeliers.
  - **Dream Diner** – 50s diner: checkered floor, red booths, counter with stools, milkshake machine, griddle, jukebox, menu, its own music.
  - **Pearl Sushi** – sushi bar with conveyor counter, chef counter, low tables, lanterns.
  - **Palm Café** – coffee counter, pastry case, café tables, sofa.
  Tested in Play: drove the hypercar from the city over the bridge onto the island and down the boulevard at full speed (x 770 → 1773); walked into Club Mirage → club music playing, background music muted; dance floor + LED wall animating (screenshot).
  `ServerStorage.DB_Tools.BuildKit` = helper module for building more venues the same way.
- Note on "roads too small": that came from the cars being 2x too big; with real-size cars the 42-stud roads now fit 4–5 cars side by side.

## Blender models (7 Nov, built live in the owner's Blender, imported by Claude via Import 3D)
- `Downloads\DreamBuilders_models\metro\MetroStation.blend/.fbx` – platform level: curved glass roof on 16 steel arches, purlins, Y-columns, marble platforms with yellow safety line, glass platform screen doors with LED header, wooden benches, hanging info screens, roof light strips, escalator glass box. Placed on all 3 stations (`Station_*/NewStation`); old block roof/columns/benches removed, old platforms + screen-door walls kept as invisible collision.
- `MetroEntrance.fbx` – street pavilion: glass walls, floating roof with gold edge + LED, lit "M" totem, ticket machines, turnstiles, 2 escalators + stairs, benches. Placed in front of each station's stair tower facing the street; the ticket gate prompt now sits at the turnstiles.
- `city\DreamTower.fbx` – 349-stud twisting landmark skyscraper (44 floors, lit floor lines, steel fins, gold crown, spire) behind Downtown at (-400, 980).
- Templates kept in `ServerStorage.DB_Tools.MetroStation/MetroEntrance`.
  Tested in Play: walked from the street into the Downtown pavilion to the turnstiles → "Enter platform" → on the new platform (y 38.6). Screenshots: platform under the glass roof with the train, pavilion on the street, tower in the skyline.
- **Intro + job choice (7 Nov):** when you join, cinematic fly-over (DREAM BUILDERS → Downtown → Dream Metro → Palm Island → Palm Hills, title cards, black bars, Skip button), then "WHAT DO YOU WANT TO BE?" with 9 jobs: Construction Worker, Architect, Real Estate Agent, Car Dealer, Chef, Hair Stylist, Fashion Designer, Delivery Driver, Business Owner. Server checks the choice (`JobChoice`), HUD updates (GameServer now listens to the Job attribute; hint per job). Tested in Play: fly-over runs, picker shows, choosing Hair Stylist → HUD "JOB: HAIR STYLIST / Downtown shops: salon chairs". Only Construction Worker + Architect have real gameplay so far – the other 7 jobs need their features next.
