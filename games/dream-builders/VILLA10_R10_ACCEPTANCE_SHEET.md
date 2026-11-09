# Villa 10 pool (R10): acceptance sheet, re-measured after the Stage B fix
9 Nov 2026, 16:40 Riyadh, by Claude. **Not accepted yet (owner decision D-2 is deferred).**

Everything below was measured on the **test copy only**, after Revision 3: Stage A, then the corrected Stage B, which clears the ground under the pool in the same write.
- **Raw outputs:** `evidence/2026-11-09_villa10_rev3_rehearsal/rehearsal_log.md` and `pool_suite_07_rows.txt`.
- **These numbers replace** the 8 Nov estimate (54% deep, 46% shallow), which came from a different write method and a geometric estimate.

## 1. What the pool would be (exact terrain, all three channels)
The pool box is 10 × 4 × 4 cells under the lowered pool. All cells have no ground (the old thin ground layer is cleared). Water amounts are in 1/255:

| Layer | Middle 16 columns | Outer ring 24 columns |
|---|---|---|
| y 0–4 (around the pool floor) | water 86 | no water |
| y 4–8 | water 91 | water 3 (a trace) |
| y 8–16 | no water | no water |

## 2. What a player experiences (measured)
| Where | Result | Evidence |
|---|---|---|
| **Walking on the deck** round the pool: all 4 sides at 1.0–3.0 studs from the wall, all 4 corners, the narrow house-side path | Never swims, never stuck | 26 walks, 8 corner walks and 6 laps: **0 swimming samples out of 1,334** |
| **Real keys** on the deck: old trap path both ways, laps both ways, both house-side corners | Always running | K1–K5: 0 swimming, 0 stuck |
| **Getting away from the wall** (9 points next to the walls) | Can always walk away | 2–4 of 4 directions free at every point |
| **Getting in** | Walk over the steps at the east end and into the water | P5 and K6a |
| **In the pool** | Swim in the deep middle; stand and wade near the walls | Depth map below |
| **Getting out** | Swim to the steps and climb out (W, or W + Space) | P5 "exited onto the deck: true"; K6b out on the deck |
| **Water on the deck** | None | 4 sides × 7 distances + 196 corner points: 0 with water |

**Depth map.** The character was placed at every point of a 1-stud grid inside the walls and left standing with no key held: 444 points.

| | Points | Share |
|---|---|---|
| **Swims (deep)** | 291 | **66%** |
| **Stands (shallow, wading)** | 149 | **34%** |
| Changing state (edge of the deep part) | 4 | 1% |

**By distance to the nearest wall:**

| Distance | Swims |
|---|---|
| 0–1 stud | 0 of 48 |
| 1–2 studs | 0 of 90 |
| 2–3 studs | 67 of 82 |
| 3 studs or more | all 224 |

```
garden side
z -5.8 .....................................
z -4.8 .....................................
z -3.8 ..SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS.
z -2.8 ..SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS.
z -1.8 ..SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS.
z -0.8 ..SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS..
z +0.2 ..SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS..
z +1.2 ..SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS.
z +2.2 ..SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS.
z +3.2 ..SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS.
z +4.2 ..S.SSSS?SSSSSSSS?.SS..SS?.S.S?.SS...
z +5.2 .....................................
house side          (west end on the left, steps end on the right)
S = swims   . = stands   ? = changing state
```

**The shallow band, in plain words:**
- About 2 studs wide along the garden side and the west end.
- About 1–2 studs along the house side (the row 1.5 studs from the house wall is mixed).
- 1–2 studs at the steps end.

## 3. The trade-off
- **Gain:** no accidental swimming on the deck anywhere round the pool, and no trap at the house-side corner.
  - The 8 Nov plain fill trapped players there.
  - With the same deck-walking test on 8 Nov, Villa 15 had 24% and Villa 1 had 9% of deck walking spent swimming.
- **Cost:** a player cannot swim right up to the walls. Within about 2 studs of a wall they stand in shallow water. Two thirds of the pool is still for swimming.
- **Not measured here:**
  - How it looks to a player. The 8 Nov screenshots (old method) looked the same; there are no new screenshots of the Revision 3 water.
  - Mobile and gamepad controls.
  - Two players at once.

## 4. Decision (owner)
- [ ] **Accept R10** as measured above.
- [ ] **Not accepted.** Prefer another option (for example R9, which keeps more deep water but had 1 accidental-swim sample in 797 on 8 Nov).
- **Owner's words, date and time:** ____
