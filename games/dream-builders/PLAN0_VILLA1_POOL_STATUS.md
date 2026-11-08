# Plan 0 (Villa 1 pool water): status
8 Nov 2026, 15:45–16:40 Riyadh, by Claude.

**Status: NOT DONE. Villa 1 is back to the saved state. Nothing was saved.** Waiting for the owner to approve one extra terrain step.

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
