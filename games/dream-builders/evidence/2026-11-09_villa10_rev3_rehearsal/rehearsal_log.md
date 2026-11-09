# Villa 10 Revision 3: full test-copy rehearsal log (9 Nov 2026, 16:05–16:35 Riyadh = 13:05–13:35 UTC)
These are the **actual outputs** returned by Roblox Studio, copied verbatim (long outputs shortened only where marked). Times are UTC.

**Where it ran:**
- Only in `C:\Users\PC\Downloads\DreamBuilders_TEST_villa10_pool_edge.rbxl` (SHA-256 `6c804b23…4a5a`, byte-identical to the backup).
- Title bar checked on a screenshot (`C:\Users\PC\Downloads\DreamBuilders_TEST_villa10_pool_edge.rbxl - Roblox Studio`). MCP studio `56186a96…`, and `09922353…` after the R0 reopen.
- **The live place was not opened.** The owner approved D-4 (test copy only).

## R3-0. Loading the scripts
- **Shared blocks:** the 47-part list, the pivot block and the terrain block were loaded once, then expanded into each script. Their digests match `seg_*`.
- **Each expanded script** was compared with the file in `villa10_live/`:

| Script | Bytes | Digest (file = loaded copy) |
|---|---|---|
| 00_session_identity_readonly.lua | 1899 | 560909364-472752660 |
| 01_fingerprint_readonly.lua | 12591 | 994058471-299595279 |
| 02_check_targets_readonly.lua | 9683 | 320714108-188354711 |
| 03_apply_stageA.lua | 12681 | 790232592-764336276 |
| 04_apply_stageB.lua | 10778 | 428322611-596927244 |
| 05_compare_readonly.lua | 13524 | 783107587-819093380 |
| 06_measure_water_readonly.lua | 3686 | 500647535-891111921 |
| 09_rollback_guarded.lua | 15065 | 063828980-269245444 |

- **Compile check in Studio's own Luau** (`loadstring`, compile only): all 8 compile.
- **Play-only scripts:** 07, 08, 10 and 11 run in Play, where `loadstring` is not available. They were pasted verbatim.
- **Runner:** it only replaces named constants (`PLACE`, `LABEL`, `CONFIRM`, `SESSION_TOKEN`, `MODE`, `DRY_RUN`, `BASE/NEW/STAGE`) and prints the digest of the text that ran.

**Exact before-values, measured read-only first** with `ReadVoxelChannels`. The values are SolidMaterial / SolidOccupancy×255 / LiquidOccupancy×255, and all are exact multiples of 1/255:
```
y -4..0 | box:  | shell: Ground/227/0 x72
y 0..4  | box: Ground/30/0 x40 | shell: Ground/30/0 x32
y 4..8  | box: Air/0/0 x40     | shell: Air/0/0 x32
y 8..12 | box: Air/0/113 x40   | shell: Air/0/0 x32
y 12..16| box: Air/0/63 x40    | shell: Air/0/0 x32
y 16..20| box:                 | shell: Air/0/0 x72
```

