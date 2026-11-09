# Villa 10 Revision 2: test-copy rehearsal log (9 Nov 2026)

These are the **actual outputs** returned by Roblox Studio, copied verbatim. Times are UTC (Riyadh = UTC+3).

**Where it ran:**
- Only in `C:\Users\PC\Downloads\DreamBuilders_TEST_villa10_pool_edge.rbxl`.
- The title bar was checked on a screenshot before each session. MCP studio ids: `eb576329…` (first open), `e50ecbd5…` (after the R0 reopen).
- **The live place was never opened in this rehearsal.** For the terrain comparison, a byte copy of the saved live file was opened instead (`DreamBuilders_SNAPSHOT_live_saved_0059_READONLY.rbxl`, studio `e464ce09…`). Only read-only code ran there.

**How the scripts were loaded:**
- Each script was pasted into the test window's memory (`_G.V10SRC`). Its size and digest were then compared with the file in `villa10_live/`.
- Every one matched.
- The runner changes only the named constants, by exact text replacement: `PLACE` to the test file name, `LABEL`, `CONFIRM`, `SESSION_TOKEN`, `MODE`, `DRY_RUN`, `BASE/NEW/STAGE`. It prints the digest of the text that actually ran.
- The runner refuses to run in any window whose place is not the test copy.

| Script | Bytes | Digest (file = loaded copy) |
|---|---|---|
| 00_session_identity_readonly.lua (before fix) | 1852 | 199447706-678510727 |
| 00_session_identity_readonly.lua (after fix, see D1) | 1899 | 560909364-472752660 |
| 01_fingerprint_readonly.lua | 9308 | 762583068-302862684 |
| 02_check_targets_readonly.lua | 6879 | 694088372-486979192 |
| 03_apply_stageA.lua | 10379 | 661930388-234636907 |
| 04_apply_stageB.lua | 8826 | 906314251-170742285 |
| 05_compare_readonly.lua | 12249 | 581834565-645832399 |
| 06_measure_water_readonly.lua | 3686 | 500647535-891111921 |
| 09_rollback_guarded.lua | 12713 | 011971660-184267774 |
| 10_player_data_guard_server.lua | 2240 | 947711342-345287933 (pasted directly on the Play server: `loadstring` is not available there) |

## R-0. Guard tests (nothing may be written)
```
G1 02 with the live PLACE name: [12:38:53Z] ran 02 (as-run hash 694088372-486979192, 0 substitutions) in 0.0 s -> ERROR (script stopped): 02:6: wrong place: DreamBuilders_TEST_villa10_pool_edge.rbxl
G2 03 without CONFIRM: [12:38:53Z] ran 03 (as-run hash 553462669-809329223, 1 substitutions) in 0.0 s -> NOT RUN: set CONFIRM = "APPLY STAGE A"
G3 03 with CONFIRM, no session token: [12:38:53Z] ran 03 (as-run hash 721756470-180192471, 2 substitutions) in 0.0 s -> ERROR (script stopped): 03:12: session guard: run 00_session_identity_readonly.lua in this window and paste its token
G4 03 with CONFIRM and a made-up token: [12:38:53Z] ran 03 (as-run hash 618604285-744652690, 3 substitutions) in 0.0 s -> ERROR (script stopped): 03:12: session guard: run 00_session_identity_readonly.lua in this window and paste its token
G5 00 with a title path naming the LIVE file: [12:38:53Z] ran 00 ... -> ERROR (script stopped): 00:14: title bar file 'C:UsersPCDownloadsDreamBuilders.rbxl' is not this place 'DreamBuilders_TEST_villa10_pool_edge.rbxl'
G6 09 real run without CONFIRM: [12:38:53Z] ran 09 ... -> ERROR (script stopped): 09:21: real run needs CONFIRM = "ROLL BACK VILLA 10"
G7 09 ALL dry run before any change: [12:38:53Z] ran 09 ... -> ROLLBACK STOPPED - nothing written. 1 problem(s):
copy folder ServerStorage.Phase1Backups.Fix8Nov_Villa10 with both copies is missing
after the guard tests: copy folder present = false, Villa 10 pivot y = 8.07826042
```

