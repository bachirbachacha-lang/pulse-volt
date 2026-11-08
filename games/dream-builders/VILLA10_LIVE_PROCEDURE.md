# Villa 10: live implementation procedure (for approval)
9 Nov 2026, 00:15 Riyadh, by Claude. Answers the five conditions of Codex's review (APPROVE WITH CONDITIONS) of `VILLA10_POOL_EDGE_PLAN.md`.

**Status:**
- **Nothing in the live project was edited or saved** while preparing this.
- The only things run on the live place were read-only scripts, at 23:53: `02_check_targets_readonly.lua` (result OK) and `01_fingerprint_readonly.lua` (baseline in the appendix).
- **Waiting for the owner's approval.** Villa 6 is not touched.

**Scripts:** all in `villa10_live/`.
- The three write scripts refuse to run without a confirmation string.
- All nine scripts parse as valid Luau (checked offline).
- The write scripts and the new rollback have **not been run anywhere yet**. Step 0 rehearses all of them on the test copy before anything touches the live place.

| Codex condition | Answered in |
|---|---|
| 1. Confirm the shallow-edge compromise and the player experience | Section 1 |
| 2. Protect Villas 1, 6, 15 and the neighbours with exact before/after comparisons | Section 3 |
| 3. Exact live objects and terrain cells; no unrelated house or dune edits | Section 2 |
| 4. Live acceptance tests: all sides, corners, walking, swimming, stuck states | Section 4 |
| 5. Safe rollback without the old unguarded script | Section 5 |

## 1. The shallow-edge compromise (confirmed)
The revised fill (R10 in the test log) is used exactly as tested in the copy.

**What a player will experience at Villa 10:**
- **On the deck around the pool** (all four sides, all four corners, the narrow 3.6-stud path by the house):
  - You walk normally and never start swimming.
  - You never get stuck.
  - Test copy: 0 swimming samples out of 910 (26 walks, 6 laps), and real key presses showed the same.
- **Getting in:**
  - Walk up the outside steps at the east end and over the edge, then down the inside steps.
  - You land standing in shallow water.
  - About 3 studs from the steps wall the water gets deep and you start swimming.
- **The middle of the pool** (32 × 8 studs, **54%** of the water area) is deep: you swim, like any other pool.
- **Next to the walls** (**46%** of the water area) the water is shallow:
  - This band is 1.9 studs wide along the house wall, 2.7 along the garden wall and the west end, and 3.1 at the steps end.
  - There your character **stands and walks on the pool floor** instead of swimming.
  - The water still looks exactly as full (screenshots are pixel-identical), so it looks like wading with the water at about waist height.
  - Swimming into the band, your character stands up (`GettingUp` → `Running`). Walking back to the middle, it starts swimming again. Both were seen in the tests.
- **Getting out:** walk to the steps end (shallow), then walk or jump up the steps (W + Space). This is easier than at the other villas.
- **From the deck the pool looks the same as before.** The only difference is how deep it is near the walls.
- **Compared with the other villas:**
  - At Villas 1 and 15 you can swim right up to the walls.
  - But players there also start swimming by accident while walking on the deck: 9% and 24% of the time in the same test.
  - At Villa 15 there is a near-trap at one corner.

**Alternative, not part of this procedure** (it would need its own approval):
- Variant R9 makes only the house-side strip and the two garden-side corners shallow, so **82%** of the water stays deep.
- But it had 1 accidental swim sample (0.1 s) in 797. That is not the zero the requirement asked for.

## 2. Exactly what changes in the live place
Nothing else may change. Every write script finds each target by exact path and position. It checks that every target and every terrain cell is **exactly** in the expected state **before** writing anything, and writes nothing if even one does not match.