## R3-1. Guard checks, identity, target check, BEFORE
```
G1 [13:11:09Z] ran 02 (… 0 substitutions) -> ERROR (script stopped): 02:5: wrong place: DreamBuilders_TEST_villa10_pool_edge.rbxl
G2 [13:11:09Z] ran 03 (CONFIRM set, no token) -> ERROR (script stopped): 03:12: session guard: run 00_session_identity_readonly.lua in this window and paste its token
G3 [13:11:09Z] ran 04 (CONFIRM set, no token) -> ERROR (script stopped): 04:14: session guard: ...
G4 [13:11:09Z] ran 09 (dry run, nothing applied) -> ROLLBACK STOPPED - nothing written. 1 problem(s): copy folder ServerStorage.Phase1Backups.Fix8Nov_Villa10 with both copies is missing
[13:11:09Z] ran 00 -> SESSION IDENTITY: place=DreamBuilders_TEST_villa10_pool_edge.rbxl path=C:\Users\PC\Downloads\DreamBuilders_TEST_villa10_pool_edge.rbxl PlaceId=0 at 2026-11-09T13:11:09Z
SESSION_TOKEN = "2e7f-3348-7528-58e8"  (valid only in this Studio window)
[13:11:09Z] ran 02 (as-run hash 163036010-291157060) -> CHECK TARGETS (read-only): 47/47 house parts found, WorldPivot {453.682556, 8.07826042, -843.922485, -1, 0, -8.74227766e-08, 0, 1, 0, 8.74227766e-08, 0, -1} (exact match: true), dune #43 at (344.565, -15.000, -1060.260), 160 pool-box cells checked in 3 channels, 0 differ from the before-values.
RESULT: OK - every target is exactly in the expected before-state.
[13:11:23Z] ran 01 (as-run hash 042748589-964360542) in 14.5 s -> FINGERPRINT BEFORE ... (full output: identical to fingerprint_AFTER_R0.txt lines 2..end; see R3-8)
  terrain WHOLE MAP outside the pool box: 85196640 cells, with solid 382235, with liquid 3609004, digest 387526230-379272660
  terrain POOL BOX (...): y0:Ground/30/0 x40, y1:Air/0/0 x40, y2:Air/0/113 x40, y3:Air/0/63 x40
```

## R3-2. Stage A (03) and compare (05): PASS
```
[13:11:33Z] ran 03 (as-run hash 690107833-580879038, 3 substitutions) in 1.0 s -> STAGE A DONE: 47 parts moved, WorldPivot {453.682556, 8.07826042, ...} -> {453.682556, 0.50001049, ...}, dune at (385.000, -15.000, -1148.000), 80 pool-box cells changed (expected 80), 0 box cells differ from the planned Stage A state (3 channels), shell changed 0, copy folder 85 objects.
second run: -> STOP - nothing written. 56 problem(s): part Door_Bath at (353.183,25.178,-1016.122): 0 matches ...
[13:11:48Z] ran 01 AFTER_A -> ... terrain WHOLE MAP outside the pool box: 85196640 cells, with solid 382235, with liquid 3609004, digest 387526230-379272660
  terrain POOL BOX: y0:Ground/30/0 x40, y1:Air/0/0 x40, y2:Air/0/0 x40, y3:Air/0/0 x40
[13:11:48Z] ran 05 -> COMPARE BEFORE -> AFTER_A (stage A): PASS - only the planned changes
  parts: 48 changed (48 planned and exact), 70 added, 0 removed
  groups changed: DreamBuilders/Mountains, Homes/Villa_PalmHills_10_Pearl, ServerStorage/Phase1Backups/Fix8Nov_Villa10 (new)
  terrain: [all 7 named regions] 0 unplanned changes; pool box in AFTER_A: 0 of 160 cells differ from the planned A state (3 channels); pool box in BEFORE: 0 of 160 cells differ from the measured before-values; whole map outside the box (85196640 cells, 3 channels): 387526230-379272660 -> 387526230-379272660, 0 tiles differ
  pivots: 31 model pivots compared; 30 other villas bit-identical; Villa 10 {..., 8.07826042, ...} -> {..., 0.50001049, ...}
  CountCells 3696540 -> 3696514 (delta -26, information only)
  scripts identical
```

