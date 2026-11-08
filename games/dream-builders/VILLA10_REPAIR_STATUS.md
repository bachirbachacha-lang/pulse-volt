# Villa 10 repair: result (NOT SAVED)
8 Nov 2026, Riyadh time, by Claude. The owner approved the plan (`VILLA10_REPAIR_PLAN.md`, revision 2) at 17:20, with 6 conditions.

**Result: the repair failed Play check 12, so I undid it in Studio and saved nothing.** Villa 10 is still raised, exactly as before. **Waiting for the owner's decision** (section 5).

> **Update 21:45–22:45:** the owner chose Option 1.
> - The revised pool-edge plan is in `VILLA10_POOL_EDGE_PLAN.md`.
> - It was tested only in a test copy, which was closed without saving: 0 accidental swimming round the pool.
> - It is **waiting for approval**, and the real game is still unchanged.

## Status at a glance
| Item | Status |
|---|---|
| Villa 10 in the saved game | **Not changed.** Still 7.578 studs too high, dune #43 still on the lot, pool water still floating. |
| Saved file `Downloads\DreamBuilders.rbxl` | Last saved at **16:42** (the Villa 1 save). It is byte-for-byte the same as the new backup (SHA-256 below). |
| Studio (the open place) | The same as the saved file. Checked after the undo (section 4). |
| New backup | `Downloads\DreamBuilders_backup_8Nov_before_villa10.rbxl` (17:22). Same SHA-256. It was opened in Studio and matched **before** any change. Kept. |
| Villa 1 and Villa 15 | Not touched: 0 terrain cells different, 0 parts moved |
| Villa 6 | Not started |
| Bench | Not moved (condition 1). Documented as a known issue (section 6). |

## 1. What was done
| Time | Step |
|---|---|
| 17:20 | Owner approved revision 2 with 6 conditions |
| 17:22 | **File backup** made, SHA-256 matched. Opened in a second Studio window and matched the live place: Workspace 22,481, ServerScriptService 41, ServerStorage 7,306, ReplicatedStorage 4, StarterPlayer 20 objects; 65 scripts, 374,888 characters. Closed without saving. |
| 17:22–17:25 | Copies inside the place (`ServerStorage.Phase1Backups.Fix8Nov_Villa10`, 85 objects). Snapshots of every part position (25,897 parts) and of the terrain at Villa 10, Villa 1 and Villa 15. |
| ~17:25 | Applied exactly the planned changes: 47 house parts down 7.57825 studs; pivot y 8.07826 → 0.50001; dune #43 moved to (385, −15, −1148); terrain steps 4a, 4b and 4c. |
| ~17:26 | Edit checks passed: exactly 160 terrain cells and exactly 48 parts (47 house parts and the dune) changed. Nothing else changed. |
| 17:27 | Screenshots of the repaired villa (street, back, top) |
| ~17:28–17:51 | Play checks 1–11 passed. Check 12 **failed** (section 3). |
| ~17:52–17:55 | Stopped Play, undid everything, checked it, **did not save** |
| 21:37–21:39 | One more test in Play mode, with no edits: the same path at Villa 1 and Villa 15 (section 3) |

## 2. The checks
**Edit checks (before Play), items 1–6 of the plan: passed.** The change counts were exact: 160 terrain cells and 48 parts.

**Play checks**
| # | Check | Result |
|---|---|---|
| 1 | Start Play; Output | Passed |
| 2 | Buy Villa 10 | Passed |
| 3 | Phone › Maps › My Home | Passed |
| 4 | Walk to the front door | Passed |
| 5 | E at the front door | Passed |
| 6 | Walk inside | Passed |
| 7 | House garage door | Passed |
| 8 | Garage building and driveway | Passed. A car drives from the road into the garage. Reversing out stalls at a 1.2-stud step on the driveway. Villa 15 has the same step and the same stall, so it is old and not caused by the repair. |
| 9 | Walk past the bench | Passed. It is not in the way, and you can walk around it. |
| 10 | Pool water | Passed: level ~5.4 like Villa 15, no floating water |
| 11 | Walk in over the steps, swim, climb out | Passed |
| 12 | Walk around the pool on the deck, next to the pool walls | **FAILED.** A player gets stuck at one corner (section 3). |
| 13 | Back yard where the dune was | Not run in Play: I stopped at the first failure. The 17:27 screenshot shows open lawn. |
| 14 | Dune at its new spot | Not run in Play. The Edit check had confirmed it touched nothing. |
| 15 | Neighbours unchanged | Checked in Edit (only the 48 planned parts had moved). Not walked in Play. |
| 16 | Villa 1 quick check | Partly done. Villa 1's pool terrain is unchanged (0 of 1,200 cells), and walking its deck with real key presses showed no trap. Swimming in and out was not re-run. |
| 17 | Output at the end | No script errors. Only the known "Asset content representation is being generated" warnings. |
| 18 | Screenshots | Taken in Edit at 17:27 (street, back/pool, top-down). See `villa10_before_vs_repair_not_saved.jpg`. They were not put side by side with Villa 15. |

