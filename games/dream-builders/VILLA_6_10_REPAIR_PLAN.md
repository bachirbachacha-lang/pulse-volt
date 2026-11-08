# Villa 6 and Villa 10: inspection and repair plan (NOTHING CHANGED YET)
8 Nov 2026, 03:23–03:50 Riyadh, by Claude. This was a read-only inspection in Studio Edit mode: no objects, scripts or terrain were changed. Every "after" number below comes from a simulated move (a calculation), not a real one.
**Waiting for the owner's approval before any change.**

## 0. Check of the work already done
| Item | Result |
|---|---|
| Saved place `Downloads\DreamBuilders.rbxl` | Unchanged since the 03:16 save: 4,593,103 bytes, SHA-256 `d97a010d8830…`. The saved scripts contain all 3 script fixes (ScreenFade, signs + rent board, Hire = F). Repo copies are identical to the saved scripts. |
| Villa 1 and dune fix in the place | Villa 1 Mansion_stone y = 1.49, pivot y = 0.50; dune at (−740, −15, −1040); backup folder `ServerStorage.Phase1Backups.Fix8Nov_BuriedVilla` present (84 objects) |
| Backup `DreamBuilders_backup_8Nov_before_bugfixes.rbxl` | Intact: 4,591,173 bytes, SHA-256 `53ec36329584…` (same as when it was made; it was opened in Studio earlier and matched) |
| Backup `DreamBuilders_backup_8Nov_before_phaseA.rbxl` | Intact: 4,591,091 bytes, SHA-256 `ac6fa0a9c872…` |
| `BUGFIX_REPORT_2026-11-08.md` and its 9 screenshots | On GitHub (branch `claude/shopify-product-website-mrj6f2`) |

## 1. NEW PROBLEM: Villa 1's pool water was left floating (caused by my Fix 1)
I found this during this inspection.
- Each villa's pool water is **terrain water**, not a part, so it did not move when I lowered Villa 1's house.
- Now Villa 1's pool (parts at y 2.0–5.9) is **empty**: its basin holds only 44 ground cells.
- Its water (88 cells) is still floating in the air at **y 20–28** over the pool's x/z area (x −532…−488, z −1044…−1028).
- Correct villas (7, 11, 15) have their water at y 0–8 inside the pool.
- Screenshot: `evidence/2026-11-08_villa_inspection/villa1_pool_water_floating_REGRESSION.jpg`
- My Play test of Fix 1 did not include the pool, so I missed this. It is not fixed yet; the repair is Plan 0 below.

## 2. Villa_PalmHills_6_Classic: measurements
| Measure | Value |
|---|---|
| House (Mansion_stone) | (624.68, **33.04**, −1020.00), 75.6 × 2 × 75.6 |
| Garage (CarSpot) | (570.88, 1.87, −995.98). The garage block (house garage building + driveway) is centred at (570.9, 5.7, −978.0), 22.0 × 11.9 × 58.9. |
| Model pivot | (738.68, 32.05, −846.00) |
| Elevation difference | The house is **31.55 studs** too high. Terrace top y 34.04, compared with 2.50 at correct villas. Its pool water (88 terrain cells) floats at y 32–40. |
| Affected parts | **47**: 6 doors, 29 Mansion parts, 12 PoolRaised parts (list below). The other 22 parts (garage, driveway, lamps, CarSpot) are at the correct height. |
| Compared with correct Classic villas 11 and 16 | Those two are identical to each other (69/69 parts). Villa 6 matches them except the same 47 parts, all shifted by exactly the same amount. No rotation, no size changes. |
| Dunes | None touch Villa 6, now or after the repair |