## R3-3. Stage B (04), compare (05), water on the deck (06): PASS
```
[13:11:57Z] ran 04 (as-run hash 524514851-622201884, 3 substitutions) in 1.0 s -> STAGE B DONE: 47 Stage A parts confirmed, WorldPivot unchanged at {453.682556, 0.50001049, ...}, 80 pool-box cells changed (expected 80), 0 box cells differ from the planned R10 state (3 channels), shell changed 0.
[13:12:13Z] ran 01 AFTER_B -> terrain POOL BOX: y0:Air/0/0 x24, y0:Air/0/86 x16, y1:Air/0/3 x24, y1:Air/0/91 x16, y2:Air/0/0 x40, y3:Air/0/0 x40
  terrain WHOLE MAP outside the pool box: ... digest 387526230-379272660
[13:12:13Z] ran 05 -> COMPARE BEFORE -> AFTER_B (stage B): PASS - only the planned changes
  (same part, group, pivot and region lines as Stage A; pool box in AFTER_B: 0 of 160 cells differ from the planned B state (3 channels); whole map: 0 tiles differ)
  CountCells 3696540 -> 3696522 (delta -18, information only)
[13:12:13Z] ran 06 -> WATER CHECK PASS: no water on the deck anywhere around the pool
S (37 pts): out0.10:0.00/0 ... out3.00:0.00/0 in0.25:2.66-4.16 dry1 in0.75:2.66-4.34 dry1 in1.50:2.66-4.60 dry1 in3.00:2.66-4.93 dry1
N (37 pts): out0.10:0.00/0 ... out3.00:0.00/0 in0.25:2.66-2.66 dry37 in0.75:2.66-4.04 dry1 in1.50:2.66-4.31 dry1 in3.00:2.66-4.78 dry1
W (23 pts): out0.10:0.00/0 ... out3.00:0.00/0 in0.25:2.66-2.66 dry23 in0.75:4.02-4.04 in1.50:4.02-4.31 in3.00:4.04-4.78
E (23 pts): out0.10:0.00/0 ... out3.00:0.00/0 in0.25:2.66-4.01 dry23 in0.75:2.66-4.01 dry23 in1.50:4.02-4.18 in3.00:4.04-4.70
corners: 196 points, 0 with water above the deck
```
**D3 is fixed:** all 40 lower-layer cells are `Air` solid (the ground is cleared). The inner 16 hold liquid 86/255 and the ring 0 (y 0–4). At y 4–8 the inner cells hold 91 and the ring 3.

## R3-4. Play session (after Stage B)
**Player-data guard (10), before the purchase:**
```
PLAYER-DATA GUARD: PASS - no real player data can be read or written in this session
PASS  game.PlaceId == 0 (unpublished local file); it is 0
PASS  game.GameId == 0; it is 0
PASS  DataStoreService refuses access (probe GetDataStore, no read or write): You must publish this place to the web to access DataStore.
PASS  exactly 1 player in the test session (the owner's Studio test player); found 1
INFO  player crrusher14 (UserId 10958068692), in-game Money 100 (game currency only, not Robux)
```

**Purchase (server `PropertyAPI` "buy", in-game test money only):**
```
buy: Bought! | money 30000 -> 5000 | sign: crrusher14's Villa | second buy: Already owned | after purchase DataStore refused: true (You must publish this place to the web to access DataStore.)
```

**Scripted pool suite (07), P1–P5:**
```
VERDICT: PASS
TOTALS: samples 1334, deck-swim 0, stuck 0
P1 26 straight walks (house side 1.0/1.5/2.2 out, garden side 1.0/1.5/2.2/3.0, west end and steps end 1.0/1.5/2.2, both ways): every walk deck-swim 0, stuck 0, moved 16.5-42.7 studs
P2 8 corner walks (4 corners, both ways): every walk deck-swim 0, stuck 0, moved 9.9-10.1
P3 6 laps (3 each way) at 1.3 studs out: 70-72 samples each, deck-swim 0, stuck 0
P4 escape: house-side corner E 3/4 free, house-side corner W 3/4, garden corner W 4/4, garden corner E 4/4, house path x-12 2/4, x0 2/4, x+12 3/4, garden side x-10 3/4, x+10 3/4; deck-swim 0, stuck 0 everywhere
P5 swim test: walk in over the steps: reached (Swimming=15,Running=6) ; deep middle: reached (Swimming=5) ; house-side wall: reached (Swimming=9) ; middle: reached (Swimming=4) ; garden-side wall: reached (GettingUp=1,Running=1,Swimming=3) ; middle: reached (Swimming=4) ; west wall: reached (GettingUp=1,Running=1,Swimming=10) ; middle: reached (Swimming=15) ; steps: reached (Swimming=18) | swimming samples in the deep middle 61 | exited onto the deck: true | stuck 0
```
Every P1–P4 row is in `pool_suite_07_rows.txt`.

