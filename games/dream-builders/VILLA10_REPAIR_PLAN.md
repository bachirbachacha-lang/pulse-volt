# Villa 10 (Villa_PalmHills_10_Pearl): repair plan, revision 2
8 Nov 2026, 16:55–17:40 Riyadh, by Claude. Revision 2 at 17:15–17:35 answers the owner's questions from 17:12.

> **Status 8 Nov, 21:40:** approved at 17:20 and applied in Studio. Checks 1–11 passed. **Play check 12 failed:** players get stuck swimming at the pool's house-side corner. The repair was **undone and NOT saved**, so the saved game is unchanged. Results and options: `VILLA10_REPAIR_STATUS.md`. The plan text below is kept as approved, plus one correction in section 6.
>
> **22:45:** step 4c is replaced by the revised pool-edge fill in `VILLA10_POOL_EDGE_PLAN.md`. It is tested in a test copy and **waiting for approval**. All other steps stay as below.

**READ-ONLY. Nothing in the game was changed or saved.** Every number was measured in Studio Edit mode. "After" values are calculations (simulated), not real moves. **Waiting for the owner's approval.**

**Changed in revision 2:**
1. **Dune destination moved to (385, −15, −1148).** The first spot overlapped dune #42 by 0.54 studs underground; the new spot is 7.25 studs clear of it.
2. **The bench is not moved.**
3. Added section 4 (confirmations) and a backup re-open test before any edit.

This replaces "Plan 1" in `VILLA_6_10_REPAIR_PLAN.md`. It uses the method proven on Villa 1's pool (`PLAN0_VILLA1_POOL_STATUS.md`):
- Fill the pool water to **y 5.41**.
- First turn the thin **ground layer under the pool (y 0–4) into air**, because a water fill does not replace ground.
- Check every terrain cell before and after.

## 0. Starting point (checked)
- Saved place `Downloads\DreamBuilders.rbxl`: 4,593,098 bytes, SHA-256 `6c804b239b6c…`, saved 16:42. It includes the Villa 1 pool repair.
- The open place still equals that save:
  - Villa 1's 176 repaired cells are in place.
  - No part has changed since this morning's snapshot.
  - Dune #43 and Villa 10 are at their original positions.
- Nothing in this plan touches Villa 1, Villa 15, the Phase A fixes or any script.

## 1. What is wrong with Villa 10 (re-measured today)
| Item | Measured |
|---|---|
| House | **47 parts are exactly 7.57825 studs too high.** Villa 15 is the same Pearl design and is correct. Both have 69 parts, and in each villa's garage frame 22 parts match exactly. The other 47 sit exactly 7.57825 higher (min = max), with the same x/z (to 0.0001), rotation and size. |
| Model pivot | y 8.07826. It should be 0.50001. |
| Entrance | The front doors' bottom is at y 9.43; Villa 15's is 1.85. The front terrace (top y 10.06) is **7.6 studs above the ground** in front of it, too high to walk or jump onto. |
| Pool | It is raised with the house. Its water is **80 terrain cells at y 8–16** (40 at 44%, 40 at 25%). |
| Under the pool (where it will go) | **40 cells of thin Ground (12%) at y 0–4**, Air at y 4–8, solid Ground (89%) below y 0. This is the same layer Villa 1 had. |
| Sand dune | **`Mountains` child #43**: Sandstone ball "Part" at (344.565, −15, −1060.26), radius 48.435, top y 33.44. **39 villa parts are inside it**, up to 24.9 studs deep. It would be 32.3 deep if the house were lowered and the dune stayed. Nothing is buried in it; only the long lawn part passes under it. |

## 2. Other things inspected
- **Garage building, driveway, road:** these 22 parts are already correct and stay as they are.
  - They are: floor, walls, roof, the roll-up door `Garage.Door_Garage`, CarSpot, 2 lamps, 7 driveway slabs and the ramp.
  - The driveway reaches the Palm Hills road (`Roads.Part`, top y 0.62) at z −946.5, at the same heights as Villa 15's.
- **Ground under and around the house** (compared with Villa 15 at 3,700+ spots):
  - Back lawn: identical.
  - Under the pool: different. This is the thin ground layer that this plan fixes.
  - Front edge: the terrain strip ends at the same world z (−989) at both villas. This is how the grid lines up; it already exists and isn't changed.
  - A strip beside the garage is 0.2–0.5 higher. Already there; not changed.