### 2.1 Workspace objects (Stage A)
| What | How it is found | Change |
|---|---|---|
| The 47 house parts below | Path inside `Workspace.DreamBuilders.Homes.Villa_PalmHills_10_Pearl` plus position within 0.01 stud; each must match exactly one part | `CFrame + (0, −7.57825, 0)`. x, z, rotation and size unchanged. |
| Villa 10 `WorldPivot` | Must be at y 8.07826 | y → 0.50001 |
| Dune #43 | `Workspace.DreamBuilders.Mountains`, child 43 of 43, a Ball part at (344.565, −15, −1060.26), size (257.28, 96.87, 269.61) | Position → (385, −15, −1148). Rotation and size unchanged. |

**The 47 house parts** (before → after y):
| Part | Before (x, y, z) | After y |
|---|---|---|
| `Door_Bath` | (353.183, 25.178, −1016.122) | 17.600 |
| `Door_Bedroom` | (327.083, 25.178, −1016.122) | 17.600 |
| `Door_FrontL` | (319.433, 14.378, −992.722) | 6.800 |
| `Door_FrontR` | (322.133, 14.378, −992.722) | 6.800 |
| `Door_Garage` (house; not `Garage.Door_Garage`) | (305.483, 13.478, −997.942) | 5.900 |
| `Door_Study` | (336.983, 25.178, −1016.122) | 17.600 |
| `Mansion_bed` | (343.733, 17.146, −1020.622) | 9.568 |
| `Mansion_black` | (340.313, 20.071, −1012.567) | 12.493 |
| `Mansion_boucle` | (341.933, 11.588, −1010.628) | 4.010 |
| `Mansion_cream` | (339.683, 26.528, −1010.722) | 18.950 |
| `Mansion_curtain` | (346.883, 14.828, −993.667) | 7.250 |
| `Mansion_fabric` | (346.208, 17.776, −1010.857) | 10.198 |
| `Mansion_floor` | (339.683, 15.278, −1010.722) | 7.700 |
| `Mansion_flower` | (349.929, 14.693, −1011.712) | 7.115 |
| `Mansion_frame` | (346.883, 21.488, −1007.662) | 13.910 |
| `Mansion_glass` | (339.683, 20.318, −1007.595) | 12.740 |
| `Mansion_gold` | (336.713, 20.633, −1009.508) | 13.055 |
| `Mansion_grass` | (339.683, 9.518, −1057.772) | 1.940 |
| `Mansion_kitchen` | (334.058, 16.696, −1023.142) | 9.118 |
| `Mansion_leaf` | (340.403, 32.468, −1017.922) | 24.890 |
| `Mansion_led` | (339.593, 20.386, −1009.125) | 12.808 |
| `Mansion_light` | (345.983, 20.611, −1005.772) | 13.033 |
| `Mansion_marble` | (340.673, 16.921, −1023.097) | 9.343 |
| `Mansion_oak` | (331.853, 16.696, −1010.812) | 9.118 |
| `Mansion_olive` | (339.537, 15.080, −1011.029) | 7.502 |
| `Mansion_planter` | (339.458, 10.958, −1011.172) | 3.380 |
| `Mansion_plaster` | (332.708, 20.678, −1010.722) | 13.100 |
| `Mansion_pool` | (345.533, 16.381, −1034.797) | 8.803 |
| `Mansion_rug` | (339.008, 15.373, −1001.272) | 7.795 |
| `Mansion_slab` | (333.383, 26.258, −1008.922) | 18.680 |
| `Mansion_stone` | (339.683, 9.068, −1017.922) | 1.490 |
| `Mansion_tile` | (357.683, 21.151, −1022.422) | 13.573 |
| `Mansion_travertine` | (339.683, 20.678, −1010.137) | 13.100 |
| `Mansion_walnut` | (339.638, 20.633, −1010.385) | 13.055 |
| `Mansion_wood` | (339.265, 21.128, −1017.922) | 13.550 |
| `PoolRaised.Coping_E` | (363.713, 11.768, −1040.422) | 4.190 |
| `PoolRaised.Coping_N` | (344.183, 11.768, −1047.353) | 4.190 |
| `PoolRaised.Coping_S` | (344.183, 11.768, −1033.492) | 4.190 |
| `PoolRaised.Coping_W` | (324.652, 11.768, −1040.422) | 4.190 |
| `PoolRaised.PoolFloor` | (344.183, 10.148, −1040.422) | 2.570 |
| `PoolRaised.PoolLight` (1) | (331.583, 10.958, −1046.587) | 3.380 |
| `PoolRaised.PoolLight` (2) | (344.183, 10.958, −1046.587) | 3.380 |
| `PoolRaised.PoolLight` (3) | (356.783, 10.958, −1046.587) | 3.380 |
| `PoolRaised.StepIn1` | (362.183, 11.078, −1040.422) | 3.500 |
| `PoolRaised.StepIn2` | (360.383, 10.568, −1040.422) | 2.990 |
| `PoolRaised.StepOut1` | (366.143, 10.568, −1040.422) | 2.990 |
| `PoolRaised.StepOut2` | (364.343, 11.078, −1040.422) | 3.500 |

