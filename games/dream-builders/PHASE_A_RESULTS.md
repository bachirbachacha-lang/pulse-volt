# Phase A results: stabilise before city work
8 Nov 2026, 02:15–03:00 Riyadh, by Claude. This follows Codex's `audit/phase1_codex/PHASE_A_CLAUDE_HANDOFF.md`.

"Tested" means run in Roblox Studio Play mode with one player, and the result was checked.

## 0. Checkpoint (backup)
| File | Size | SHA-256 (first 12) | Check |
|---|---|---|---|
| `Downloads\DreamBuilders_backup_8Nov_before_phaseA.rbxl` (new backup, made before any edit) | 4,591,091 bytes | `ac6fa0a9c872` | Byte-identical to the place as saved 8 Nov 01:06. Read back from the PC and parsed: 107 classes, 29,847 instances, every chunk decompresses, END chunk present. |
| `Downloads\DreamBuilders.rbxl` (saved after the fix, 02:45) | 4,591,173 bytes | `53ec36329584` | Same 107 classes / 29,847 instances. Script diff against the backup: **only LobbyServer lines 96–97 changed.** |
| `Downloads\DreamBuilders_backup_7Nov_after_phase1.rbxl` (older backup) | 4,523,491 bytes | `0ba234777277` | Also parses (106 classes / 23,704 instances). Older than Session 5's work. |

**Not tested:** restoring a backup by opening it in Studio. The check is structural only (the file reads cleanly from start to end).

## 1. Phone:342 "Unable to assign property Text" error: FIXED (tested)
**Cause (confirmed by reproducing it before the fix)**
- `LobbyServer` has a `ride` helper for the Sky Tower lift.
- It called `ScreenFade:FireClient(p)` with no caption.
- The Phone's fade listener puts the first value into `fadeT.Text`, so it got nil.
- Riding the lift before the fix gave: `Unable to assign property Text. string expected, got nil` at `Players.crrusher14.PlayerScripts.Phone`, **Line 342**.
- Line 342 is the `fadeT.Text = text` line in the current source (341 is the `Connect` line). So Codex's off-by-one worry (A2) is resolved: the report was right.
- Before the fix the player was still moved, but with no fade at all.

**Fix (1 line, LobbyServer)**
- The helper now sends `fade:FireClient(p, msg, 2.5)`, re-using the message the helper already had.
- It also waits 0.9 s instead of 0.4 s before moving the player. The fade takes 0.8 s to reach full black, so 0.4 s moved the player mid-fade.
- The Phone listener is unchanged. No nil fallback was added, so any future bad caller will still show up as an error.

| Test (Play) | Result |
|---|---|
| Sky Deck lift up, pressing E at the lobby lift | Caption "🌇 Sky Deck — the best view in Dream City". Screen fully black at 0.8 s. Player moved at ~1.0 s (y 3.6 → 278.6) while black. Fade gone at 2.5 s. **No error.** |
| Lift down, pressing E on the Sky Deck | Caption "Back in the Sky Tower lobby". Moved at ~1.0 s on a black screen. Walk speed 16, health 100 afterwards. **No error.** |
| Flight to the Maldives (TravelServer, the other ScreenFade caller) | $150 taken, caption "Dream Air flight DA 101…", 5 s fade, landed at the resort (−3090, 3200) |
| Flight home | Free, caption shown, landed at the airport (−500, 4, 1425) |
| Output at the end of the session | Server: 0 errors. Client: 0 errors from the game. The 4 client errors in the log came from my own test commands (`AssistantCommand`). |

**Does only the right player see the fade?** By code reading, yes: `FireClient(p, …)` goes to one player. **Not tested** with 2 players (needs a Studio multi-client run by the owner).

