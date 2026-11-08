# Villa 10 pool edge: full test log (8 Nov 2026, 21:49–22:35 Riyadh)

All tests ran in a **test copy** of the game, opened in its own Roblox Studio window. The real game was never edited.

**Test copy:** `Downloads\DreamBuilders_TEST_villa10_pool_edge.rbxl`
- A byte copy of the saved game, with SHA-256 `6c804b23…4a5a` (the same as `DreamBuilders.rbxl` and the 17:22 backup).
- It was **closed without saving**, so the file on disk is still the unchanged copy.

**Safety guards on every edit:**
- Edit mode: the script stopped unless `game.Name` was `DreamBuilders_TEST_villa10_pool_edge.rbxl`.
- Play mode: the script stopped unless Villa 10's pivot was already lowered, which is only true in the test copy.

**Real game (only read):**
- Villa 10 is still raised (pivot y 8.07826).
- The terrain checksums of Villa 1's and Villa 15's pool areas are the same in the test copy and the real game:
  - Villa 1: 990 cells, 88 water, checksum 1835050609.
  - Villa 15: 990 cells, 80 water, checksum 1758511203.

## 1. Setting up the test copy
1. **Stage A (house + dune):** found the same 47 house parts by path and position, and dune #43 by its child index, position and size. Applied the approved moves:
   - 47 parts y − 7.57825;
   - pivot y 0.50001;
   - dune to (385, −15, −1148).
   - Result: exactly 48 parts moved.
2. **Approved pool steps (4a, 4b, 4c):** exactly 160 terrain cells changed, the same as the 17:25 live attempt. This is "the approved fill" below.
3. **Variants:** only the 80 pool cells (x 324…364, y 0…8, z −1048…−1032) were rewritten between tests.
4. **Final check of the revised method:**
   - The whole terrain area (x 280…440, y −16…40, z −1200…−940, 36,400 cells) was put back from the snapshot.
   - Then 4a, 4b and the revised 4c were applied exactly as the plan says.
   - **Result:** 160 cells changed, 0 outside the pool box. The table is in the plan, section 3.

## 2. Water on the deck (Edit mode, physics rays)
**How it was measured:**
- Height of the water above the deck, measured just outside each pool wall at 0.25 / 0.5 / 1.0 studs out.
- The highest value along the side, and how many sample points had water.
- 19 points per long side and 12 per short side.

| Version | House side (S) | Garden side (N) | West | East (steps) |
|---|---|---|---|---|
| Villa 10, approved fill | **1.54 / 1.28 / 0.77**, 19 of 19 | 0.68 / 0.43 / 0 | 0.68 / 0.43 / 0 | 0.32 / 0.06 / 0 |
| Villa 10, outer-ring bottom layer removed (R2) | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| **Villa 10, revised fill (R10)** | **0 / 0 / 0** | **0 / 0 / 0** | **0 / 0 / 0** | **0 / 0 / 0** |
| Villa 15 (correct villa) | 0 / 0 / 0 | 2.01 / 1.76 / 1.26 | 1.62 / 1.36 / 0.86 | 0 / 0 / 0 |
| Villa 1 (saved 16:42) | 0.86 / 0.60 / 0.09 | 1.37 / 1.11 / 0.60 | 1.70 / 1.45 / 0.94 | 1.73 / 1.64 / 1.27 |

**What changed when only the house-side row of 10 columns was edited:**

| House-side row | Water on the path (0.25 / 0.5 / 1.0 studs out) | Water level 0.25 studs inside the wall |
|---|---|---|
| bottom 0.336, top 0.355 (approved) | 1.54 / 1.28 / 0.77 | 4.59–4.99 |
| bottom 0.336, top 0 | 0 | **dry** (all 19 points) |
| bottom 0, top 0 | 0 | **dry** to 1.5 studs in |
| bottom 1.0, top 0 | 1.52 / 1.52 / 1.45 | 4.00 |
| bottom 0.336, top 0.05 | 0.70 / 0.52 / 0.16 | 4.11–4.26 |
| bottom 0, top 0.01–0.355 | **0** | 3.99–4.99 (rises with the top value) |

**Findings:**
1. The **visible** film on the deck comes from the **bottom-layer** water cells (y 0–4) of the outer ring. The surface spreads sideways from them onto the deck.
2. Removing the bottom layer from the outer ring removes all visible film on all four sides, and the water inside the pool stays at exactly the same height (R2).
3. Removing the visible film did **not** stop the swimming (section 3). The physics uses the water cells themselves, and the top-layer cells reach 0.86 studs past the house-side wall.

## 3. Walking test (Play mode)
The same scripted test was used for every version. It holds a direction, exactly like holding a movement key.

**Walks (26):**
- Along all four sides, at 1.0 / 1.5 / 2.2 studs from the outside of the wall; the garden side also at 3.0.
- Both directions.

**Laps:** around the whole pool at 1.3 studs out (1 pair, or 3 pairs where marked).

**Swim test:** walk in over the steps, swim to the house side, along it, to the garden side, back to the steps, climb out.