**Depth map (11, new): where a player swims or stands**
```
444 grid points: SWIM 291 (66%), STAND 149 (34%), other 4 | 0-1 studs from a wall: 0 of 48 swim; 1-2 studs from a wall: 0 of 90 swim; 2-3 studs from a wall: 67 of 82 swim; 3-4 studs from a wall: 74 of 74 swim; 4-5 studs from a wall: 66 of 66 swim; 5-6 studs from a wall: 58 of 58 swim; 6-7 studs from a wall: 26 of 26 swim
map (S = swims, . = stands; x from west wall to steps end, z from garden side to house side):
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
```

**Real key presses (08 helpers + Studio keyboard input), K1–K6:**
```
K1 (house-side path, W held westward from the east corner): 39 samples | moving: Running=32 | deck-swim 0 | stuck-swim 0
K1 repeat (W westward along the house-side path): 38 samples | moving: Running=28 | deck-swim 0 | stuck-swim 0 | t0.0 Running@deck(21.5,5.5,8.9) | final (-27.8, 8.9)
K2 retry (house-side path, W held eastward from the west corner): 39 samples | moving: Running=23 | deck-swim 0 | stuck-swim 0 | t0.0 Running@deck(-21.5,5.5,8.9) | final (16.8, 8.9)
K3 (clockwise lap: W west, D north, S east, A south): 83 samples | moving: Running=77 | deck-swim 0 | stuck-swim 0 | final (21.6, 4.8) | covered x -21.3..21.6, z -9.3..8.9
K4 (counter-clockwise lap: D north, W west, A south, S east): 85 samples | moving: Running=78 | deck-swim 0 | stuck-swim 0 | final (21.2, 8.7) | covered x -21.3..21.7, z -9.3..8.9
K5a (house-side path east, then round the south-east corner north along the steps end): 136 samples | moving: Running=130 | deck-swim 0 | stuck-swim 0 | final (24.8, -9.2) | covered x 12.0..24.8, z -9.2..8.9
K5b (house-side path west, then round the south-west corner north along the west end): 135 samples | moving: Running=57 | deck-swim 0 | stuck-swim 0 | final (-24.8, -8.2) | covered x -24.8..-12.0, z -8.2..8.9
K6a (W in over the steps toward the middle): 136 samples | moving: Swimming=22,Running=23 | deck-swim 0 | stuck-swim 0 | t0.0 Running@deck(25.0,5.5,-0.0) ; t10.4 Running@pool(18.0,7.9,-0.0) ; t10.7 Swimming@pool(12.0,5.9,-0.0) ; t13.2 Running@pool(-18.0,5.4,0.0) | final (-18.3, 0.0) | swimming samples in the deep middle 20
K6b (W + Space held back to the steps and out): 138 samples | moving: Jumping=2,Running=3,Swimming=2,Freefall=45 | deck-swim 0 | stuck-swim 0 | ... t11.9 Freefall@deck(19.9,11.4,0.0) ; t12.0 Running@deck(21.5,6.9,0.0) ... | final (67.0, 0.0) | out on the deck: true | state now Running
```

**Three key runs recorded no movement** (the first K2, the first K3 and the first K5a). In each, the sampling window had closed before the next tool call delivered the keys. Each was re-run with a 15-second window, and the re-runs are the results above. None of them showed any swimming or getting stuck.

**Output:** no script errors (only "Asset content representation is being generated" loading warnings).

## R3-5. Rollback R1, MODE STAGE_B: PASS
```
Play left the Edit place unchanged (every fingerprint line equal to AFTER_B): true
[13:29:12Z] ran 09 (dry run) -> DRY RUN OK - nothing written. Would do: MODE STAGE_B: 0 house parts to restore, pivot unchanged, dune unchanged, 80 terrain cells to restore, copy folder kept
[13:29:13Z] ran 09 (real, 5 substitutions) -> ROLLBACK DONE (MODE STAGE_B: ... 80 terrain cells to restore, copy folder kept). Do not save.
[13:29:28Z] ran 01 AFTER_B_ROLLBACK -> terrain POOL BOX: y0:Ground/30/0 x40, y1:Air/0/0 x40, y2:Air/0/0 x40, y3:Air/0/0 x40 ; WHOLE MAP digest 387526230-379272660
[13:29:28Z] ran 05 -> COMPARE BEFORE -> AFTER_B_ROLLBACK (stage B_ROLLBACK): PASS - only the planned changes
every fingerprint line equal to AFTER_A (incl. the 3-channel pool box and whole map): true
```