**Defect D1, found here:**
- A Windows path typed into a normal Lua string loses its backslashes (`\U`, `\P` and `\D` are escape codes). So the correct path was also rejected:
  `title bar file 'C:UsersPCDownloadsDreamBuilders_TEST_villa10_pool_edge.rbxl' is not this place`
- Fixed: `TITLE_PATH` is now a raw string `[[...]]`. The same edit was made in the repo and in Studio, and both digests are 560909364-472752660.
- After the fix:
```
[12:39:14Z] ran 00 (TITLE_PATH = live file) -> ERROR (script stopped): 00:14: title bar file 'DreamBuilders.rbxl' is not this place 'DreamBuilders_TEST_villa10_pool_edge.rbxl'
[12:39:14Z] ran 00 (TITLE_PATH = test file) -> SESSION IDENTITY: place=DreamBuilders_TEST_villa10_pool_edge.rbxl path=C:\Users\PC\Downloads\DreamBuilders_TEST_villa10_pool_edge.rbxl PlaceId=0 at 2026-11-09T12:39:14Z
SESSION_TOKEN = "abe8-48ad-838e-4f34"  (valid only in this Studio window)
```

## R-1. Target check and BEFORE fingerprint
```
[12:38:53Z] ran 02 (as-run hash 590076420-855981884, 1 substitutions) in 0.0 s -> CHECK TARGETS (read-only): 47/47 house parts found, WorldPivot {453.682556, 8.07826042, -843.922485, -1, 0, -8.74227766e-08, 0, 1, 0, 8.74227766e-08, 0, -1} (exact match: true), dune #43 at (344.565, -15.000, -1060.260), 160 terrain cells checked, 0 differ from the expected before-values.
RESULT: OK - every target is exactly in the expected before-state.
```
The full `01` BEFORE output (all 116 groups, 7 terrain regions, 7 pivots, counts) is in `fingerprint_BEFORE_test_copy.txt`.

## R-2. Stage A (03), fingerprint (01) and compare (05)
```
[12:39:36Z] ran 03 (as-run hash 768290133-050367867, 3 substitutions) in 1.0 s -> STAGE A DONE: 47 parts moved, WorldPivot {453.682556, 8.07826042, -843.922485, -1, 0, -8.74227766e-08, 0, 1, 0, 8.74227766e-08, 0, -1} -> {453.682556, 0.50001049, -843.922485, -1, 0, -8.74227766e-08, 0, 1, 0, 8.74227766e-08, 0, -1}, dune at (385.000, -15.000, -1148.000), 80 terrain cells changed (expected 80), shell changed 0, copy folder 85 objects.
--- second run of 03 (must refuse) ---
[12:39:36Z] ran 03 ... -> STOP - nothing written. 130 problem(s):
Door_Bath: 0 matches at the before-position ...
[12:39:37Z] ran 05 (as-run hash 565940727-914085088, 2 substitutions) in 0.1 s -> COMPARE BEFORE -> AFTER_A (stage A): FAIL - 1 problem(s)
  parts: 48 changed (48 planned and exact), 70 added, 0 removed
  groups changed: DreamBuilders/Mountains, Homes/Villa_PalmHills_10_Pearl, ServerStorage/Phase1Backups/Fix8Nov_Villa10 (new)
  terrain: Villa10_work_area: 80 planned cells, 0 wrong, 0 unplanned changes; Villa_PalmHills_15_Pearl: 0 planned cells, 0 wrong, 0 unplanned changes; Villa_PalmHills_16_Classic: 0 ...; Villa_PalmHills_1_Classic: 0 ...; Villa_PalmHills_4_Charcoal: 0 ...; Villa_PalmHills_6_Classic: 0 ...; Villa_PalmHills_8_Charcoal: 0 planned cells, 0 wrong, 0 unplanned changes
  pivots: 31 model pivots compared; 30 other villas bit-identical; Villa 10 {453.682556, 8.07826042, ...} -> {453.682556, 0.50001049, ...}
  CountCells 3696540 -> 3696514 (delta -26)
  scripts identical
CountCells changed by -26, expected -80
```