**Where Villa 6's house belongs (important)**
- South-row houses sit on a regular grid about 142.5 studs apart: x −515, (empty lot −373), −230, −88, 49, 197, 340, (empty lot 482), **625**.
- Villa 6's house at x 624.7 is **on its correct grid spot**.
- Every other south-row villa has its garage 53.9 studs **east** of the house. Villa 6's garage is 53.8 studs **west**.
- The east-side spot would sit on the **Port Road and its sidewalk** (checked), so the garage was most likely put on the west side on purpose.
- So the house's x/z is right. **Only its height is wrong.**
- (A "move the house back next to the garage" option was also checked. It would push the house onto the empty for-sale lot and a palm, so it is not recommended.)

**Why it is raised:** not recorded in the project docs. Unknown.

## 3. Villa_PalmHills_10_Pearl: measurements
| Measure | Value |
|---|---|
| House (Mansion_stone) | (339.68, **9.07**, −1017.92) |
| Garage (CarSpot) | (393.62, 1.87, −993.91), 53.9 studs east of the house, the same as other south-row villas |
| Model pivot | (453.68, 8.08, −843.92) |
| Terrace height | Terrace top **y 10.06** (correct villas 2.50). Front doors' bottom y 9.43 (correct 1.85–1.90). From the ground in front of the door (y 0.00) that is a **10-stud step with no stairs**, more than a default jump (about 7.2 studs). So the house can't be entered on foot. |
| Affected parts | **47**, the same set as Villa 6, all exactly **7.578 studs** too high. The 22 garage/driveway parts are correct. Pool water (80 cells) is raised to y 8–16. |
| Compared with correct Pearl villas 15 and 5 | Those two are identical to each other (69/69). Villa 10 matches them except the 47 raised parts. Pure vertical shift, no x/z change, no size changes. |
| Dune overlap | `Workspace.DreamBuilders.Mountains` **child #43**: a Sandstone ball named "Part" at (344.6, −15.0, −1060.3), Size (257.28, 96.87, 269.61), so it is a sphere of radius 48.44. It cuts into the back of the villa (pool side): **39 villa parts are inside it, up to 24.9 studs deep**. If the house were only lowered, it would sink further in (32.3 studs deep), so the dune must move too. |
| Other objects | A Fabric bench at (371.5, 2.2, −981.0) and a Neon light at (375.0, 15.8, −1009.8) touch the house's bounding box. They sit in the same place relative to the house as at correct villas, so no change is needed. |

## 4. Repair plans (for approval)
All plans follow the same pattern as the tested Villa 1 fix, plus the pool-water step that Fix 1 missed.
1. Make and verify a fresh backup of the place.
2. Copy each villa (and the dune, for Villa 10) into `ServerStorage.Phase1Backups` first.
3. Make the change.
4. Run the checks, then a Play test, then check Output.

### Plan 0: Villa 1 pool water (repairs my regression)
> **Done 8 Nov 16:42 with a corrected method** (see `PLAN0_VILLA1_POOL_STATUS.md`):
> - Fill to y **5.41**, not 5.90. 5.90 overflowed the walls.
> - First turn the old thin ground layer at y 0–4 into air. A water fill does not replace ground.
>
> Plans 1 and 2 below still show the old water steps, and need the same correction before use.
1. `Terrain:ReplaceMaterial` Water → Air, only inside x −532…−488, y 20…28, z −1044…−1028. Only the 88 floating water cells are there (checked: no other material in that box).
2. `Terrain:FillBlock` Water: centre (−510.82, 4.28, −1035.75), size (37.80, 3.24, 12.60). This is the inside of the pool: from the pool floor top (y 2.66) to the coping top (y 5.90). The correct villas' water occupies exactly this box's voxels.
3. Test: no water above y 8 there; the pool has water; walking into the pool gives the "Swimming" state.

### Plan 1: Villa_PalmHills_10_Pearl
1. Lower the **47 parts** listed below by **7.578 studs** (y only; x/z unchanged). This makes Villa 10 identical to Villa 15.
2. Model WorldPivot: (453.68, 8.08, −843.92) → y **0.50**.
3. Move **Mountains child #43** from (344.6, −15.0, −1060.3) to **(375, −15, −1145)**.
   - That is a 90-stud move into open sand: no object within 40 studs, off the lawn (the lawn edge is z −1094), overlapping another dune by only 1 stud.
   - After the repair (simulated), **0** dunes touch Villa 10.