- **After lowering, the ground pokes above low part edges** (front step, lawn strip) at 1,329 spots, by up to 0.62 studs. Villa 15: 1,317 spots, up to 0.62. That is normal for this design.
- **Fabric bench** by the front corner (`DreamBuilders.PalmHills` part, (371.46, 2.25, −981.00), 3.6 × 0.9 × 9): **not moved.**
  - Now it floats 1.80 studs above the sand, because the house step it was placed on is raised with the house.
  - After lowering, it rests on the house's front step again: the step (top y 1.85) is under 25 of 40 sample points.
  - One corner will touch a wooden part of the house (0.65 studs). That is cosmetic.
  - Its street-side end will stick out 3.5 studs past the step's edge, 1.8 studs above the sand.
  - For comparison (measured), Villa 15's bench is at the same street position (z −981.00) and is not on its step at all: it hangs 1.8 studs above the sand along its whole length. So after the repair, Villa 10's bench will be better supported than the one at the correct villa.
  - It is not a functional obstruction:
    - It is 47 studs from the front doors, 59 from the house's own garage door, 11 from the garage building's door and 13 from the driveway.
    - It is not in front of any entrance; you walk around it.
    - On the step side it is only 0.85 studs high. At Villa 1 the character walked up pool steps of 1.0–1.3 studs.
  - It will be checked in Play (section 8, check 9).
- **My Home** (Phone › Maps) lands at (289.7, ~5, −983.0).
  - Computed with `PropertyServer`'s own maths.
  - Same spot relative to the house as at Villa 15; lowering the house does not change it.
- **Neighbours:** none are touched.
  - Villa 8 is 35.3 studs west.
  - Villas 16 and 4 are across the road (35.1 / 31.4 studs).
  - The empty for-sale lot's palm and parts are 45+ studs east.

## 3. Proposed changes (exact). Villa 10 only
| # | What | Before | After |
|---|---|---|---|
| 1 | The **47 house parts** in section 7 | positions in the table | **y − 7.57825**; x, z, rotation and size unchanged. Result: identical to Villa 15. |
| 2 | Villa 10 model `WorldPivot` | y 8.07826 | y 0.50001 (x/z/rotation unchanged) |
| 3 | **Dune** `Mountains` child #43, picked by position + size | (344.565, −15, −1060.26) | **(385, −15, −1148)**. Size and everything else unchanged. Clearances in section 4. |
| 4a | Terrain: raised pool water | 80 Water cells: x 324…364, y 8…16, z −1048…−1032 | Air (`ReplaceMaterial` Water → Air) |
| 4b | Terrain: thin ground under the pool | 40 Ground cells (12%): x 324…364, y 0…4, z −1048…−1032 | Air (`ReplaceMaterial` Ground → Air), then water in 4c |
| 4c | Terrain: pool water | none | `FillBlock` Water, centre (344.18, **4.035**, −1040.42), size (37.80, **2.75**, 12.60): from the pool floor (y 2.66) to **y 5.41** |

**Not touched:**
- The bench.
- The 22 garage/driveway parts, including the garage building's door.
- The lawn, roads, lamps, palms and the other 42 dunes.
- Every other villa, including Villa 1 and Villa 15.
- All scripts, and all terrain outside the boxes above.

## 4. Confirmations
**Dune #43: the first destination's overlap, and the new one**
- First proposal (375, −15, −1145): its sphere would have overlapped **dune #42** by **0.54 studs**.
  - Dune #42: `Mountains` child #42, Sandstone ball at (264.84, −15, −1200.33), radius 75.375.
  - The overlap is a thin lens around a circle of radius 5.61 centred at y −15. Its highest point is **y −9.39**, which is 9.4 studs **under** the ground (y 0).
  - So nothing would have been visible.
  - Both dunes are anchored, so there is no physics collision.
  - There is no terrain there.
  - It was still a real overlap, so I changed the destination.
- **Revised destination (385, −15, −1148).** That is 10 studs east and 3 south of the first proposal, and 96.6 studs from where it is now.

| Measure | Value |
|---|---|
| Gap to dune #42 (sphere surface to surface) | **7.25 studs**, no overlap |
| Gap to the next dunes | #41: 117.82, #40: 207.72, #39: 354.71. All 42 other dunes are clear. |
| Nearest other object | the lawn part (edge z −1095): **6.65 studs**. Next: Villa 10's own lawn strip, 43.6 studs. |
| Terrain inside or next to it | **0 cells** (no terrain there) |
| Footprint on the ground | x 338.9…431.1, z −1194.1…−1101.9. Top y 33.44. |

Like all 43 dunes, it sits partly inside the flat ground plate (`GroundTile`); that is how every dune is placed.

