# Plan 0 (Villa 1 pool water): report
8 Nov 2026, 15:45–16:50 Riyadh, by Claude.

**Status: FULLY WORKING. Repaired, tested in Play, and saved at 16:42.** See section 7.
- Villa 1's pool now matches Villa 7: water at y 5.41, no floating water, you can swim and get in and out by the steps.
- It also has the same deck-swim effect as Villas 7, 8 and 15: walking right next to the outside of the pool wall can make you swim. The owner chose to accept it (section 6).
- Villas 10 and 6 were **not** touched.

History:
- Run 1: the fill alone failed the visual check, so it was restored.
- Run 2: with the approved extra ground step, Villa 1 matched Villa 7, but it was restored because of the "no water spill" rule.
- Run 3: the owner chose "re-apply and save".

"Tested" means checked in Roblox Studio Play mode with one player.

## 1. What happened
1. **Approved Plan 0 (fill up to y 5.90):** in Play the water was brim-full and spilled over the pool walls. Restored, not saved.
2. **Corrected Plan 0 (fill up to y 5.41, approved "Villa 1 only"):** applied in Edit, not saved.
   - **Passed in Play:**
     - Water surface 5.42 (Villa 7: 5.41).
     - No floating water left.
     - Swam in by the steps and climbed out.
     - Front door opens; walked into the house.
     - Driveway walked.
     - Output: 0 errors (only the known harmless car-texture warnings).
   - **Failed the visual comparison with Villas 7 and 8:** at Villa 1 the water also clings to the outside of the pool's garden-side wall (`evidence/2026-11-08_villa1_pool/villa1_pool_comparison.jpg`, row 1).
3. **Cause (measured).**
   - At correct villas, the pool's lower terrain layer (y 0 to 4) is **water** (34% full).
   - At Villa 1 that layer is still a **thin ground layer** (44 cells, 12% full).
   - A water fill (`FillBlock`) does not replace existing ground, so only the upper layer (y 4 to 8) became water.
   - Terrain cells in one column through the middle of each pool:

     | Layer | Villa 1 (fill only) | Villa 7 (correct) | Villa 8 (correct) |
     |---|---|---|---|
     | y 4–8 | Water 36% | Water 35% | Water 35% |
     | y 0–4 | **Ground 12%** | **Water 34%** | **Water 34%** |
     | y −4–0 | Ground 89% | Ground 89% | Ground 89% |

4. **Play-only trial (thrown away when Play stopped).** I turned those 44 ground cells into air, then ran the same fill. Villa 1 then matched Villa 7:

   | Check | Villa 1 (trial) | Villa 7 |
   |---|---|---|
   | Water surface, middle | 5.42 | 5.41 |
   | Water surface, near the walls | 4.88 / 5.02 | 4.87 / 5.00 |
   | Water on the steps | 2.95 | 2.95 |
   | Strip just outside the garden-side wall | 3.65, 3.14, 2.63, 2.12 | 3.64, 3.13, 2.62, 2.12 |
   | Garden-side wall in the screenshots | clean | clean |

   Screenshots: `villa1_pool_comparison.jpg`, row 2.
5. **Restore.** Because the fill-only version failed, I put Villa 1's terrain back from the snapshot taken before Plan 0.
   - Result: **0 terrain cells different, 0 parts changed/removed/added.**
   - The place file is unchanged: `Downloads\DreamBuilders.rbxl`, 4,593,103 bytes, SHA-256 `d97a010d8830…`, last saved 03:52.
6. **The owner asked for a cell-by-cell inspection before approving.** See:
   - `evidence/2026-11-08_villa1_pool/villa1_44_cells.md` (every cell: position, what is in it, how much of it is inside the pool)
   - `evidence/2026-11-08_villa1_pool/villa1_pool_terrain_preview.png` (top view and before/after cross-section)

## 2. Inspection of the 44 cells (read-only)
- **Where they are:** the terrain layer y 0 to 4, x −532 to −488 (11 columns), z −1044 to −1028 (4 rows). All 44 are now Ground, 12% full.
- **Not strictly inside the pool.** Terrain uses a fixed 4-stud grid, and the pool does not line up with it.
  - 18 cells are fully inside the water area. The other 26 also reach under the walls.
  - Of the 704 stud² they cover, 476.3 is the water area, 133.4 is under the walls, and 94.4 is just past the outer face of the walls.
  - How far past the walls they reach: 0.69 studs on the garden side, 0.19 on the house side, 1.02 on the west, and 2.66 on the east (under the step-out steps).
  - All of that past-the-wall area is covered by Villa 1's own parts: the deck (`Mansion_stone`, top y 2.48), the step-out steps, and a little of the house base. No bare terrain is visible there.
  - Nothing reaches another property, a road or a plot.