4. Pool water:
   - `ReplaceMaterial` Water → Air in x 324…364, y 8…16, z −1048…−1032 (80 cells, only water there).
   - Then `FillBlock` Water at centre (344.18, 4.28, −1040.42), size (37.80, 3.24, 12.60).
5. Not touched: garage, driveway, lamps, lawn, other dunes, other villas.
6. Tests in Play:
   - buy it (test money)
   - My Home lands on the ground
   - walk in the front door
   - garage rolls up
   - walk inside
   - swim in the pool
   - Output

### Plan 2: Villa_PalmHills_6_Classic
1. Lower the **47 parts** listed below by **31.550 studs** (y only; x/z unchanged). The house stays on its plot.
2. Model WorldPivot: (738.68, 32.05, −846.00) → y **0.50**.
3. Pool water:
   - `ReplaceMaterial` Water → Air in x 608…652, y 32…40, z −1052…−1036 (88 cells, only water there).
   - Then `FillBlock` Water at centre (629.18, 4.28, −1042.50), size (37.80, 3.24, 12.60).
4. Simulated result:
   - No dunes and no solid objects in the way. The only things touching its bounding box are Villa 6's own yard bench and light, at standard positions.
   - The house will stand 0.5 studs east of its garage, with no overlap.
   - Terrain under it is plain Ground, the same as other villas.
5. Not touched: the garage and driveway (kept on the west side, away from the Port Road), the empty for-sale lot, its sign and palms, the Port Road.
6. Tests in Play: same list as Villa 10, plus walking from the street to the front door past the garage.

**Order I suggest:** Plan 0, then Plan 1, then Plan 2. Each one separate, tested, and Output checked.