**Bench:** not moved. It is not a functional obstruction (section 2) and will be checked in Play.

**Garage building and its garage door:** completely untouched. None of the 22 garage-block parts is on the move list, including `Garage.Door_Garage` (the roll-up door at (393.62, 4.77, −979.51)). After the edit, a check confirms these 22 are bit-identical to the snapshot.

**House's own garage door:** `Door_Garage`, a direct child of the model at (305.483, 13.478, −997.942), **moves with the house** to y 5.900 (bottom 1.85), the same as Villa 15's. It is picked by exact path and position, so the same-named garage-building door cannot be picked by mistake.

**Pool repair = the proven Villa 1 method.** Same three operations, in the same order, with the same fill height:
1. Water → Air.
2. Ground → Air.
3. `FillBlock` from 2.66 to 5.41, centre y 4.035, height 2.75.

The checks are also the same: exact cell diff, view from above every 0.5 stud, swim in and out, deck lap, and side-by-side pictures with the twin villa. Only the coordinates differ.

**Villa 1 and Villa 15 stay unchanged.**
- Every operation is inside Villa 10's own area, plus the dune's new spot (x 338.9…431.1). Villa 1 is at x ≈ −560…−450 and Villa 15 at x ≈ 0…110.
- Villa 15 is only read, as a reference.
- To prove it, before editing I snapshot both villas' pool terrain and all parts. After editing, they must show 0 differences.

**The 160 terrain cells.** Measured cell by cell today, before any change:
- y 8–16: exactly 80 water cells in the 10 × 4 columns of x 324…364, z −1048…−1032. All the cells around them are air.
- y 4–8: all air.
- y 0–4: 40 thin-ground cells.

The three operations can only touch cells inside these boxes:
- The two `ReplaceMaterial` boxes sit exactly on the 4-stud grid.
- The `FillBlock` box (x 325.28…363.08, z −1046.72…−1034.12, y 2.66…5.41) reaches no other column, row or layer.

The 160 = 80 + 40 + 40 is therefore a count of measured cells, not an estimate. **After the edit, the exact diff must show these 160 cells with these changes and nothing else, or I restore.**

**Backup re-opened before any edit:** yes. See step 1 of section 5. No editing starts until the new backup has been opened in Studio and matched.

## 5. Backup plan
1. **File backup, re-opened before any edit:**
   1. Make a byte copy of the current save to `Downloads\DreamBuilders_backup_8Nov_before_villa10.rbxl`.
   2. Check the SHA-256 is the same (`6c804b239b6c…`) and the file structure (107 classes, 29,932 objects).
   3. **Open it in a second Roblox Studio window** (File › Open). Compare with the live place:
      - object counts in Workspace, ServerScriptService and ServerStorage
      - 65 scripts, 374,888 characters
      - Villa 10 still raised
      - Villa 1's pool repaired
   4. **Close it without saving.**
   5. If it does not open or does not match, stop.
2. **Copies inside the place:** clone the Villa 10 model and dune #43 into `ServerStorage.Phase1Backups.Fix8Nov_Villa10`, like the Villa 1 fix. This adds about 70 unused objects in ServerStorage.
3. **Snapshots in the open Studio session:**
   - all part positions
   - the terrain in x 280…440, y −16…40, z −1200…−940
   - Villa 1's pool area and Villa 15's pool area
4. **If any check fails:**
   - Write the terrain snapshot back.
   - Put the 47 parts, the pivot and the dune back to their recorded positions.
   - Confirm 0 differences, and **do not save**.
   - Last resort: reopen the file backup.
5. **After saving:** compare the saved file chunk by chunk with the backup.
   - Expected: only position/pivot data and `Terrain.SmoothGrid` differ.
   - Every script must be byte-identical.

## 6. Terrain boundaries
Full cell table: `evidence/2026-11-08_villa10_plan/villa10_40_cells.md`.
- The 40 cell columns cover x 324…364, z −1048…−1032. The pool water area (476.3 stud²) fits inside them.
- Of their 640 stud²: 476.3 is the water area, 128.2 is under the walls, and 35.5 is past the walls.
  - Garden side and west: 0.02 studs past the walls.
  - House side: 0.86 studs past.
  - East (steps) side: none.
- Everything past the walls will be under the deck (`Mansion_stone`, top y 2.48) after lowering.
  - **Correction (8 Nov, after testing): this was wrong.** On the house side, the water lies on top of the narrow deck path (up to 1.34 studs deep at the wall), and players get stuck at the corner. See `VILLA10_REPAIR_STATUS.md` section 3.
