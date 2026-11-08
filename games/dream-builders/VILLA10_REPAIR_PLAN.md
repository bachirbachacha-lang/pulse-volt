# Villa 10 (Villa_PalmHills_10_Pearl): updated repair plan
8 Nov 2026, 16:55–17:45 Riyadh, by Claude.

**READ-ONLY. Nothing in the game was changed or saved.** Every number was measured in Studio Edit mode. "After" values are calculations (simulated), not real moves. **Waiting for the owner's approval.**

This replaces "Plan 1" in `VILLA_6_10_REPAIR_PLAN.md`. It uses what the Villa 1 pool repair taught us (`PLAN0_VILLA1_POOL_STATUS.md`):
- Fill pool water to **y 5.41**. 5.90 overflowed the walls.
- First turn the thin **ground layer under the pool (y 0–4) into air**, because a water fill does not replace ground.
- Check every terrain cell before and after, and expect a small water film along the outside of the pool walls, like at the correct villas.

## 0. Starting point (checked)
- Saved place `Downloads\DreamBuilders.rbxl`: 4,593,098 bytes, SHA-256 `6c804b239b6c…`, saved 16:42. It includes the Villa 1 pool repair.
- The open place still equals that save: Villa 1's 176 repaired cells are in place, and no parts have changed.
- Nothing in this plan touches Villa 1, the Phase A fixes (ScreenFade, shop signs, rent board, Hire = F) or any script.

## 1. What is wrong with Villa 10 (re-measured today)
| Item | Measured |
|---|---|
| House | **47 parts are exactly 7.57825 studs too high.** Villa 15 is the same Pearl design and is correct. Both have 69 parts, and in each villa's garage frame 22 parts match exactly. The other 47 sit exactly 7.57825 higher (min = max), with the same x/z (to 0.0001), rotation and size. |
| Model pivot | y 8.07826. It should be 0.50001 (same offset). |
| Entrance | The front doors' bottom is at y 9.43; Villa 15's is 1.85. The front terrace (top y 10.06) is **7.6 studs above the ground** in front of it, too high to walk or jump onto. |
| Pool | It is raised with the house. Its water is **80 terrain cells at y 8–16** (44% / 25% full), filled to y 13.0, which is the right level for the raised pool (5.42 + 7.58). |
| Under the pool (where it will go) | The same thin layer Villa 1 had: **40 cells Ground 12% at y 0–4**, Air at y 4–8, solid Ground 89% below y 0. |
| Sand dune | **`Mountains` child #43**: Sandstone ball "Part" at (344.565, −15, −1060.26), radius 48.44, top y 33.44. **39 villa parts are inside it**, up to 24.9 studs deep. Lowering the house without moving it would make that 32.3. The only other thing it touches is the long lawn part under it. Nothing is buried in it, and no other dune touches it. |

## 2. Also checked (no problem, or nothing to change)
- **Garage, driveway, road:** the 22 garage-block parts are already correct and stay as they are.
  - They are: floor, walls, roof, roll-up door `Garage.Door_Garage`, CarSpot, 2 lamps, 7 driveway slabs and the ramp.
  - The driveway runs from the garage door (z −979.5) to the Palm Hills road (`Roads.Part`, top y 0.62) at z −946.5, at the same heights as Villa 15's.
- **Name trap:** the house's own garage door `Door_Garage` (moves) has the same name as the garage building's `Garage.Door_Garage` (must not move). Parts are picked by **exact path and position**, never by name.
- **Ground under and around the house** (compared with Villa 15 at 3,700+ spots):
  - Back lawn: identical.
  - Under the pool: different. This is the thin ground layer that this plan fixes.
  - Front edge: the terrain strip ends at the same world z (−989) at both villas, so at Villa 10 it reaches 1.7 studs closer to the house. This is how the grid lines up; it already exists and isn't changed.
  - A strip beside the garage is 0.2–0.5 higher. Already there; not changed.
