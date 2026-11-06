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
