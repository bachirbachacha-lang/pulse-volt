# Bug-fix report: 4 bugs from the Phase A smoke tests
8 Nov 2026, 02:51–03:20 Riyadh, by Claude. Approved by the owner: "proceed with fixing all four newly discovered bugs."

Each fix was made separately. Each was tested in Studio Play mode, and the Output was checked afterwards. "Tested" means checked in Play mode with one player.

## 0. Backup (before any edit)
- **New backup:** `Downloads\DreamBuilders_backup_8Nov_before_bugfixes.rbxl`
  - 4,591,173 bytes, SHA-256 `53ec36329584…`, byte-identical to the place as saved after Phase A.
- **Recoverable: VERIFIED.** I opened the backup in a second Roblox Studio window and compared it with the live place. Every count matched:
  - Workspace: 22,481 objects
  - ServerScriptService: 41
  - ServerStorage: 7,221
  - Scripts: 65, with 373,723 characters of source
  - Villas: 36
  - The Phase A LobbyServer fix is present
- I then closed the backup without saving.

## Fix 1: buried Palm Hills villa (Villa_PalmHills_1_Classic). FIXED (tested)
**Before**
- The villa's house (47 parts) sat **20.33 studs above its own garage and driveway**.
- A sand dune (`Workspace.DreamBuilders.Mountains`, a Sandstone ball, radius 60) covered the front doors and the house's garage door.
- Phone › Maps › My Home landed the player on top of the dune (y = 46).
- Screenshot: `evidence/2026-11-08_bugfixes/1_villa1_topdown_BEFORE.jpg`

**Cause (measured)**
- Villa 1 is the same design as Villa_PalmHills_7_Sand (same row, same direction).
- Compared part by part against Villa 7, 21 parts match exactly and 47 parts are exactly 20.33 studs too high. Nothing else differs.

**Change**
1. Backed up the villa and the dune inside the place: `ServerStorage.Phase1Backups.Fix8Nov_BuriedVilla` (copy of the villa, plus `Mountains_Dune34_original`).
2. Lowered only those 47 parts by their exact offset (20.33 studs). Also lowered the model's pivot (y 20.83 → 0.50, the same as the other villas).
3. Moved that one dune from (−547.9, −15, −977.8) to **(−740, −15, −1040)**.
   - This spot is in the gap of the ring of dunes west of Palm Hills.
   - It was picked by a clearance search: it touches nothing except the ground tile, is 41.8 studs from the nearest object, 8.6 studs from the lawn, and overlaps no other dune.

**Not touched:** Terrain voxels (no terrain edits), the other 29 villas, roads, scripts.

**Tests**
| Test | Result |
|---|---|
| Edit check: Villa 1 layout vs Villa 7 | 0 differences |
| Edit check: Villa 1 parts inside any dune | 0 |
| Edit check: what the moved dune touches | Ground tile only |
| Things that had been sitting on the old dune | None found. A lamp pole that was buried inside it is now visible and standing normally. |
| Play: bought the villa through the phone's Property request (test money, Play only) | Bought; −$25,000 |
| Play: My Home travel | Lands on the ground (y = 3.0; was 46). Owner sign at ground level. |
| Play: walked to the front door, pressed E | Door swung open 95°, prompt changed to "Close" |
| Play: walked to the garage building | Its door rolled up automatically for the owner |
| Play: walked inside the house | Standing inside on the floor. Floor is the same as Villa 7 (terrain "Ground" at y 2.47). |
| Output | Server 0 errors, client 0 errors, 0 warnings (except the known harmless texture warnings) |

**After:** `1_villa1_topdown_AFTER.jpg`, `1_villa1_street_AFTER.jpg`

> **Correction (8 Nov, 03:45, found during the Villa 6/10 inspection):** Fix 1 has a side effect. Villa 1's pool water is terrain water and did not move with the house. Its pool is now empty, and the water (88 cells) floats at y 20–28 above where the pool used to be. The Play test above did not include the pool. The repair (Plan 0) is in `VILLA_6_10_REPAIR_PLAN.md`, waiting for approval. Screenshot: `evidence/2026-11-08_villa_inspection/villa1_pool_water_floating_REGRESSION.jpg`.

## Fix 2: shop signs show the right name. FIXED (tested)
**Before**
- Every shop sign (all 5 units) has a label on each face.
- `BusinessServer.setSign` only changed the first label, and that label faces **into** the building.
- So the street always saw the old fixed names: CAFE, BOUTIQUE, JEWELS, DESIGN, GYM.
- Also, "Café" became "CAFé".

**Change (`ServerScriptService.BusinessServer`)**
- `setSign` now updates every label on the sign.
- New helper `signUpper` capitalises accented letters too (é → É and similar).

**What the street shows now**
- Free shop: "FOR RENT · $50". This is what the script always meant to show; before, only the hidden face showed it.
- Rented shop: the business name, e.g. "☕ DREAM CAFÉ".