- **After lowering, the ground pokes above low part edges** (front step, lawn strip) at 1,329 spots, by up to 0.62 studs. Villa 15 does the same at 1,317 spots, up to 0.62. That is normal for this design.
- **Objects the lowered house would touch:** only the **Fabric bench** by the front corner, `DreamBuilders.PalmHills` part at (371.46, 2.25, −981.00), size 3.6 × 0.9 × 9.
  - Once the house is lowered, its house-side corner would sit **0.65 studs inside a wooden part of the house**.
  - Moving the bench 1 stud toward the road clears it. That is optional step 5.
  - Villa 15's bench is in a different spot, so nothing to copy there.
- **My Home** (Phone › Maps) lands at (289.7, ~5, −983.0) on the ground west of the house.
  - Computed with the same maths as `PropertyServer`.
  - It is the same spot relative to the house as at Villa 15 and Villa 1, and lowering the house does not change it.
- **Neighbours:** none are touched.
  - Villa 8 is 35.3 studs west.
  - Villas 16 and 4 are across the road (35.1 / 31.4 studs).
  - The empty for-sale lot's palm and parts are 45+ studs east.

## 3. Proposed changes (exact). Villa 10 only
| # | What | Before | After |
|---|---|---|---|
| 1 | The **47 house parts** listed in section 6 | positions in the table | **y − 7.57825**; x, z, rotation and size unchanged. Result: identical to Villa 15. |
| 2 | Villa 10 model `WorldPivot` | y 8.07826 | y 0.50001 (x/z/rotation unchanged) |
| 3 | **Dune** `Mountains` child #43, picked by position + size | (344.565, −15, −1060.26) | **(375, −15, −1145)**. Size and everything else unchanged. |
| 4a | Terrain: the raised pool water | 80 Water cells: x 324…364, y 8…16, z −1048…−1032 | Air (`ReplaceMaterial` Water → Air) |
| 4b | Terrain: **the thin ground layer under the pool** (the step learned from Villa 1) | 40 Ground cells (12%): x 324…364, y 0…4, z −1048…−1032 | Air (`ReplaceMaterial` Ground → Air), then water in 4c |
| 4c | Terrain: pool water | none | `FillBlock` Water, centre (344.18, **4.035**, −1040.42), size (37.80, **2.75**, 12.60): from the pool floor (y 2.66) to **y 5.41** |
| 5 *(optional)* | Fabric bench (`PalmHills`) | (371.46, 2.25, −981.00) | (371.46, 2.25, **−980.00**), 1 stud toward the road |

**Expected terrain result:** exactly **160 changed cells**, all inside the boxes above. Anything else means restore.

| Box | Change | Cells |
|---|---|---|
| y 8–16 | Water → Air | 80 |
| y 0–4 | Ground → Water | 40 (~34% full) |
| y 4–8 | Air → Water | 40 (~35–36% full) |

**Not touched:**
- The 22 garage/driveway parts
- The lawn, roads, lamps, palms and other dunes
- Every other villa, including Villa 1
- All scripts, and the terrain outside the boxes

## 4. Terrain boundaries
Full cell table: `evidence/2026-11-08_villa10_plan/villa10_40_cells.md`.
- The 40 cell columns cover x 324…364, z −1048…−1032. The pool water area (476.3 stud²) fits inside them.
- Of their 640 stud²: 476.3 is the water area, 128.2 is under the walls, and 35.5 is past the walls.
  - Garden side and west: 0.02 studs past the walls.
  - House side: 0.86 studs past.
  - East (steps) side: none.
- Everything past the walls will be under the deck (`Mansion_stone`, top y 2.48) after lowering.
- **Villa 10 lines up with the grid better than Villa 1 did** (35.5 stud² past the walls against 94.4). So I expect less water just outside the walls. That is a prediction, to be checked.
- Predicted fill: ~34% (y 0–4) and ~35–36% (y 4–8) in all 40 columns. There are no "trace" cells this time: every edge column is at least 47% inside the pool.

## 5. Backup plan
1. **File backup first**, before any change.
   - Byte copy of the current save to `Downloads\DreamBuilders_backup_8Nov_before_villa10.rbxl`.
   - Check the same SHA-256 (`6c804b239b6c…`), the structure check, and same object counts.
   - The older backups stay untouched.