## 2. "Asset content representation is being generated": MAPPED, harmless, no change
- All 20 IDs in Codex's list are `MeshPart.TextureID` on 6 vehicles. Each has an identical copy in `ServerStorage.CarBackups_BeforeResize`, so each ID appears twice in the place file.
- They are all Image assets created by **crrusher14** on 6 Nov 2026 (the Roblox AI car textures). So there is no ownership or group-permission problem.
- In this session the warning appeared for **73 different IDs**, not just these 20. Every one was a vehicle `MeshPart.TextureID`. The set changes with whatever streams in as you move around.
- `ContentProvider:PreloadAsync` on the client returned **Success for all 70 warned IDs** it was given. The MuscleCar renders fully textured: `evidence/2026-11-08_phaseA/musclecar_textures_load.jpg`.
- **Conclusion:** the warning means Roblox is still building optimised copies, but the original texture loads. It is not a failure. Nothing was deleted or replaced. The warnings only go away if the cars get new models, which is already planned under "cars look".

| Asset ID | Used on (Workspace) | Copy |
|---|---|---|
| 120297790710646 | SportBike.Body_Extra | CarBackups_BeforeResize.SportBike.Body_Extra |
| 87280850929321 | SportBike.Body_Extra (2nd part) | same |
| 71574134994092 | SportBike.Body_Paint | same |
| 117669127356274 | SportBike.Wheel_F_real | same |
| 105103549408086 | GTSedan.LightsRear | same |
| 86941228705600 | MuscleCar.Body_Paint | same |
| 120254647632504 | MuscleCar.Body_Extra | same |
| 70623662960435 | MuscleCar.Wheel_FL_tyre | same |
| 85429891256510 | MuscleCar.Wheel_FR_tyre | same |
| 113212265508350 | MuscleCar.Wheel_RL_tyre | same |
| 73295704437215 | EverydaySedan.LightsRear | same |
| 85644396330526 | EverydaySedan.LightsFront | same |
| 79674054271053 | EverydaySedan.Wheel_FL_tyre | same |
| 132212171195549 | EverydaySedan.Wheel_FR_tyre | same |
| 138647585597549 | StarterCar.Body_Paint | same |
| 103944985279691 | StarterCar.Glass | same |
| 131014412874985 | StarterCar.Wheel_RL_tyre | same |
| 124580302578887 | OffroadSUV.Glass | same |
| 120010944895792 | OffroadSUV.Wheel_FR_tyre | same |
| 106547565728387 | OffroadSUV.Wheel_RR_tyre | same |

## 3. Smoke tests before city work (Play, 1 player)
| System | How it was tested | Result |
|---|---|---|
| Spawn + movement | Spawned at (4.5, 5, 505). Picked a job in the intro with real mouse clicks (Business Owner). Walk speed went 0 → 16. | **PASS** |
| Money | Every change matched: flight −150, villa −25,000, sell +20,000 (80%), shop rent −50, serve +15. Hiring staff was refused at $100 (costs $150). | **PASS** |
| Property | Used the phone's Property server request directly (the call the app makes, not taps on the phone screen). 30 listings. Bought Villa_PalmHills_1_Classic, then sold it for $20,000. Bought Villa_PalmHills_13_Charcoal: sign "crrusher14's Villa", "My Home" first in Maps, phone travel there. Walked to the front door, pressed E: door swung open 95°, prompt changed to "Close". Garage door was open for the owner. | **PASS** (bug 1 below) |
| Business | Walked to Shop 3 and pressed E. In the picker, clicked Café and Open (real clicks): −$50, owner set, interior furnished, AI customer came in. Served at the counter: +$15. | **PASS** (bugs 2–4 below) |
| Car | MuscleCar: E to sit, held W for 1.5 s → moved 25.4 studs, stopped when released. Space to get out: car re-anchored, 0.00 studs drift. | **PASS** |
| Metro | Downtown gate: E → platform. Train docked: E "Board train" → seated. Rode Downtown → Park (x 22 → −588). Space → put on the Park platform. Walked to EXIT, E → street. | **PASS** |
| Save / rejoin | DataStore answers "You must publish this place to the web to access DataStore" (PlaceId 0) | **BLOCKED** (publishing is the owner's/Dad's call) |
| 2+ players | – | **NOT TESTED** |