- **Expected fill:** ~34% (y 0–4) and ~35–36% (y 4–8) in all 40 columns. This uses the water-fill rule measured at Villas 1, 7, 8 and 15; it will be measured after the change.
- Villa 10 lines up with the grid better than Villa 1 did (35.5 stud² past the walls against 94.4), so less water should sit just outside the walls. That is a prediction, to be checked.

## 7. The 47 parts (before → after)
All positions are world coordinates. x, z, rotation and size do not change. Selected by measurement against Villa 15, not by name.

| Part (path inside the Villa 10 model) | Class | Position now (x, y, z) | New y |
|---|---|---|---|
| `Door_Bath` | MeshPart | (353.183, 25.178, −1016.122) | 17.600 |
| `Door_Bedroom` | MeshPart | (327.083, 25.178, −1016.122) | 17.600 |
| `Door_FrontL` | MeshPart | (319.433, 14.378, −992.722) | 6.800 |
| `Door_FrontR` | MeshPart | (322.133, 14.378, −992.722) | 6.800 |
| `Door_Garage` (house, **not** `Garage.Door_Garage`) | MeshPart | (305.483, 13.478, −997.942) | 5.900 |
| `Door_Study` | MeshPart | (336.983, 25.178, −1016.122) | 17.600 |
| `Mansion_bed` | MeshPart | (343.733, 17.146, −1020.622) | 9.568 |
| `Mansion_black` | MeshPart | (340.313, 20.071, −1012.567) | 12.493 |
| `Mansion_boucle` | MeshPart | (341.933, 11.588, −1010.628) | 4.010 |
| `Mansion_cream` | MeshPart | (339.683, 26.528, −1010.722) | 18.950 |
| `Mansion_curtain` | MeshPart | (346.883, 14.828, −993.667) | 7.250 |
| `Mansion_fabric` | MeshPart | (346.208, 17.776, −1010.857) | 10.198 |
| `Mansion_floor` | MeshPart | (339.683, 15.278, −1010.722) | 7.700 |
| `Mansion_flower` | MeshPart | (349.929, 14.693, −1011.712) | 7.115 |
| `Mansion_frame` | MeshPart | (346.883, 21.488, −1007.662) | 13.910 |
| `Mansion_glass` | MeshPart | (339.683, 20.318, −1007.595) | 12.740 |
| `Mansion_gold` | MeshPart | (336.713, 20.633, −1009.508) | 13.055 |
| `Mansion_grass` | MeshPart | (339.683, 9.518, −1057.772) | 1.940 |
| `Mansion_kitchen` | MeshPart | (334.058, 16.696, −1023.142) | 9.118 |
| `Mansion_leaf` | MeshPart | (340.403, 32.468, −1017.922) | 24.890 |
| `Mansion_led` | MeshPart | (339.593, 20.386, −1009.125) | 12.808 |
| `Mansion_light` | MeshPart | (345.983, 20.611, −1005.772) | 13.033 |
| `Mansion_marble` | MeshPart | (340.673, 16.921, −1023.097) | 9.343 |
| `Mansion_oak` | MeshPart | (331.853, 16.696, −1010.812) | 9.118 |
| `Mansion_olive` | MeshPart | (339.537, 15.080, −1011.029) | 7.502 |
| `Mansion_planter` | MeshPart | (339.458, 10.958, −1011.172) | 3.380 |
| `Mansion_plaster` | MeshPart | (332.708, 20.678, −1010.722) | 13.100 |
| `Mansion_pool` | MeshPart | (345.533, 16.381, −1034.797) | 8.803 |
| `Mansion_rug` | MeshPart | (339.008, 15.373, −1001.272) | 7.795 |
| `Mansion_slab` | MeshPart | (333.383, 26.258, −1008.922) | 18.680 |
| `Mansion_stone` | MeshPart | (339.683, 9.068, −1017.922) | 1.490 |
| `Mansion_tile` | MeshPart | (357.683, 21.151, −1022.422) | 13.573 |
| `Mansion_travertine` | MeshPart | (339.683, 20.678, −1010.137) | 13.100 |
| `Mansion_walnut` | MeshPart | (339.638, 20.633, −1010.385) | 13.055 |
| `Mansion_wood` | MeshPart | (339.265, 21.128, −1017.922) | 13.550 |
| `PoolRaised.Coping_E` | Part | (363.713, 11.768, −1040.422) | 4.190 |
| `PoolRaised.Coping_N` | Part | (344.183, 11.768, −1047.353) | 4.190 |
| `PoolRaised.Coping_S` | Part | (344.183, 11.768, −1033.492) | 4.190 |
| `PoolRaised.Coping_W` | Part | (324.652, 11.768, −1040.422) | 4.190 |
| `PoolRaised.PoolFloor` | Part | (344.183, 10.148, −1040.422) | 2.570 |
| `PoolRaised.PoolLight` | Part | (331.583, 10.958, −1046.587) | 3.380 |
| `PoolRaised.PoolLight` | Part | (344.183, 10.958, −1046.587) | 3.380 |
| `PoolRaised.PoolLight` | Part | (356.783, 10.958, −1046.587) | 3.380 |
| `PoolRaised.StepIn1` | Part | (362.183, 11.078, −1040.422) | 3.500 |
| `PoolRaised.StepIn2` | Part | (360.383, 10.568, −1040.422) | 2.990 |
| `PoolRaised.StepOut1` | Part | (366.143, 10.568, −1040.422) | 2.990 |
| `PoolRaised.StepOut2` | Part | (364.343, 11.078, −1040.422) | 3.500 |