- **Pool floor:** it is a part (`PoolFloor`, Glass, top y 2.66). Terrain edits cannot move or delete parts, and the same goes for the walls, steps, lights and deck.
- **Ground below:** the layer under these cells (y −4 to 0, Ground 89% full) is not in any plan step, so no hole can open.
- **Surroundings:**
  - The 136 terrain cells around this area are identical to the cells around Villa 7's pool. After the change, Villa 1's pool terrain will be arranged like Villa 7's.
  - Terrain is drawn smoothed between neighbouring cells. In the trial, the ground drawn under the deck 3 studs out dipped from y 2.47 to 2.29 (Villa 7: 2.29). That spot is hidden under the deck (top 2.48).
  - What you can see is a thin film of water on the deck right along the walls. Villas 7 and 8 have the same film; it is the light "ledge" in their side views.

## 3. Proposed revised Plan 0 (waiting for approval)
| Step | What | Cells | Status |
|---|---|---|---|
| 1 | `ReplaceMaterial` Water → Air in x −532…−488, y 20…28, z −1044…−1028 | 88 floating water cells | approved before |
| 2 | **`ReplaceMaterial` Ground → Air in x −532…−488, y 0…4, z −1044…−1028** | **44 thin ground cells** | **NEW, needs approval** |
| 3 | `FillBlock` Water, centre (−510.82, 4.035, −1035.75), size (37.80, 2.75, 12.60): pool floor top 2.66 up to 5.41 | 44 + 44 cells become water | approved before |

**Expected result**
- 176 changed cells: 88 water → air, 44 ground → water, 44 air → water.
- Expected water fill: about 34–35% in most cells. The 4 cells in the east column are almost entirely outside the water area, so they should get only a trace of water.
- These values are expected, not yet measured; they will be measured after the change.

**Checks after the change.** If any check fails, restore at once and do not save.
- Terrain diff against the snapshot: only those 176 cells changed.
- Parts: 0 changed/removed/added.
- Water levels compared with Villa 7.
- Screenshots of Villa 1 and Villa 7 taken at the same time of day.
- Play: swim in and out, walk around the deck, front door, inside the house, driveway.
- Output.

## 4. Backups
- **File:** `Downloads\DreamBuilders_backup_8Nov_before_villa1_pool.rbxl`
  - 4,593,103 bytes, SHA-256 `d97a010d8830…`.
  - Byte-identical to the current saved place (checked again today).
  - Structure check OK: 107 classes, 29,932 objects.
  - Opened in Studio earlier today.
- **Snapshot in the open Studio session:** all terrain in x −580…−440, y −16…64, z −1100…−960. Used today to restore Villa 1, with a verified result of 0 cells different.

## 5. Noticed, not changed
- **Villa 7:** a sand dune (`Mountains` part, Sandstone ball) rises just outside the garden-side wall near the pool's east end. Its surface is at y 5.8 to 13.8 there.
- **Plans 1 and 2 (Villas 10 and 6)** use the same water method. They would need the same corrected height (5.41) and the same extra ground step. Not approved yet.

## 6. Run 2: the approved extra step (owner approved 16:23, Villa 1 only)
**Starting point (checked first)**
- Terrain identical to the saved place (0 cells different). Parts 0 changed/removed/added.
- `DreamBuilders.rbxl` and the backup both SHA-256 `d97a010d8830…`, unchanged since 03:52 and 03:39.

**Applied in Edit: the 3 steps from section 3**
- Result: exactly **176 cells changed**. Nothing changed outside the planned boxes. Parts 0/0/0.

  | Box | Change | Cells |
  |---|---|---|
  | y 20–28 (floating water) | Water → Air | 88 |
  | y 0–4 (the 44 thin ground cells) | Ground → Water | 44 |
  | y 4–8 | Air → Water | 44 |

- Water fill per cell, exactly as predicted: 34% (y 0–4) and 36% (y 4–8) in 40 columns. The 4 east-edge cells, which sit mostly under the steps, got 2%.

**Perimeter check in Edit.** I looked down from above every 0.5 stud: 5,985 points within 6 studs of the pool.
- Walls (636 points): unchanged.
- Inside the pool: water now, where before you saw the empty floor.
- No holes. The only bare ground that moved is a strip on the house side, 3.4 studs from the wall. It went from y 2.47 to 2.39–2.41 (0.06–0.08 lower), which is now within 0.03 of Villa 7's ground at the same spot.
- Water just outside the walls (seen from above), Villa 1 compared with Villa 7:

  | Side | Villa 1 highest | Villa 1 reach | Villa 7 highest | Villa 7 reach |
  |---|---|---|---|---|
  | Garden side | 3.65 | 1.4 studs | 3.64 | 1.4 studs |
  | House side | 3.14 | 0.9 studs | 3.13 | 0.9 studs |
  | West end | 4.09 | 1.8 studs | 4.38 | 1.8 studs |
  | East end (steps) | 4.17 | 1.8 studs | 4.41 | 1.8 studs |