**Files and objects that would change:**
- Villa 1, 6 and 10 models (heights only)
- One dune (Mountains child #43)
- Terrain water at the 3 pools
- New backup copies in `ServerStorage.Phase1Backups`
- No scripts

## 5. Evidence
`evidence/2026-11-08_villa_inspection/`:
- `villa6_street_now.jpg` (house floating above its garage)
- `villa6_topdown_now.jpg` (Port Road on its east side; empty for-sale lot to the west)
- `villa10_street_now.jpg` (raised terrace with no steps)
- `villa10_topdown_now.jpg` (dune #43 over the back yard and pool)
- `villa1_pool_water_floating_REGRESSION.jpg` (my regression)

## 6. Exact parts that would move

### Villa_PalmHills_10_Pearl: 47 parts, each down 7.578 studs

| Part (inside the villa model) | Position now (x, y, z) | New y (x and z unchanged) |
|---|---|---|
| `Door_Bath` | (353.18, 25.18, -1016.12) | 17.60 |
| `Door_Bedroom` | (327.08, 25.18, -1016.12) | 17.60 |
| `Door_FrontL` | (319.43, 14.38, -992.72) | 6.80 |
| `Door_FrontR` | (322.13, 14.38, -992.72) | 6.80 |
| `Door_Garage` | (305.48, 13.48, -997.94) | 5.90 |
| `Door_Study` | (336.98, 25.18, -1016.12) | 17.60 |
| `Mansion_bed` | (343.73, 17.15, -1020.62) | 9.57 |
| `Mansion_black` | (340.31, 20.07, -1012.57) | 12.49 |
| `Mansion_boucle` | (341.93, 11.59, -1010.63) | 4.01 |
| `Mansion_cream` | (339.68, 26.53, -1010.72) | 18.95 |
| `Mansion_curtain` | (346.88, 14.83, -993.67) | 7.25 |
| `Mansion_fabric` | (346.21, 17.78, -1010.86) | 10.20 |
| `Mansion_floor` | (339.68, 15.28, -1010.72) | 7.70 |
| `Mansion_flower` | (349.93, 14.69, -1011.71) | 7.12 |
| `Mansion_frame` | (346.88, 21.49, -1007.66) | 13.91 |
| `Mansion_glass` | (339.68, 20.32, -1007.60) | 12.74 |
| `Mansion_gold` | (336.71, 20.63, -1009.51) | 13.05 |
| `Mansion_grass` | (339.68, 9.52, -1057.77) | 1.94 |
| `Mansion_kitchen` | (334.06, 16.70, -1023.14) | 9.12 |
| `Mansion_leaf` | (340.40, 32.47, -1017.92) | 24.89 |
| `Mansion_led` | (339.59, 20.39, -1009.12) | 12.81 |
| `Mansion_light` | (345.98, 20.61, -1005.77) | 13.03 |
| `Mansion_marble` | (340.67, 16.92, -1023.10) | 9.34 |
| `Mansion_oak` | (331.85, 16.70, -1010.81) | 9.12 |
| `Mansion_olive` | (339.54, 15.08, -1011.03) | 7.50 |
| `Mansion_planter` | (339.46, 10.96, -1011.17) | 3.38 |
| `Mansion_plaster` | (332.71, 20.68, -1010.72) | 13.10 |
| `Mansion_pool` | (345.53, 16.38, -1034.80) | 8.80 |
| `Mansion_rug` | (339.01, 15.37, -1001.27) | 7.79 |
| `Mansion_slab` | (333.38, 26.26, -1008.92) | 18.68 |
| `Mansion_stone` | (339.68, 9.07, -1017.92) | 1.49 |
| `Mansion_tile` | (357.68, 21.15, -1022.42) | 13.57 |
| `Mansion_travertine` | (339.68, 20.68, -1010.14) | 13.10 |
| `Mansion_walnut` | (339.64, 20.63, -1010.38) | 13.05 |
| `Mansion_wood` | (339.26, 21.13, -1017.92) | 13.55 |
| `PoolRaised.Coping_E` | (363.71, 11.77, -1040.42) | 4.19 |
| `PoolRaised.Coping_N` | (344.18, 11.77, -1047.35) | 4.19 |
| `PoolRaised.Coping_S` | (344.18, 11.77, -1033.49) | 4.19 |
| `PoolRaised.Coping_W` | (324.65, 11.77, -1040.42) | 4.19 |
| `PoolRaised.PoolFloor` | (344.18, 10.15, -1040.42) | 2.57 |
| `PoolRaised.PoolLight#2` | (344.18, 10.96, -1046.59) | 3.38 |
| `PoolRaised.PoolLight#3` | (356.78, 10.96, -1046.59) | 3.38 |
| `PoolRaised.PoolLight` | (331.58, 10.96, -1046.59) | 3.38 |
| `PoolRaised.StepIn1` | (362.18, 11.08, -1040.42) | 3.50 |
| `PoolRaised.StepIn2` | (360.38, 10.57, -1040.42) | 2.99 |
| `PoolRaised.StepOut1` | (366.14, 10.57, -1040.42) | 2.99 |
| `PoolRaised.StepOut2` | (364.34, 11.08, -1040.42) | 3.50 |

### Villa_PalmHills_6_Classic: 47 parts, each down 31.550 studs

| Part (inside the villa model) | Position now (x, y, z) | New y (x and z unchanged) |
|---|---|---|
| `Door_Bath` | (638.18, 49.15, -1018.20) | 17.60 |
| `Door_Bedroom` | (612.08, 49.15, -1018.20) | 17.60 |
| `Door_FrontL` | (604.43, 38.35, -994.80) | 6.80 |
| `Door_FrontR` | (607.13, 38.35, -994.80) | 6.80 |
| `Door_Garage` | (590.48, 37.45, -1000.02) | 5.90 |
| `Door_Study` | (621.98, 49.15, -1018.20) | 17.60 |
| `Mansion_bed` | (628.73, 41.12, -1022.70) | 9.57 |
| `Mansion_black` | (625.31, 44.04, -1014.64) | 12.49 |
| `Mansion_boucle` | (626.93, 35.56, -1012.71) | 4.01 |
| `Mansion_cream` | (624.68, 50.50, -1012.80) | 18.95 |
| `Mansion_curtain` | (631.88, 38.80, -995.75) | 7.25 |
| `Mansion_fabric` | (631.21, 41.75, -1012.93) | 10.20 |
| `Mansion_floor` | (624.68, 39.25, -1012.80) | 7.70 |
| `Mansion_flower` | (634.93, 38.66, -1013.79) | 7.12 |
| `Mansion_frame` | (631.88, 45.46, -1009.74) | 13.91 |
| `Mansion_glass` | (624.68, 44.29, -1009.67) | 12.74 |
| `Mansion_gold` | (621.71, 44.60, -1011.59) | 13.05 |
| `Mansion_grass` | (624.68, 33.49, -1059.85) | 1.94 |
| `Mansion_kitchen` | (619.06, 40.67, -1025.22) | 9.12 |
| `Mansion_leaf` | (625.40, 56.44, -1020.00) | 24.89 |
| `Mansion_led` | (624.59, 44.36, -1011.20) | 12.81 |
| `Mansion_light` | (630.98, 44.58, -1007.85) | 13.03 |
| `Mansion_marble` | (625.67, 40.89, -1025.17) | 9.34 |
| `Mansion_oak` | (616.85, 40.67, -1012.89) | 9.12 |
| `Mansion_olive` | (624.54, 39.05, -1013.11) | 7.50 |
| `Mansion_planter` | (624.46, 34.93, -1013.25) | 3.38 |
| `Mansion_plaster` | (617.71, 44.65, -1012.80) | 13.10 |
| `Mansion_pool` | (630.53, 40.35, -1036.88) | 8.80 |
| `Mansion_rug` | (624.01, 39.34, -1003.35) | 7.79 |
| `Mansion_slab` | (618.38, 50.23, -1011.00) | 18.68 |
| `Mansion_stone` | (624.68, 33.04, -1020.00) | 1.49 |
| `Mansion_tile` | (642.68, 45.12, -1024.50) | 13.57 |
| `Mansion_travertine` | (624.68, 44.65, -1012.22) | 13.10 |
| `Mansion_walnut` | (624.64, 44.60, -1012.46) | 13.05 |
| `Mansion_wood` | (624.26, 45.10, -1020.00) | 13.55 |
| `PoolRaised.Coping_E` | (648.71, 35.74, -1042.50) | 4.19 |
| `PoolRaised.Coping_N` | (629.18, 35.74, -1049.43) | 4.19 |
| `PoolRaised.Coping_S` | (629.18, 35.74, -1035.57) | 4.19 |
| `PoolRaised.Coping_W` | (609.65, 35.74, -1042.50) | 4.19 |
| `PoolRaised.PoolFloor` | (629.18, 34.12, -1042.50) | 2.57 |
| `PoolRaised.PoolLight#2` | (629.18, 34.93, -1048.66) | 3.38 |
| `PoolRaised.PoolLight#3` | (641.78, 34.93, -1048.66) | 3.38 |
| `PoolRaised.PoolLight` | (616.58, 34.93, -1048.66) | 3.38 |
| `PoolRaised.StepIn1` | (647.18, 35.05, -1042.50) | 3.50 |
| `PoolRaised.StepIn2` | (645.38, 34.54, -1042.50) | 2.99 |
| `PoolRaised.StepOut1` | (651.14, 34.54, -1042.50) | 2.99 |
| `PoolRaised.StepOut2` | (649.34, 35.05, -1042.50) | 3.50 |