**Tests**
| Test | Result |
|---|---|
| Play start, free shops | All 5 shops show "FOR RENT · $50" on both faces |
| Rented Shop 3 through the real picker (clicked Café, typed "Dream Café", clicked Open) | Both faces "☕ DREAM CAFÉ"; −$50 rent |
| Rented with an empty brand | "☕ CRRUSHER14'S CAFÉ" |
| Closed the business (Close My Business button) | Both faces back to "FOR RENT · $50" |
| Output | 0 errors, 0 warnings |

**After:** `2_shops_street_unrented_AFTER.jpg`, `2_shop3_sign_cafe_AFTER.jpg`

## Fix 3: rent board disappears after renting. FIXED (tested)
**Before:** After renting, the board part went see-through but its "OPEN YOUR BUSINESS HERE" text stayed floating in front of the shop (`3_rentboard_rented_BEFORE.jpg`).

**Change (`BusinessServer`):** a new helper `showBoard(unit, on)` sets the board's transparency, its text (SurfaceGui) and its prompt together. Renting hides all three; closing the business shows all three again.

**Tests**
| Test | Result |
|---|---|
| Before renting | Board visible, text on, prompt on |
| After renting | Transparency 1, text off, prompt off (`3_rentboard_rented_AFTER.jpg`). The board was already non-collidable, so it never blocked the door. |
| After closing | Board, text and prompt back on |
| Output | 0 errors from the game |

**Note on this run:** the Play session also logged sound/asset download time-outs (`HttpError: Timedout`, including a built-in Studio sound). This change doesn't touch sounds, and the next Play session had 0 time-outs. It was a network hiccup.

## Fix 4: "Hire staff" and "Serve" no longer share the E key. FIXED (tested)
**Before**
- The Serve point and the Staff spot are only 5 studs apart behind the counter, and both prompts used E with a 10-stud range.
- At the counter, E could pick "Hire staff #1 ($150)" instead of serving the customer.

**Change (`ServerScriptService.StaffServer`):** the Hire prompt now uses **F** (gamepad **Y**). Serve keeps **E** (gamepad X). F isn't used by any other prompt in the shops; it's only used at villa garages and the hotel.

**Tests**
| Test | Result |
|---|---|
| Stood where E used to trigger Hire (5.0 studs from Serve, 9.5 from Hire); customer waiting; pressed E | **"Serve coffee"**, +$15, no hire |
| Stood 5.2 from Serve and 5.1 from Hire (Hire closer); pressed F | **"Hire staff #1"**, −$150 (test money), StaffCount 1, prompt shows "#2" |
| Same spot, customer waiting, pressed E | **"Serve coffee"**, +$15, StaffCount still 1 |
| Closed the business with staff hired | Staff spot and staff removed, sign "FOR RENT", board back |
| Output | Server 0 errors, client 0 errors, 0 warnings, 0 time-outs |

**Small catch:** from 9.5 studs the Hire prompt was not shown (it sits right at its 10-stud edge), so F did nothing there. At the counter it works.

## Saved place and repo
- `Downloads\DreamBuilders.rbxl` saved at 03:16 (Studio Output: "Saved to …"). 4,593,103 bytes, SHA-256 `d97a010d8830…`.
- Script diff against the backup: **only BusinessServer and StaffServer changed.**
- Object count: +85 compared with the backup, which is exactly the new backup folder in ServerStorage. Nothing else was added or removed.
- Repo: `roblox/src/BusinessServer.server.lua` and `roblox/src/StaffServer.server.lua` synced from the saved place. Screenshots are in `evidence/2026-11-08_bugfixes/`.

## Scripts and objects changed
| What | Change |
|---|---|
| `ServerScriptService.BusinessServer` | `setSign` updates all labels; new `signUpper` and `showBoard`; 2 call sites |
| `ServerScriptService.StaffServer` | Hire prompt key E → F (gamepad Y) |
| `Workspace.DreamBuilders.Homes.Villa_PalmHills_1_Classic` | 47 parts lowered 20.33 studs; WorldPivot y 20.83 → 0.50 |
| `Workspace.DreamBuilders.Mountains` dune (was #34) | Position (−547.9, −15, −977.8) → (−740, −15, −1040) |
| `ServerStorage.Phase1Backups.Fix8Nov_BuriedVilla` | New: backup copies of the villa and the dune |

## Remaining issues (found while fixing; NOT changed: they need your OK)
1. **Villa_PalmHills_6_Classic: the house floats about 31 studs in the air** above its garage (`open_villa6_house_floating.jpg`).
   - 50 of its parts are also shifted sideways compared with Villa 7, so this is a bigger repair than Villa 1. It needs measuring first.
   - The house can't be reached on foot. Not walk-tested.
2. **Villa_PalmHills_10_Pearl: the house is raised 7.58 studs** (47 parts) on a terrace with no steps, and 32 of its parts are inside a dune (`open_villa10_raised_terrace.jpg`).
   - Its doors are clear of the dune.
   - It may be hard or impossible to walk up to. Not walk-tested.
   - Same fix as Villa 1: lower 47 parts, and move or trim the dune.
3. **Palm Hills road:** the road part ends at x = −490, but the lane markings carry on over the sand to the west. Cosmetic.
4. Saving between sessions and 2-player behaviour still can't be tested until the game is published.

Not done (as instructed): no city reconstruction.