### 2.2 Added in ServerStorage (Stage A, needed for rollback R1)
**`ServerStorage.Phase1Backups.Fix8Nov_Villa10`:**
- A Folder holding `Villa_PalmHills_10_Pearl_original` (a clone of the whole Villa 10 model before any change) and `Mountains_Dune43_original` (a clone of dune #43).
- 85 objects in the 17:22 attempt. The script checks the count equals the originals' object count + 2.
- It is the same kind of copy as the existing `Fix8Nov_BuriedVilla`. ServerStorage is not part of the game world, so players never see it.

### 2.3 Terrain: exactly 160 cells
The box is x 324…364, y 0…16, z −1048…−1032 (10 × 4 × 4 cells of 4 studs). The values are amounts of water or ground in steps of 1/256, measured on the live place at 23:53.
- **Inner columns (16):** x 328…360, z −1044…−1036.
- **Outer ring (24):** every other column.

| Layer | Cells | Now (all cells measured) | After Stage A | After Stage B |
|---|---|---|---|---|
| y 12…16 | 40 | Water 63/256 (old raised pool) | Air | Air |
| y 8…12 | 40 | Water 113/256 (old raised pool) | Air | Air |
| y 4…8 | 16 inner | Air | Air | **Water 91/256** |
| y 4…8 | 24 ring | Air | Air | **Water 3/256** |
| y 0…4 | 16 inner | Ground 30/256 | Ground 30/256 | **Water 86/256** |
| y 0…4 | 24 ring | Ground 30/256 | Ground 30/256 | **Air** |

**How it is written:**
- Stage A writes only the upper 80 cells; Stage B writes only the lower 80. Each is one `WriteVoxels` call.
- Both scripts also prove that the 272 cells surrounding the box did not change.
- These are the same final values as the test copy, whose Edit diff showed 160 cells, 0 outside the box.

### 2.4 Not changed
- Every other part, including:
  - Villa 10's 22 garage-block parts and the garage building's door;
  - the bench;
  - the other 42 dunes, the lawns, roads, lamps and palms;
  - every other villa.
- All scripts.
- All terrain outside the box.
- This is enforced by the exact comparisons in section 3: any other change fails the check and triggers a rollback.

## 3. Protecting Villas 1, 6, 15 and the neighbours (exact before/after comparisons)
**Protected, by name, from the baseline:**

| Protected | Parts (group fingerprint) | Terrain snapshot (exact, cell by cell) |
|---|---|---|
| Villa 1 (`Villa_PalmHills_1_Classic`) | 68 | 34×14×34 cells around its lot |
| Villa 6 (`Villa_PalmHills_6_Classic`) | 69 | 34×21×35 cells (taller: its raised pool water is there) |
| Villa 15 (`Villa_PalmHills_15_Pearl`) | 69 | 34×14×35 cells |
| Neighbour Villa 8 (west) | 69 | 34×14×35 cells |
| Neighbours Villa 16 and Villa 4 (across the road) | 69 + 69 | 34×14×35 cells each |
| Empty for-sale lots (`ForSaleLots`) | 12 | inside the Villa 10 work area |
| Street furniture (`PalmHills`: benches, lamps, palm) | 168 | inside the Villa 10 work area |
| Roads, Lawns, the other 42 dunes, everything else | every part in the game (25,827 in total) | the Villa 10 work area (60×14×65 = 54,600 cells, x 280…520, z −1200…−940) and the global cell count |

**How it is compared:**
1. **BEFORE fingerprint** (`01`, after the fresh reopen in step 1). For every BasePart in Workspace and ServerStorage it records:
   - its full path, with a sibling index so that parts with the same name stay separate;
   - its exact CFrame, Size, Anchored, CanCollide, Transparency, Material and Color.
   - It also records: a digest per group (each villa, each folder); exact cell copies of the 7 terrain regions above; `Terrain:CountCells()`; a digest of all 65 scripts; and object counts per service.
   - It must equal the baseline in the appendix. If anything differs, someone changed the place since 23:53, and I stop.
2. **After Stage A, after Stage B and after any rollback,** `01` runs again and `05` compares bit for bit.

**What each stage is allowed to change** (anything else fails):

| | After Stage A | After Stage B | After a full rollback |
|---|---|---|---|
| Changed parts | Exactly the 47 house parts (each exactly y − 7.57825, nothing else) and dune #43 (exactly at (385, −15, −1148), same rotation and size) | Same | None |
| New parts | Only inside `Fix8Nov_Villa10` | Same | None |
| Changed groups | Only Villa 10, Mountains, and the new copy folder | Same | None |
| Villa 1, 6, 15, 8, 16, 4 parts and terrain | **0 differences** | **0** | **0** |
| Villa 10 work-area terrain | Exactly the 80 upper cells, with the planned values | Exactly the 160 cells | 0 |
| `CountCells` | −80 | −64 | 0 |
| Scripts | Identical | Identical | Identical |
| Object counts | Same, except ServerStorage + the copy folder | Same | Same |

3. **After saving:**
   - The saved file is compared chunk by chunk with the backup `DreamBuilders_backup_8Nov_before_villa10.rbxl` (SHA-256 `6c804b23…`).
   - Allowed differences: part CFrames and the model pivot, the new copy-folder objects, and `Terrain.SmoothGrid`. Every script must be byte-identical.

## 4. Live acceptance tests
All tests run on the live place in Studio Play mode, before saving. Play sessions change nothing in the place. **Every test must pass, or nothing is saved.**

**Stuck-state definitions** (used everywhere):
- **Deck swim:** the character's state is `Swimming` while it is outside the pool.
- **Stuck:** 3 or more samples in a row of `Swimming` below 1 stud/s while a direction is held.
- **Trapped:** in the escape test, a point where fewer than 2 of 4 directions let the character move 3 studs in 1 s.

### 4.1 Edit-mode checks
| # | Check | Pass if |
|---|---|---|
| E1 | `02` before any write | 47/47 parts, pivot, dune and all 160 cells exactly in the before-state |
| E2 | `03` / `04` own post-checks | Exactly as planned; 272 surrounding cells unchanged |
| E3 | `01` + `05` after each stage | PASS (section 3 table) |
| E4 | `06` water measurement: 4 sides at 0.1–3 studs out; 4 corners × 7 distances × 7 angles | 0 water above the deck everywhere. Inside levels equal the test copy's. |
| E5 | Screenshots from the same 3 cameras as the test copy | Match the test-copy "after" pictures |

### 4.2 Stage A Play tests (house, garage, dune), after Stage A
| # | Test | Pass if |
|---|---|---|
| H1 | Start Play; Output | No script errors (known asset warnings only) |
| H2 | Buy Villa 10 (Phone › Property) | −$25,000; sign "crrusher14's Villa" |
| H3 | Phone › Maps › My Home | Lands on the ground near (289.7, ~5, −983.0) |
| H4 | Walk to the front door from My Home and from the street (real keys) | No step too high; door bottom y 1.85 |
| H5 | E at the front door | Opens for the owner |
| H6 | Walk through the ground floor (and upstairs where Villa 15 allows) | Walkable; floor heights as at Villa 15 |
| H7 | House garage door | Bottom at y 1.85 |
| H8 | Garage building: roll-up door; bring a car and drive it from the road into the garage | Door opens for the owner; car reaches the garage. The known 1.2-stud driveway step when reversing (same at Villa 15) is not a failure. |
| H9 | Walk past the bench, both sides | Not moved; not in the way |
| H10 | Back yard where the dune was; walk round the dune's new spot | Open lawn, nothing floating, no holes; the dune blocks no path, lot or road |

### 4.3 Pool tests, after Stage B: scripted (`07`, holds a direction like a held key)
| Part | What | Pass if |
|---|---|---|
| P1 | 26 straight walks: house side at 1.0 / 1.5 / 2.2 studs out; garden side at 1.0 / 1.5 / 2.2 / 3.0; west end and steps end at 1.0 / 1.5 / 2.2; each both directions | 0 deck-swim, 0 stuck, each walk moves ≥ 3 studs |
| P2 | 8 corner walks: each of the 4 corners, both ways round | 0 deck-swim, 0 stuck |
| P3 | 6 laps (3 each way) at 1.3 studs out | 0 deck-swim, 0 stuck |
| P4 | Escape test at 9 points next to the walls (4 corners, 3 on the house path, 2 on the garden side), each held 1 s in 4 directions | No point trapped; 0 deck-swim; 0 stuck |
| P5 | Swim test: in over the steps → deep middle → house-side wall → middle → garden-side wall → middle → west wall → middle → steps → climb out | Every target reached; swimming in the deep middle; out onto the deck; 0 stuck |

### 4.4 Pool tests: real key presses (Studio keyboard input)
| # | Test | Pass if |
|---|---|---|
| K1 | Old trap path: house-side corner, hold W westward along the path | Always `Running` to the far corner |
| K2 | The same path eastward | Always `Running` |
| K3 | Lap with A, W, D, S, clockwise | 0 swimming, not stuck |
| K4 | The same lap counter-clockwise | 0 swimming, not stuck |
| K5 | Both house-side corners: walk along the path and turn the corner with the keys | Always `Running` |
| K6 | Swim, in two sample windows with keys held the whole time: (a) W in over the steps and swim to the middle; (b) turn, then W + Space to the steps and out | Swims in the middle; gets out onto the deck; 0 stuck |

### 4.5 Other checks
| # | Check | Pass if |
|---|---|---|
| O1 | Villa 1 | Exact comparison shows 0 differences; quick swim in and out with real keys |
| O2 | Output at the end | No script errors |

**Decision:**
- Every item in 4.1–4.5 passes → save (step 4).
- Any failure → rollback (section 5), no save, report with evidence.

## 5. Rollback
### 5.1 Why the old script is not used
The old `_G.V10_RESTORE()` had these problems:
1. No check of which place or which mode it ran in.
2. It reset **every** part that differed from a session snapshot, not just the 48 planned ones, so it could silently undo unrelated edits.
3. It rewrote a 36,400-cell terrain region, not just the 160 planned cells.
4. It depended on in-memory `_G` data that is lost if Studio restarts.
5. It had no dry run and no check of the state before writing.
6. It had no built-in verification afterwards.

### 5.2 R0: discard (the default for any failure before saving)
1. Stop Play.
2. In the live Studio window (title must show `C:\Users\PC\Downloads\DreamBuilders.rbxl`): File › Close Place › **Don't Save**.
3. File › Open from File › `DreamBuilders.rbxl`.
4. Verify:
   - The file's SHA-256 is still `6c804b23…4a5a` (it was never saved).
   - `01` with LABEL `AFTER_R0`, then `05` against `BEFORE` with stage `ROLLBACK`, gives PASS.
- This uses no script at all to undo anything: the unsaved edits are simply thrown away.

### 5.3 R1: guarded in-session rollback (`09_rollback_guarded.lua`)
Use it only if R0 cannot be used (for example, computer use is unavailable).

**Guards:**
- It must be the live place, in Edit mode, not running.
- The copy folder must exist with both copies (the Villa 10 copy must have 69 parts and its original pivot; the dune copy must be at its original position).
- Every target must be in its planned after-state or already restored. Anything else → **stop, write nothing**.

**Steps:**
1. Run with `DRY_RUN = true`; it reports exactly what it would restore.
2. Set `DRY_RUN = false` and `CONFIRM = "ROLL BACK VILLA 10"`. It restores:
   - each of the 47 parts to its copy's **exact** original CFrame;
   - the pivot and the dune from the copies;
   - the box cells to the measured before-values.
3. It verifies everything, including that the 272 surrounding cells did not change. Only then does it delete the copy folder (MODE `ALL`).
4. `01` with LABEL `AFTER_ROLLBACK`, then `05` with stage `ROLLBACK`: must PASS (0 differences from `BEFORE`).
5. **Never save after a rollback.** Then also do R0 when possible.

**MODE `STAGE_B`:** undoes only the 80 lower pool cells. The house and dune stay, and the pool is left empty. It is used if Stage B fails and the owner wants to consider keeping Stage A. Then `05` with stage `B_ROLLBACK` must PASS. I stop and ask before any save.

### 5.4 R2: after saving (if a problem is found later)
This is only done with the owner's approval at that time.
1. Close the place in Studio.
2. Copy the saved file to `DreamBuilders_after_villa10_<time>.rbxl`, so nothing is lost.
3. Verify the backup's SHA-256 (`6c804b23…`).
4. Copy the backup bytes over `DreamBuilders.rbxl` and verify the hash.
5. Reopen, and check `01` against the baseline.

## 6. Run order (after approval)
| Step | What | Stop rule |
|---|---|---|
| **0. Rehearsal on the test copy** | 1. Open `DreamBuilders_TEST_villa10_pool_edge.rbxl` (still byte-identical to the game) in its own window. 2. Run the full sequence with the scripts' one `PLACE` line set to the copy's name: 02 → 01 → 03 → 01 + 05 (A) → 04 → 01 + 05 (B) → 06 → 07 (scripted tests) → 09 STAGE_B (dry run, real run) → 01 + 05 (B_ROLLBACK) → 04 again → 09 ALL (dry run, real run) → 01 + 05 (ROLLBACK). 3. Close without saving. | If any script needs a change, **stop and send the change for approval** before the live run |
| **1. Pre-flight (live)** | 1. Check that the file, the backup and the test copy hashes are `6c804b23…`. 2. Fresh reopen of the live place (Close Place › Don't Save › Open `DreamBuilders.rbxl`). 3. Check the identity (`game.Name`, Edit mode). 4. `02`, then `01` (BEFORE), which must equal the appendix baseline. | Any mismatch → stop |
| **2. Stage A (live)** | `03`; `01` (AFTER_A) + `05` (A); Play tests H1–H10 | Fail → R0 |
| **3. Stage B (live)** | `04`; `01` (AFTER_B) + `05` (B); `06`; Play: `07` (P1–P5), K1–K6, O1, O2; screenshots | Fail → R0 (or R1 STAGE_B, then ask) |
| **4. Save** | 1. Only if everything passed: Ctrl+S in the live window, after checking the title bar. 2. Verify the saved file: SHA-256 changed, chunk comparison with the backup as in section 3, scripts identical. 3. Optionally reopen it in a second window and check `01` = AFTER_B. | Any unexpected difference → report; R2 only with approval |
| **5. Report and stop** | GitHub report with before/after evidence and all logs. **Villa 6 untouched.** | |

## 7. Scripts (`villa10_live/`)
| Script | Writes? | Purpose |
|---|---|---|
| `01_fingerprint_readonly.lua` | No | Fingerprint of all parts, protected terrain, scripts and counts |
| `02_check_targets_readonly.lua` | No | Every target exactly in its before-state? (ran on live at 23:53: OK) |
| `03_apply_stageA.lua` | Yes; needs `CONFIRM = "APPLY STAGE A"` | Copy folder, 47 parts, pivot, dune, 80 upper cells |
| `04_apply_stageB.lua` | Yes; needs `CONFIRM = "APPLY STAGE B"` | 80 lower cells (the revised fill) |
| `05_compare_readonly.lua` | No | Only the planned differences? (stages A, B, ROLLBACK, B_ROLLBACK) |
| `06_measure_water_readonly.lua` | No | Water on the deck: 4 sides and 4 corners |
| `07_acceptance_suite_client.lua` | No (moves the test player in Play only) | P1–P5 |
| `08_keyboard_helpers_client.lua` | No | Helpers for the real key-press tests K1–K6 |
| `09_rollback_guarded.lua` | Yes; `DRY_RUN` by default; needs `CONFIRM = "ROLL BACK VILLA 10"` | Rollback R1 |

## Appendix: baseline of the live place
Read-only run of `01`, 8 Nov 23:53. The step-1 BEFORE fingerprint must equal this.
- **Totals:**
  - 25,827 parts in Workspace and ServerStorage.
  - `Terrain:CountCells()` 3,696,540.
  - 65 scripts, 374,888 characters, digest 213190205-047696384.
  - Objects: Workspace 22,481, ServerStorage 7,306, ServerScriptService 41, ReplicatedStorage 4, StarterPlayer 20, StarterGui 0, Lighting 6.

**Parts per protected group:**
| Group | Parts | Digest |
|---|---|---|
| Villa 1 | 68 | 543561436-589458158 |
| Villa 6 | 69 | 972153925-174006451 |
| Villa 15 | 69 | 469059204-884098964 |
| Villa 8 | 69 | 144614507-777719877 |
| Villa 16 | 69 | 138030787-879395592 |
| Villa 4 | 69 | 993867052-554353356 |
| Villa 10 | 69 | 118939709-894674326 |
| Mountains | 43 | 494069394-870197119 |
| PalmHills | 168 | 807016841-350079675 |
| ForSaleLots | 12 | 590866493-586204907 |
| Roads | 448 | 144916918-842271491 |

**Terrain regions:**
| Region | Cells | From | Water | Solid | Checksum |
|---|---|---|---|---|---|
| Villa 10 work area | 60×14×65 | (280, −16, −1200) | 80 | 3,380 | 926387774-050962547 |
| Villa 1 | 34×14×34 | (−572, −16, −1068) | 88 | 1,301 | 516459126-710339131 |
| Villa 6 | 34×21×35 | (544, −16, −1076) | 406 | 1,405 | 920942966-584891726 |
| Villa 15 | 34×14×35 | (−8, −16, −1072) | 80 | 1,368 | 599245519-301851738 |
| Villa 8 | 34×14×35 | (140, −16, −1072) | 88 | 1,364 | 237610684-251228802 |
| Villa 16 | 34×14×35 | (212, −16, −924) | 88 | 1,422 | 791927450-237413260 |
| Villa 4 | 34×14×35 | (352, −16, −928) | 80 | 1,368 | 923237202-260692270 |

The full output (all 116 groups) is in `villa10_live/baseline_2026-11-08_2355.txt`.