## 8. Checks and Play-test checklist
**Save only if every item passes.** If anything fails: restore (section 5) and do not save.

**Edit-mode checks (before Play)**
1. Terrain diff against the snapshot: **exactly the 160 planned cells** with the planned changes.
2. Parts: exactly the 47 house parts and dune #43 moved. The 22 garage-block parts and the bench are bit-identical.
3. The 47 parts compared with Villa 15: 69/69 identical.
4. The dune at (385, −15, −1148) touches no part, no other dune and no terrain.
5. Villa 1's and Villa 15's pool terrain: 0 cells different. Their parts: unchanged.
6. The view from above around Villa 10's pool, every 0.5 stud:
   - no holes, and no bare ground lower than before by more than a hair
   - water outside the walls no higher and no farther out than at Villa 15

**Play checks** (Studio Play, 1 player; test money in Play only)

| # | Test | Pass if |
|---|---|---|
| 1 | Start Play; Output | no new errors |
| 2 | Buy Villa 10 in Phone › Property | −$25,000; sign "crrusher14's Villa" |
| 3 | Phone › Maps › My Home | lands on the ground near (289.7, −983.0) |
| 4 | Walk from there and from the street to the front door | no step too high; door bottom 1.85 |
| 5 | Press E at the front door | opens for the owner |
| 6 | Walk inside, through the ground floor (and upstairs, where Villa 15 allows) | walkable, same floor heights as Villa 15 |
| 7 | House garage door (`Door_Garage`) | at ground level (bottom 1.85) |
| 8 | Garage building | roll-up door opens for the owner; driveway drivable to the road |
| 9 | Walk along the front of the house past the bench (both the terrace side and the street side) | bench is not in the way of the doors, garage or driveway; you can walk around it. The 0.65-stud corner touching the house is known and cosmetic: not a failure. |
| 10 | Pool water | level ~5.4 like Villa 15; no floating water anywhere |
| 11 | Walk in over the steps, swim, climb out over the steps | Swimming in the pool, Running on the deck afterwards |
| 12 | Lap on the deck next to the pool walls | deck-swim no worse than Villa 15 (23% on 8 Nov) |
| 13 | Back yard where the dune was | open lawn like Villa 15's; nothing floating, no holes |
| 14 | Dune at its new spot | sits in the sand; blocks no path, lot or road |
| 15 | Neighbours: Villa 8, Villas 16 and 4, the empty lot | unchanged |
| 16 | Villa 1 quick check | pool water still there; swim in and out still works |
| 17 | Output at the end | 0 errors (known car-texture warnings only) |
| 18 | Screenshots of Villa 10 next to Villa 15 in Edit mode (same lighting): street, back/pool, top-down | match |

## 9. Order of work after approval
1. File backup → verify → **re-open in Studio and match** → close without saving.
2. In-place copies and snapshots (Villa 10, Villa 1, Villa 15).
3. Lower the 47 parts and the pivot.
4. Move the dune.
5. Terrain 4a–4c.
6. Edit checks.
7. Play tests.
8. **Save only if everything passes.**
9. Verify the saved file.
10. Push the report to GitHub.
11. **Stop before Villa 6.**

## 10. Evidence
`evidence/2026-11-08_villa10_plan/`:
- `villa10_now_vs_villa15.jpg`
- `villa10_plan_map.png` (updated for revision 2)
- `villa10_40_cells.md`
- `villa10_street_now.jpg`, `villa10_back_pool_dune_now.jpg`, `villa10_topdown_now.jpg`, `ref_villa15_*.jpg`