The detailed numbers for checks 1–11 were recorded during the working session. This report lists only pass or fail for them. They no longer apply to the saved game, because the repair was undone. All 18 checks would be run again in full for any new repair.

## 3. Check 12: why it failed
**The check asked:** walking on the deck next to the pool walls should make you swim **no more than at Villa 15** (23% of a lap, measured on 8 Nov).

**What happened:**
- **Where:** the path along the house side of the pool. It is only about **3.6 studs wide**, between the pool wall and the house wall.
- **Water on the path:** after the repair, pool water lay on top of this path. Measured at the middle of the pool:

  | Distance from the pool wall | Water depth on the path |
  |---|---|
  | 0.4 studs | 1.34 studs |
  | 0.9 studs | 0.84 studs |
  | 1.4 studs | 0.33 studs |
  | 1.9 studs | none |

- **The trap:** a player walking along the path toward the pool's east corner starts swimming. The swimming body lies flat and gets wedged between the house wall and the pool wall at the corner.
- **Getting out:** holding the forward key does not get them out. They only get out by letting go, which pops them back the way they came.
- **Screenshot:** `villa10_check12_stuck_at_pool_corner.jpg`.

**Tests with real key presses** (forward key held). "Stuck" means speed 0 while swimming.
| Test | Villa | Walk | Swimming | Stuck |
|---|---|---|---|---|
| A1 | 10 | east side, toward the house-side corner | 0 | 0 |
| A2 | 10 | house-side path, from the east corner going west | ~2.8 s | ~2 s |
| T7 | 10 | the same walk again | ~2.8 s | ~2.2 s |
| T8 | 10 | the same walk, key held 8 s | ~8.3 s | ~7 s (the whole time) |
| Lap | 10 | full lap with W/A/S/D | 21% of the lap | briefly, at the same corner (the west end of the lap was disturbed) |
| H1 | 1 | house-side path, from the east corner going west | 0 | 0 |
| H2 | 1 | house-side path, from the west corner going east | ~0.3 s | 0 |
| H3 | 15 | house-side path, from the east corner going west | 0 | 0 |
| T1 | 15 | garden-side path, going west | ~0.5 s | 0 |
| T2 | 15 | garden-side path, going east | ~1.1 s | 0 |
| T3 | 15 | west side, going north | 0 | 0 |
| T4 | 1 | garden-side path, going west | 0 | 0 |
| T5 | 1 | garden-side path, going east | ~1 s | 0 |
| T6 | 1 | west side, going north | ~0.1 s | 0 |

**Earlier laps walked by a script** (before the key-press tests):
- Continuous laps: at Villa 10 the player was swimming 73–74% of the lap, mostly stuck at that same corner. At Villa 15: 21–28%, never stuck.
- One walk per side: Villa 10 8% (house side 14 of 64 samples); Villa 15 20% (garden side 35 of 104, west side 6 of 24).

**Why only Villa 10:**
- The three villas use the same pool design.
- Terrain water comes in 4-stud blocks, so where a pool sits on the 4-stud grid decides how far its water reaches past the walls.
- On Villa 10's house side, the last row of water blocks reaches **0.86 studs past the wall**, onto the narrow path.
- At Villa 15 that row ends inside the wall. At Villa 1 it ends 0.19 studs past the wall. The tests show no trap at either.