2. **Copies inside the place**, like the Villa 1 fix: clone the Villa 10 model and dune #43 into `ServerStorage.Phase1Backups.Fix8Nov_Villa10`. This adds about 70 objects that sit unused in ServerStorage.
3. **Snapshots in the open Studio session:**
   - Every part's position (the existing snapshot tool).
   - The terrain in x 280…440, y −16…40, z −1200…−940.
   - Villa 1's pool area, so I can prove it doesn't change.
4. **If any check fails:**
   - Write the terrain snapshot back.
   - Put the 47 parts, the pivot, the dune (and the bench) back to their recorded positions.
   - Confirm 0 differences, and **do not save**.
   - Last resort: reopen the file backup.
5. **After saving:** compare the saved file chunk by chunk with the backup.
   - Expected: only position/pivot data and `Terrain.SmoothGrid` differ.
   - Every script must be byte-identical.

## 6. The 47 parts (before → after)
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

## 7. Play-test checklist
Done in Studio Play mode with 1 player. Test money is added in Play only. **Save only if every item passes.**

**Edit-mode checks before Play**
1. Terrain diff against the snapshot: exactly the 160 planned cells.
2. Parts: only the 47 parts (and the bench, if approved) changed.
3. The 47 parts compared with Villa 15: 69/69 identical.
4. The dune at its new spot touches nothing.
5. Villa 1's pool area: 0 cells different.
6. The view from above around the pool every 0.5 stud: no holes, and no bare ground lower than before by more than a hair.
7. Water outside the walls no higher and no farther out than at Villa 15.

**Play checks**

| # | Test | Pass if |
|---|---|---|
| 1 | Start Play; Output | no new errors |
| 2 | Buy Villa 10 in Phone › Property (test money) | −$25,000; sign "crrusher14's Villa" |
| 3 | Phone › Maps › My Home | lands on the ground near (289.7, −983.0), not on or inside anything |
| 4 | Walk from there and from the street to the front door | no step too high; door bottom 1.85 |
| 5 | Press E at the front door | opens for the owner |
| 6 | Walk inside, through the ground floor (and upstairs, where Villa 15 allows) | walkable, same floor heights as Villa 15 |
| 7 | House garage door (`Door_Garage`) | at ground level (bottom 1.85) |
| 8 | Garage building | roll-up door opens for the owner; driveway to the road drivable |
| 9 | Pool water | level ~5.4 like Villa 15; no floating water anywhere |
| 10 | Walk in over the steps, swim, climb out over the steps | Swimming in the pool, Running on the deck afterwards |
| 11 | Lap on the deck next to the pool walls | deck-swim no worse than Villa 15 (23% on 8 Nov) |
| 12 | Back yard where the dune was | open lawn like Villa 15's; nothing floating, no holes |
| 13 | Dune at its new spot | sits in the sand; blocks no path, lot or road |
| 14 | Bench (if moved) | not inside the house |
| 15 | Neighbours: Villa 8, Villas 16 and 4, the empty lot | unchanged |
| 16 | Villa 1 quick check | pool water still there; swim in and out still works |
| 17 | Output at the end | 0 errors (known car-texture warnings only) |
| 18 | Screenshots of Villa 10 next to Villa 15 in Edit mode (same lighting): street, back/pool, top-down | match |

## 8. Order of work after approval
1. File backup, then verify it.
2. In-place copies and snapshots.
3. Lower the 47 parts and the pivot.
4. Move the dune.
5. Terrain steps 4a–4c.
6. (Bench.)
7. Edit checks.
8. Play tests.
9. **Save only if everything passes.**
10. Verify the saved file.
11. Push the report to GitHub.
12. **Stop before Villa 6.**

## 9. Evidence
`evidence/2026-11-08_villa10_plan/`:
- `villa10_now_vs_villa15.jpg`: street and back, Villa 10 now next to Villa 15
- `villa10_plan_map.png`: map and side view of the plan
- `villa10_40_cells.md`: the cell table
- The single screenshots: `villa10_street_now.jpg`, `villa10_back_pool_dune_now.jpg`, `villa10_topdown_now.jpg`, `ref_villa15_*.jpg`
