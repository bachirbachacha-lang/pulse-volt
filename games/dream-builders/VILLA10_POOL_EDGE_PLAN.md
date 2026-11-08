# Villa 10: revised pool-edge repair plan (Option 1)
8 Nov 2026, 21:45–22:45 Riyadh, by Claude. Requested by the owner at 21:45 ("Proceed with Option 1 only").

**READ-ONLY for the real game. Nothing in `DreamBuilders.rbxl` was changed or saved.**
- All tests ran in a **test copy** (`Downloads\DreamBuilders_TEST_villa10_pool_edge.rbxl`), opened in its own Studio window.
- The test copy was closed without saving.
- Villa 6 was not touched.
- **Waiting for the owner's approval.**

Replaces step 4c of `VILLA10_REPAIR_PLAN.md`. Everything else in that plan stays the same. Why the first try failed: `VILLA10_REPAIR_STATUS.md`. Full test log: `evidence/2026-11-08_villa10_pool_edge/test_results.md`.

## 0. Summary
| | |
|---|---|
| **Problem (check 12 at 17:51)** | After refilling the pool, players walking on the narrow path between the pool and the house got stuck swimming at the corner. |
| **Cause (found in the test copy)** | The pool water is made of 4×4×4 terrain cells. The outer ring of cells reaches past the pool walls, by up to 0.86 studs on the house side, onto the path. The **top** layer of those ring cells makes players swim. The **bottom** layer is what showed water lying on the deck. |
| **Fix** | Change only the **outer ring** of the pool water (24 of the 40 cell columns): no water in the bottom layer, and a very thin layer (0.012) on top. The middle 16 columns stay exactly as in the approved plan. |
| **Result in the test copy** | **0 accidental swimming** in 910 samples of walking round the pool (26 walks along all four sides plus 6 laps), and in real key-press tests at the old trap corner. The pool looks the same in screenshots. Swimming in the pool and climbing out over the steps work. |
| **Side effect** | Inside the pool, in the outer ring next to the walls, the water is now shallow: you **stand** there instead of swimming. The ring is 1.9 to 3.1 studs wide. The middle 32 × 8 studs is deep, as before. |

## 1. Two stages, kept separate
| Stage | What | Same as approved at 17:20? |
|---|---|---|
| **A: house and dune** | 47 house parts y − 7.57825; pivot y 8.07826 → 0.50001; dune #43 → (385, −15, −1148); **4a**: remove the old raised water (80 cells, Water → Air) | **Yes, unchanged** |
| **B: pool water** | **4b**: thin ground under the pool → Air (40 cells), then **revised 4c** (below) | 4b is unchanged; **4c is new** |

**Why 4a belongs to Stage A:**
- The old water sits where the raised pool was.
- Once the house is lowered, that water would float 7.6 studs above the pool.
- After Stage A, the pool is simply empty.

**Each stage has its own checks** (section 7):
- Save only after both stages pass.
- If Stage B fails: undo Stage B only (the house stays fixed and the pool stays empty), don't save, and ask the owner whether to save Stage A alone.

## 2. Revised step 4c (exact)
One `Terrain:WriteVoxels` over x 324…364, y 0…8, z −1048…−1032. That is 10 × 2 × 4 = 80 cells, on the 4-stud grid. Picture: `villa10_pool_edge_cells.png`.

**Which cells:**
- **Inner columns (16):** x 328…360 and z −1044…−1036.
- **Outer ring (24):** every other column, i.e. x 324…328 and 360…364 (the west and east ends), plus z −1048…−1044 (the garden side) and z −1036…−1032 (the house side).

| Layer | Inner columns (16) | Outer ring (24) |
|---|---|---|
| Bottom, y 0…4 (below the pool floor at 2.66) | Water **0.336** (same as the approved fill) | **Air** (was Water 0.336) |
| Top, y 4…8 (the visible water, surface 5.41) | Water **0.355** (same) | Water **0.012** (was 0.355) |

**All terrain changes against the saved game.** Measured in the test copy after putting the terrain back from the snapshot and applying 4a, 4b and revised 4c exactly as written:

| Cells | Where | Saved game now | After |
|---|---|---|---|
| 40 | y 8…12, whole pool box | Water 0.441 (old raised pool) | Air (4a) |
| 40 | y 12…16, whole pool box | Water 0.246 (old raised pool) | Air (4a) |
| 16 | y 0…4, inner columns | Ground 0.117 | Water 0.336 |
| 24 | y 0…4, outer ring | Ground 0.117 | Air |
| 16 | y 4…8, inner columns | Air | Water 0.355 |
| 24 | y 4…8, outer ring | Air | Water 0.012 |
| **160** | **all inside x 324…364, y 0…16, z −1048…−1032** | | **0 cells outside this box** |

This is the same 160 cells as the approved plan. Only the end values of the 48 outer-ring cells differ.

## 3. Before and after (test copy)
`evidence/2026-11-08_villa10_pool_edge/`:
- `villa10_pool_edge_play_before_after.jpg`: the old trap corner in Play.
  - Before (approved fill, real game at 17:51): stuck swimming.
  - After (revised fill): the character walks straight past.
- `villa10_pool_edge_edit_before_after.jpg`: same cameras in Edit (top-down, house-side path, garden-side close-up). The pool looks the same:
  - the close-ups differ by at most 3 of 255 per pixel;
  - the path view differs in 54 pixels of palm leaves;
  - the top-down view differs only in a thin lawn-edge line.
- `villa10_pool_edge_deck_swim_chart.png`: accidental swimming for every version tested, plus Villas 15 and 1.
- `villa10_pool_edge_cells.png`: the 80 cells and their values.
- `test_results.md`: every measurement and test.

## 4. Test report (summary)
**Water lying on the deck** (Edit, physics rays): the highest point just outside each wall, at 0.25 / 0.5 / 1.0 studs out.

| | House side | Garden side | West | East (steps) |
|---|---|---|---|---|
| Approved fill | 1.54 / 1.28 / 0.77 | 0.68 / 0.43 / 0 | 0.68 / 0.43 / 0 | 0.32 / 0.06 / 0 |
| **Revised fill** | **0 / 0 / 0** | **0 / 0 / 0** | **0 / 0 / 0** | **0 / 0 / 0** |
| Villa 15 (correct villa, for comparison) | 0 | 2.01 / 1.76 / 1.26 | 1.62 / 1.36 / 0.86 | 0 |

**Walking round the pool** (Play, the same test for every version; state sampled every 0.1 s):

| Version | Deck samples | Swimming on the deck | Stuck |
|---|---|---|---|
| Approved fill | 1,019 | 389 (38.2%), trapped at the corner in every lap A | 281 |
| **Revised fill** | **910** | **0** | **0** |
| Villa 15 (untouched) | 635 | 153 (24.1%) | 16 |
| Villa 1 (saved 16:42, untouched) | 635 | 58 (9.1%) | 1 |

**Real key presses** (revised fill):
| Test | Result |
|---|---|
| Hold W along the house-side path from the old trap corner | Walked to the far corner. Always `Running`. |
| Full lap with A, W, D, S | Always `Running`, 0 swimming |
| Walk in over the steps, swim, turn back, W + Space at the steps | Swam, then got out onto the deck |

**Other variants I tried** (all in `test_results.md`):
| Variant | Result |
|---|---|
| Only removing the bottom ring layer | Removed the visible water on the deck, but players **still got trapped**. This showed that the swimming comes from the top layer. |
| Thinner top layer on the house side only (0.05 / 0.01) | The trap was gone, but short swim blips stayed at the corners (1.6% and 1.1%) |
| House side plus the two garden-side corners | 1 blip in 797 samples |
| **Whole outer ring (the revised fill)** | **0**, chosen |

## 5. Side effects and limits
- **Shallow edge inside the pool:** in the outer ring you stand instead of swim. The ring is 1.9 studs wide along the house wall, 2.7 along the garden wall and the west end, and 3.1 at the steps end.
  - The middle 32 × 8 studs is deep.
  - Getting in and out over the steps works. It is a little easier than before.