**My mistake in the plan:**
- Section 6 of the plan said the water past Villa 10's walls would sit "under the deck". **That was wrong:** on the house side it lies on top of the path.
- I compared how far the water reached past the walls with Villa 15. I did not check that this side is a narrow path between two walls.

## 4. Undo and checks after Play was stopped
- **Put back from the snapshots:** every part position, the Villa 10 pivot, the dune, and the terrain.
- **Removed the in-place copy folder** `Fix8Nov_Villa10`. It had been added for this repair and was never saved. The separate backup file stays.
- **Checked:**
  - Parts: of the 25,897 parts in the snapshot, 0 moved. The 70 parts no longer present are exactly the copies in the removed folder (69 Villa 10 copies and the dune copy).
  - Villa 10 pivot: y 8.07826, identical to before.
  - Terrain: Villa 10 area 0 of 36,400 cells different; Villa 1 pool area 0 of 1,200; Villa 15 pool area 0 of 1,200.
  - Object and script counts match the saved file: Workspace 22,481, ServerScriptService 41, ServerStorage 7,306, ReplicatedStorage 4, StarterPlayer 20; 65 scripts, 374,888 characters.
  - The file on disk:
    - SHA-256 `6c804b239b6c3853e9329c82af22ed885d6f92552f5909222234f774bf1d4a5a`, last saved 16:42:28.
    - Byte-for-byte the same as the backup made at 17:22.
    - **Nothing has been saved since 16:42.**
  - After the last read-only Play test (21:39): still 0 parts moved and 0 terrain cells different.
- **If Studio asks to save:** it may show the place as changed, because edits were made and then undone. The content is the same as the saved file. If Studio asks to save when it closes, **Don't Save** is the safe choice.

## 5. Options for the owner
Nothing will be done without approval.
1. **Revised plan for the house-side pool edge (recommended).**
   - Keep the approved house and dune changes. Change only how the water is filled in the 10 water blocks along the house-side wall (x 324…364, z −1036…−1032), so no water lies on the path.
   - The water along that one wall might look a little lower. That has to be tried and shown in screenshots.
   - I would write it as a read-only plan first, including a safe way to try it (for example in the backup copy, never saved), then run all 18 checks again.
2. **House and dune now, pool water later.**
   - Fixes the main bug (you can't walk into the house) and removes the floating water.
   - The pool stays empty until option 1 is ready. No trap, but the pool is dry.
3. **Repair as tested and accept the corner problem.**
   - Not recommended. A player stays stuck for as long as they hold the key.
   - The deck-swim at Villa 1, which you accepted, never traps anyone.
4. **Leave Villa 10 as it is for now** and plan Villa 6 next. Villa 6's plan would check for this same house-side problem first.

## 6. Known issues (documented, not changed)
- **Bench at Villa 10's front corner** (`DreamBuilders.PalmHills` part at (371.46, 2.25, −981.00), 3.6 × 0.9 × 9):
  - **Now:** it floats 1.80 studs above the sand, because the house step it was placed on is raised with the house.
  - Left exactly where it is, on the owner's instruction.
  - **After a future house repair:** it would rest on the front step. Its street-side end would stick out 3.5 studs, 1.8 studs above the sand, and one corner would touch the house by 0.65 studs (cosmetic).
  - Villa 15's bench also hangs 1.8 studs above the sand.
  - It does not block anything: it is not in front of a door, the garage or the driveway.
- **Driveway step:** a car reversing out of the garage stalls at a 1.2-stud step. It is the same at Villa 15 (old).
- **Deck-swim at all pools** (known since 8 Nov): short swims of about 1 second or less, never stuck, on the garden-side and west paths at Villas 1 and 15.

## 7. Evidence
`evidence/2026-11-08_villa10_repair/`:
- `villa10_before_vs_repair_not_saved.jpg`: the saved file next to the repair as it was applied at 17:27 (not saved). Same camera positions.
- `villa10_check12_stuck_at_pool_corner.jpg`: Play screenshot of a player stuck swimming at the corner, with the forward key held.

Plan: `VILLA10_REPAIR_PLAN.md` (revision 2, approved 17:20). The earlier plan evidence is in `evidence/2026-11-08_villa10_plan/`.