- Inside the pool, the water height differs from Villa 7 only near the two short ends, by up to 0.31. The pool sits 1 stud differently on the terrain grid.

**Play test (1 player)**

| Test | Result |
|---|---|
| Entry | Walked from the deck over the steps into the pool. State changed Running → Swimming. |
| Swimming | Floating at the middle of the pool (root height 5.5). |
| Exit | Swam to the steps and climbed out with a jump. Freefall → Landed → Running on the deck (Limestone). |
| Lap on the deck, 1–1.4 studs from the walls | **The character swims part of the time**: 29% of samples at Villa 1. Correct villas with no dune: Villa 8 40%, Villa 15 23%. Villa 7 (part of a lap; its dune blocks the rest): same pattern. |
| Output | 0 errors. Only the known car-texture "being generated" warnings. |

**Pictures**
- `villa1_repaired_vs_villa7_edit.jpg`: Edit mode, so the lighting is identical. Side and top views look the same as Villa 7, including the light deck around the pool.
- `c_villa1_RESTORED_side_edit.jpg`: before the repair, the ground sits flush with the deck, so the deck looks like grass.
- Play pictures: `c_*_play_*.jpg`. The game's day/night cycle changed the lighting between shots.

**Decision**
- The owner's rule says any water spill means restore and do not save. The water just outside the walls lets the player swim on the deck next to the pool, so I restored Villa 1.
- Result: 0 terrain cells and 0 parts different from the saved place. **Not saved.**
- Place file and backup unchanged (SHA-256 `d97a010d8830…`).

**Why the deck-swim happens**
- It is the same at every correct villa I tested (7, 8, 15), so it comes from how all the pools were built.
- The pools do not line up with the 4-stud terrain grid, so the cells at the pool's edges hold water slightly past the walls.
- If Villa 1 is made identical to Villa 7, it gets this effect too.
- Removing it would be a separate job for all villas, and needs its own plan.

## 7. Run 3: re-applied and saved (owner chose "Re-apply and save")
**Re-applied in Edit**
- Starting point checked first: 0 terrain cells and 0 parts different from the saved place.
- The same 3 steps changed **176 cells**, all inside the planned boxes:
  - 88 Water → Air (y 20–28)
  - 44 Ground → Water (y 0–4)
  - 44 Air → Water (y 4–8)
- The water fill values were the same as run 2. Parts 0/0/0.
- The view from above (5,985 points) was **identical to run 2** at every point.

**Play re-test**

| Test | Result |
|---|---|
| On the deck | Running, standing on the deck (Limestone) |
| Over the steps into the pool | Running |
| Middle of the pool | Swimming |
| Back to the steps | Swimming |
| Climb out with a jump | Freefall, then Running on the deck |
| Output | Server 0 errors, client 0 errors. The only warnings were the known car-texture "being generated" ones. |

**Before saving:** checked again in Edit: 176 cells, parts 0/0/0, 65 scripts with 374,888 characters of source (unchanged).

**Saved**
- Ctrl+S in Studio. The Output showed `Saved to 'C:/Users/PC/Downloads/DreamBuilders.rbxl'` at 16:42:28.
- New file: 4,593,098 bytes, SHA-256 `6c804b239b6c3853e9329c82af22ed885d6f92552f5909222234f774bf1d4a5a`.

**Saved file checked**
- Structure OK: 107 classes, 29,932 objects, END chunk.
- Compared chunk by chunk with the backup:
  - Same object count in every class.
  - Of the 2,132 property chunks, **only `Terrain.SmoothGrid` (the terrain data) differs**.
  - All parts, scripts (every `Source` chunk) and settings are byte-identical.

**Backup:** untouched. `Downloads\DreamBuilders_backup_8Nov_before_villa1_pool.rbxl` is still 4,593,103 bytes, SHA-256 `d97a010d8830…`, last modified 03:39. To undo this repair, open that file.

**Evidence:** `evidence/2026-11-08_villa1_pool/` (comparison images, before/after screenshots, the 44-cell table, the terrain preview).

**Not done (on purpose):** Villa 10 (Plan 1) and Villa 6 (Plan 2) need the owner's separate approval. They would need the same corrected water method: fill to y 5.41 plus the ground-layer step.