**Test money:** added on the server in Play only (+$200, +$25,000, +$5,000). Play changes are never saved to the place.

## 4. New problems found (not fixed yet: each needs the owner's OK)
1. **Villa_PalmHills_1_Classic is buried in a sand dune.**
   - Its front doors and garage door are inside `Workspace.DreamBuilders.Mountains` child #34: a Sandstone ball at (−547.9, −15, −977.8), size 237.9 × 120.1 × 246.3.
   - The dune surface is 21 studs above the floor in front of the door, and "My Home" travel lands on top of the dune.
   - It is the cheapest villa and the first one in the phone list.
   - All 30 villas were checked; only this one is affected.
   - Suggested fix: shrink or move that one dune part (backup first), then re-test the door and garage.
   - Screenshot: `evidence/2026-11-08_phaseA/villa_palmhills_1_buried_in_dune.jpg`
2. **The shop sign keeps the old shop name on the street side.**
   - `Biz3.Sign` has two labels (front face and back face). `BusinessServer.setSign` only changes the first one, so after opening a Café the street still reads "JEWELS".
   - The other 4 units are probably the same (not checked one by one).
   - Also, `string.upper("Café")` gives "CAFé".
   - Screenshot: `evidence/2026-11-08_phaseA/biz3_sign_still_says_jewels.jpg`
3. **The rent board text stays visible after renting.** The board part turns transparent, but its SurfaceGui ("OPEN YOUR BUSINESS HERE") still shows.
4. **Serve and "Hire staff" fight over the E key.**
   - Both prompts use E with a 10-stud range.
   - Standing at the counter 5.4 studs from the serve point, E triggered "Hire staff #1 ($150)" instead of "Serve coffee".
   - Serving worked from a spot more than 10 studs from the staff spot.
   - Suggested fix: use a different key for Hire staff, or move the staff spot.
5. **(From Codex's note) Station_Downtown.StairTower** still has the values from Codex's old edit: position (−5, 9, 761), size 16 × 18 × 12. It is now non-collidable and 55% transparent, so it doesn't block anyone. Real stairs were walk-tested on 7 Nov. Left as is.

## 5. Codex risk register: updated status
| ID | Status now |
|---|---|
| A1 Lobby ScreenFade nil text | **Closed:** fixed and tested |
| A2 Line number off by one | **Closed:** 342 is the assignment line |
| A3 20 asset IDs unmapped | **Closed:** mapped; owner's own textures; load fine |
| A4 Backup older than the place | **Closed:** new backup, byte-identical and verified |
| A5 City bounds/routes unknown | Open (next phase) |
| A6 Property/economy/business regression | Partly: smoke-tested with 1 player; saving blocked until publish |
| A7 Vehicle/road obstruction | Open: one street drive passed; no city-wide audit yet |
| A8 Metro behaviour unknown | **Closed for 1 player:** full trip tested |
| A9 Performance | Open |

## 6. Honest notes on the test method
- To save time, some tests moved the character straight to the spot (lift, villa door, shop, airport). The actions themselves were real E presses or mouse clicks.
- One false failure at the shop counter came from my test setup (I moved the character while it was still seated). It was re-done properly and passed.
- While focusing Studio to save, I accidentally opened a second Roblox Studio window (the start page, no place open). It is minimised and safe to close.

## Files changed
- Studio (saved): `ServerScriptService.LobbyServer` lines 96–97.
- Repo:
  - `roblox/src/LobbyServer.server.lua` (synced from the saved place)
  - `roblox/src/DreamBuildersSkyPolish.server.lua`: this script was already in the place but missing from the repo; now synced
  - Codex's audit pack copied to `audit/phase1_codex/`
  - Screenshots in `evidence/2026-11-08_phaseA/`