**How it was counted:**
- The character's state was sampled every 0.1 s.
- "Deck swim" = sampled as Swimming while outside the pool.
- "Stuck" = swimming at a speed under 1 stud/s.

| Version | Samples on the deck | Deck swim | Stuck | Notes |
|---|---|---|---|---|
| Villa 10, approved fill (3 lap pairs) | 1,019 | **389 (38.2%)** | 281 | Trapped at the house-side corner in **every** lap A (97–98% swimming). Also trapped on the house-side walk 1.5 studs out (20 samples stuck). |
| R2: bottom ring layer removed | 665 | 180 (27.1%) | 133 | Still trapped (house side at 1.0 and 1.5 studs out; lap A 97 of 98) |
| R5: R2 + house-side top row 0.05 | 628 | 10 (1.6%) | 0 | Short blips: house side 1.5 studs out, the north-east and north-west corners, laps |
| R6: R2 + whole top ring 0.05 | 629 | 3 (0.5%) | 0 | Blips only on the house-side path in laps |
| R8: R2 + house-side top row 0.01 (3 lap pairs) | 651 | 7 (1.1%) | 0 | Blips at the north-east and north-west corners only |
| R9: R8 + the two garden-side corners 0.01 (4 lap pairs) | 797 | 1 (0.1%) | 0 | One blip, west side 1.0 stud out |
| R10: R2 + whole top ring 0.012 | 624 | **0** | 0 | First run |
| **R10, applied from a clean state exactly as in the plan (3 lap pairs)** | **910** | **0** | **0** | Final run |
| Villa 15 (correct villa, untouched) | 635 | 153 (24.1%) | 16 | Garden and west sides. Near-trap at the north-west corner (26 of 26 samples swimming, 15 stuck). |
| Villa 1 (saved, untouched) | 635 | 58 (9.1%) | 1 | West, garden and house sides near the corners |

**Final run, walk by walk:** every walk and lap was `Running` the whole time.

| Walk | Samples | Swim |
|---|---|---|
| House side 1.0 / 1.5 / 2.2 out, both directions (6 walks) | 150 | 0 |
| Garden side 1.0 / 1.5 / 2.2 / 3.0 out, both directions (8) | 199 | 0 |
| West side 1.0 / 1.5 / 2.2 out, both directions (6) | 68 | 0 |
| East (steps) side 1.0 / 1.5 / 2.2 out, both directions (6) | 67 | 0 |
| Laps A1–A3, B1–B3 | 426 | 0 |

**Swim test:**

| Version | Result |
|---|---|
| Revised fill | Walked in over the steps, swam (60 samples), stood up in the shallow water near the walls, and walked out over the steps onto the deck |
| Approved fill, Villa 15, Villa 1 | The scripted climb-out failed at the steps (the swimmer kept bumping the step). With real keys and a jump it works (check 11 on 17:3x, and test K3 below). It is a limit of the script, not of the pool. |

## 4. Real key presses (revised fill, Play mode)
| Test | What was done | Result |
|---|---|---|
| K1 | The walk that trapped players before: start at the house-side corner and hold W along the path (2.6 s) | Walked the whole path to the other corner. 41 moving samples, all `Running`, 0 swimming. |
| K2 | Full lap with A, W, D, S (camera fixed) | 96 moving samples, all `Running`, 0 swimming |
| K3 | W into the pool over the steps, swim, then turn and hold W toward the steps, pressing Space | Swam in, then jumped out of the water at the steps onto the deck. Back on the deck `Running`. |

**Notes:**
- K1 and K2 were also run in the first R10 session, with the same result.
- K3 shows 71 "stuck" samples. That is the swimmer floating still while no key was held (between two key sequences), not a trap.

## 5. Looks
**Same cameras, Edit mode, approved fill vs revised fill** (`villa10_pool_edge_edit_before_after.jpg`):
- **Close-up of the garden side:** the two pictures differ by at most 3 of 255 per pixel (JPEG noise).
- **House-side path view:** only 54 pixels differ, all in the palm leaves.
- **Top-down:** the pool looks the same. The only difference (344 pixels) is a thin blue line at the far edge of the back lawn, which becomes shorter. It is a rendering line and not water: no water cells exist there (checked from x 300 to 392, z −1076 to −1048).

**Physics rays near the walls:**
- With the revised fill, the rays report the water surface lower near the walls: no water in the first 0.25 studs from the garden-side, west and east walls, and about 4.0–4.3 a little further in.
- The pictures do not show this.

**Gameplay side effect:**
- In the outer ring inside the pool, the water is shallow: you **stand** instead of swim. The ring is 1.9 studs wide along the house wall, 2.7 along the garden wall and the west end, and 3.1 at the steps end.
- The middle 32 × 8 studs is deep, as before.

## 6. Output
- No script errors in any Play session.
- The usual "Asset content representation is being generated" warnings appear.
- The test copy also printed 14 "rbxassethash … Invalid place ID" warnings when Play started.
  - No object or script in the game uses those 14 assets (checked).
  - They come from loading the test player in a new, unconnected file, not from the game.