## R3-6. Stage B again, then full rollback R1 (MODE ALL): PASS
```
[13:29:40Z] ran 04 -> STAGE B DONE: ... 80 pool-box cells changed (expected 80), 0 box cells differ from the planned R10 state (3 channels), shell changed 0.
second Stage B gives exactly the first Stage B state (every fingerprint line): true
[13:29:55Z] ran 09 (dry run) -> DRY RUN OK - nothing written. Would do: MODE ALL: 47 house parts to restore, pivot from {453.682556, 0.50001049, ...} to {453.682556, 8.07826042, ...}, dune to (344.565, -15, -1060.26), 160 terrain cells to restore, copy folder removed after verification
[13:29:56Z] ran 09 (real) -> ROLLBACK DONE (MODE ALL: ...). Do not save.
[13:30:11Z] ran 05 -> COMPARE BEFORE -> AFTER_ROLLBACK (stage ROLLBACK): PASS - only the planned changes
  parts: 0 changed (0 planned and exact), 0 added, 0 removed
  groups changed: none
  terrain: [7 regions] 0 unplanned changes; pool box in AFTER_ROLLBACK: 0 of 160 cells differ from the planned ROLLBACK state (3 channels); whole map: 0 tiles differ
  pivots: 31 model pivots compared; 30 other villas bit-identical; Villa 10 {..., 8.07826042, ...} -> {..., 8.07826042, ...}
  CountCells 3696540 -> 3696540 (delta 0, information only)
  scripts identical
every fingerprint line equal to BEFORE (parts, groups, 31 pivots, 7 regions, whole map, pool box, scripts, counts): true
[13:30:11Z] ran 02 -> CHECK TARGETS: 47/47 ..., 160 pool-box cells checked in 3 channels, 0 differ from the before-values. RESULT: OK
```

## R3-7. Rollback R0 (close without saving, reopen): PASS
- **13:30 UTC:** in the TEST window (title checked), File › Close Place. Studio asked "Save changes to DreamBuilders_TEST_villa10_pool_edge.rbxl?", and the answer was **Don't Save**.
- **File check:**
```
6c804b239b6c3853e9329c82af22ed885d6f92552f5909222234f774bf1d4a5a  DreamBuilders_TEST_villa10_pool_edge.rbxl   (mtime unchanged: 8 Nov 21:49:27)
00a816a4b6fbba93559f98f1a7631bb2c7c870579d4bcfdd48ea39e3bc93c975  DreamBuilders.rbxl   (live, unchanged)
```
- **Reopened** (new studio id `09922353…`). `_G` was empty after the reopen (`_G.V10SRC false, _G.FULL_BEFORE false, _G.V10_SESSION false`). So 01 was loaded again (12591 bytes, 994058471-299595279) for a fresh fingerprint.

## R3-8. A fresh fingerprint after R0 equals BEFORE
```
01 loaded (12591 bytes, 994058471-299595279), run at 13:33:01Z
FIRST LINE: FINGERPRINT AFTER_R0  place=DreamBuilders_TEST_villa10_pool_edge.rbxl  parts=25827  CountCells(info only)=3696540  scripts=65 (374888 chars, 871961411-265938881)
HASH OF LINES 2..END: 858563262-268904951 (12887 bytes)
```
- **Saved copy:** the full output is in `fingerprint_AFTER_R0.txt`. Its lines 2..end hash to 858563262-268904951 (Python), the same as in Studio.
- **Compared with BEFORE** (13:11:23Z, the session before the R0 close):
  - All 127 digests (116 groups, 7 regions, whole map and pool box) are identical, in the same order.
  - So are the pivots, counts and pool-box summary.
  - The script digest on line 1 is identical too: 871961411-265938881.
- **This shows:** a fresh session gives the same order-independent fingerprint, and R0 restores the place exactly.

The test copy was then closed. There were no changes, so there was no save prompt.