- **Physics rays vs looks:** the rays report the water surface lower near the walls, but the pictures from the same cameras look the same.
- **Lawn edge line:** in the top-down view, a thin blue line at the far edge of the back lawn gets shorter. It is a drawing line, not water: there are no water cells there.
- **Not re-run in the test copy:** the Stage A Play checks (buying, My Home, doors, garage, driveway, bench). They passed on the real game at 17:28–17:51 with the same Stage A. They will be run again after approval.
- **Test copy warnings:** 14 "Invalid place ID" warnings for avatar assets in the new file. No object or script in the game uses them.

## 6. Backup plan
1. **File backup:** `Downloads\DreamBuilders_backup_8Nov_before_villa10.rbxl` (17:22).
   - It is still byte-identical to the saved game (both SHA-256 `6c804b23…4a5a`).
   - It was re-opened in Studio and matched at 17:22.
   - Before any edit I re-check its hash. If the saved game has changed since, I make a new backup and re-open it first.
2. **Copies inside the place:** the Villa 10 model and dune #43 go into `ServerStorage.Phase1Backups.Fix8Nov_Villa10`, like before.
3. **Snapshots in the Studio session:** every part position; the terrain at x 280…440, y −16…40, z −1200…−940; the pool areas of Villa 1 and Villa 15.
4. **If a check fails:**
   - Write the terrain snapshot back, and put the parts, the pivot and the dune back.
   - Confirm 0 differences, remove the copy folder, and do not save.
   - Last resort: re-open the file backup.

## 7. Checks
**Stage A**
| Where | Check | Pass if |
|---|---|---|
| Edit | Changes | Exactly 48 parts moved (47 + dune) and 80 terrain cells (4a). Nothing else. |
| Edit | Villa 1 and Villa 15 | 0 cells and 0 parts different |
| Play | 1–9 of the approved list | Same as before: start, buy, My Home, walk to the door, door, inside, house garage door, garage building and driveway, bench |
| Play | 13–15 | Back yard where the dune was, dune at its new spot, neighbours |

**Stage B**
| Where | Check | Pass if |
|---|---|---|
| Edit | Changes | Exactly 80 cells (4b and revised 4c), with the values in section 2. Nothing else. |
| Edit | Water outside the walls | 0 at 0.25 / 0.5 / 1.0 studs out on all four sides |
| Play | 10: pool water | Level ~5.4. The pool looks the same as in the test-copy pictures. |
| Play | 11: swimming | Walk in over the steps, swim in the middle, climb out over the steps |
| Play | **12 (new rule)**: the full walking test from section 4 (26 walks + 6 laps) | **0 samples swimming on the deck and 0 stuck** |
| Play | 12b: real keys | The house-side path from the old trap corner, and a W/A/S/D lap: always `Running` |
| Play | 16: Villa 1 | Pool unchanged; swim in and out |
| Play | 17: Output | No script errors |
| Edit | 18: screenshots | The same cameras as the test-copy pictures; they match |

## 8. Order of work after approval
1. Re-check the backup's hash (and make a new backup if the game has changed).
2. Make the in-place copies and the snapshots.
3. **Stage A**, then its Edit and Play checks.
4. **Stage B**, then its Edit and Play checks.
5. **Save only if everything passed.**
6. Verify the saved file chunk by chunk: only part positions, the pivot, the new copy folder and `Terrain.SmoothGrid` may differ. Scripts must be identical.
7. Report to GitHub with before and after pictures.
8. **Stop. Villa 6 stays untouched.**

## 9. Not changed (confirmed)
- The bench stays where it is.
- The garage building, its door, the driveway, the lawn, the roads and the other 42 dunes are not touched.
- Villa 1, Villa 15, every other villa and all scripts are not touched.
- No terrain outside the pool box (x 324…364, y 0…16, z −1048…−1032) is touched.

## 10. Possible later work (not part of this plan)
- The same walking test found accidental swimming at the correct villas too: Villa 15 24%, Villa 1 9%.
- The same outer-ring method could fix them.
- That would need its own plan and the owner's approval.