**Defect D2:**
- The procedure assumed `Terrain:CountCells()` would change by −80 after Stage A and −64 after Stage B.
- The measured change is −26. `CountCells` does not count 4-stud voxels the way the procedure assumed.
- This expectation was never measured before; it was a calculation. Everything else in this compare passed.

## R-3. Play session after Stage A
**Player-data guard (script 10, Play server), before the purchase:**
```
PLAYER-DATA GUARD: PASS - no real player data can be read or written in this session
PASS  game.PlaceId == 0 (unpublished local file); it is 0
PASS  game.GameId == 0; it is 0
PASS  DataStoreService refuses access (probe GetDataStore, no read or write): You must publish this place to the web to access DataStore.
PASS  exactly 1 player in the test session (the owner's Studio test player); found 1
INFO  player crrusher14 (UserId 10958068692), in-game Money 100 (game currency only, not Robux)
```

**Purchase (H2)**, through the server function that the phone's Buy button calls (`ServerStorage.PropertyAPI`, "buy"). The in-game money was set to $30,000 inside the Play session only.
```
buy result: Bought!
money 30000 -> 5000 (change -25000, expected -25000)
OwnerId attribute: 10958068692 (player 10958068692)
sign text: crrusher14's Villa
My Home target: 289.6797790527344, 5, -982.9862060546875
second buy: Already owned
after purchase: DataStore access refused = true (You must publish this place to the web to access DataStore.), PlaceId 0
```

**H4: walking with real W key presses:**
- From 20 studs in front of the front door, the character walks up the entrance step (y 3.00 → 4.85 → 5.40) and into the house without being blocked.
- 20 samples, all `Running`, final position (314.27, 16.55, −1026.33) on the upper floor.
- A straight line from the My Home point to the door runs into the side of the house (stopped at x 292.7); that is not a real route.

**H5: the owner presses E 3.7 studs from the door:**
- Door_FrontL swings from (319.43, 6.80, −992.72) to (320.90, 6.80, −994.07). The door opens.

**Output:** no script errors ("Dream Builders server ready", "luxury UI ready", "City life: 55 AI people placed").

**After stopping Play:** a new fingerprint matched AFTER_A line for line (`identical to AFTER_A: true`). The Play session changed nothing in the place.

