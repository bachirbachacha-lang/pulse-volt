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