**Not repeated here:** H6–H10 (rooms, garage doors, car into the garage, bench, the dune's old spot). They passed on the live place on 8 Nov 17:28–17:51 with the same Stage A. That is historical evidence only.

## R-4. Stage B (04): FAILED
```
[12:42:41Z] ran 04 (as-run hash 008536194-124571964, 3 substitutions) in 1.0 s -> STAGE B PROBLEM: 47 Stage A parts confirmed, WorldPivot unchanged at {453.682556, 0.50001049, -843.922485, -1, 0, -8.74227766e-08, 0, 1, 0, 8.74227766e-08, 0, -1}, 64 terrain cells changed (expected 80: ...), shell changed 0.
cell x2 y1 z2 is Ground 30/256, expected Water 86/256
... (16 cells, every inner bottom cell)
[12:42:42Z] ran 05 ... -> COMPARE BEFORE -> AFTER_B (stage B): FAIL - 6 problem(s)
  parts: 48 changed (48 planned and exact), 70 added, 0 removed
  terrain: Villa10_work_area: 160 planned cells, 16 wrong, 0 unplanned changes; all six villa regions 0 / 0 / 0
  pivots: 31 model pivots compared; 30 other villas bit-identical; Villa 10 ... -> {453.682556, 0.50001049, ...}
  CountCells 3696540 -> 3696520 (delta -20)
  scripts identical
planned cell (328,0,-1044) is Ground 30/256, expected Water 86/256 ...
[12:42:42Z] ran 06 ... -> WATER CHECK PASS: no water on the deck anywhere around the pool
corners: 196 points, 0 with water above the deck
```

**Defect D3:**
- Writing Water into a cell that holds Ground does **not** replace the Ground. Roblox keeps the solid material and adds the water as a separate "liquid" amount.
- The 8 Nov test-copy method cleared the ground first (old step 4b); the new 04 script skipped that. So the 16 inner pool-floor cells stayed Ground.
- **Stage B as written is wrong and must not be used.**

## R-5. Guarded rollback R1, MODE STAGE_B, on the failed state
```
[12:43:04Z] ran 09 (dry run) -> DRY RUN OK - nothing written. Would do: MODE STAGE_B: 0 house parts to restore, pivot unchanged, dune unchanged, 64 terrain cells to restore, copy folder kept
[12:43:05Z] ran 09 (real run, 5 substitutions) in 1.0 s -> ROLLBACK DONE (MODE STAGE_B: ... 64 terrain cells to restore, copy folder kept). Do not save.
[12:43:05Z] ran 01 AFTER_B_ROLLBACK -> terrain Villa10_work_area 60x14x65 cells from (280,-16,-1200)  water 0  solid 3380  816544402-453269735
[12:43:05Z] ran 05 ... -> COMPARE BEFORE -> AFTER_B_ROLLBACK (stage B_ROLLBACK): FAIL - 1 problem(s)   [only: CountCells changed by -26, expected -80 (D2)]
all fingerprint lines identical to AFTER_A: true
```

**Defect D4, a coverage gap, the most important finding:**
- Roblox terrain cells have three channels: solid material, solid amount and **liquid amount**. `ReadVoxels`, which scripts 01, 02, 03, 04, 05 and 09 all use, shows only one material per cell. It **cannot see water hidden inside a solid cell**.
- So every "identical" result above is identical only for what `ReadVoxels` can see.
- To check this, I read all three channels (`ReadVoxelChannels`) of the 12 × 6 × 6 region around the pool:
```
test copy after Stage A + failed B + R1 STAGE_B:   144 non-empty cells, solid cells with hidden liquid 0
test copy after R0 (fresh reopen of the file):     224 non-empty cells, solid cells with hidden liquid 0   e.g. (328,0,-1044) Ground 0.1176 liquid 0.0000
byte copy of the LIVE file as saved at 00:59:      224 non-empty cells, solid cells with hidden liquid 40  e.g. (328,0,-1044) Ground 0.1176 liquid 0.3333
```
- The difference between 144 and 224 is the 80 upper cells that Stage A clears (planned).
- The hidden liquid appears **only in the saved live file**, not in the backup or the test copy. See `terrain_full_comparison.md` and `LIVE_FILE_CHANGE_0059.md`: it was left behind by the 8 Nov 17:25 attempt, whose undo restored only what `ReadVoxels` shows.
- For R1 this means the following:
  - In the test copy it returned the visible values and the hidden-liquid channel to the file's state (0), so no loss was seen here.
  - But R1 and every check would be **blind** to a hidden-liquid difference, exactly as the 8 Nov undo was.
  - **None of 01, 02, 03, 04, 05 or 09 may be used on the live place until they read, compare and write all three channels.**

**Not run, because the rehearsal stopped at the first failure as the rules require:** 07 (scripted walks), K1–K6 (real-key pool tests), 09 MODE ALL. A Stage B that gives the wrong pool cannot be acceptance-tested.

## R-6. Rollback R0 (the default): close without saving, reopen, verify
- 15:44 Riyadh: in the TEST window (title bar checked on a screenshot), File › Close Place.
- Studio asked "Save changes to DreamBuilders_TEST_villa10_pool_edge.rbxl?" and the answer was **Don't Save**.
- File check after closing:
```
6c804b239b6c3853e9329c82af22ed885d6f92552f5909222234f774bf1d4a5a  DreamBuilders_TEST_villa10_pool_edge.rbxl   (mtime unchanged: 8 Nov 21:49)
```
- After reopening, the pool region again shows `224 non-empty cells` and `Ground 0.1176 liquid 0.0000` in the pool-floor cells. See `terrain_full_comparison.md`: the original file has **no** hidden liquid there. The liquid 0.3333 is only in the saved live file.
- The test copy was then closed again. No changes, so there was no save prompt.
- R0 is the only rollback shown to be exact.
