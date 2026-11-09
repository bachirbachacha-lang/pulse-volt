# Villa 10: Revision 3 report (owner decision D-4, test copy only)
9 Nov 2026, 16:00–16:50 Riyadh, by Claude.
**The live project was not opened, edited, saved or published.** `DreamBuilders.rbxl` is still `00a816a4…`, last written 00:59.

## Summary
| # | Required by the owner | Status | Evidence |
|---|---|---|---|
| 1 | Rewrite all terrain scripts for SolidMaterial, SolidOccupancy and LiquidOccupancy | **Done and tested** on the test copy | `villa10_live/` 01, 02, 03, 04, 05, 09; `rehearsal_log.md` |
| 2 | Correct the Stage B ground clearing | **Done and tested** | R3-3: all 80 lower cells are `Air` solid with the planned water; 0 of 160 box cells differ |
| 3 | Replace the wrong CountCells expectations | **Done:** `CountCells` is now information only. It is replaced by an exact whole-map, three-channel check outside the pool box (85,196,640 cells), plus an exact 160-cell box check. | R3-2, R3-3, R3-5, R3-6 |
| 4 | Run all pool acceptance tests | **Done, all PASS** | P1–P5: 1,334 samples, 0 deck-swim, 0 stuck. K1–K6 with real keys: PASS. Water on the deck: 0. New depth map. |
| 5 | Run both rollbacks, including full rollback | **Done, all PASS** | R1 Stage B only, R1 full (MODE ALL), R0 close-without-save and reopen |
| 6 | Complete evidence and a new Codex handoff | **Done** | `evidence/2026-11-09_villa10_rev3_rehearsal/`, ZIP |
| D-1 | Confirm the snapshot, verify the hashes, prepare the restore procedure | **Done; not restored** | `VILLA10_D1_RESTORE_PROCEDURE.md` |
| D-2 | New acceptance sheet after the fix | **Done; acceptance deferred** | `VILLA10_R10_ACCEPTANCE_SHEET.md` |

## 1. What changed in the scripts
**Terrain is read and written only with `ReadVoxelChannels` / `WriteVoxelChannels`, all three channels.**
- The amounts are compared as whole numbers in 1/255 steps. Roblox stores them exactly that way; the measured values were all exact multiples.
- `ReadVoxels` is no longer used: it cannot see water inside a solid cell (D4).

**Exact before-values** (measured on the test copy, which is the same as the backup):

| Layer | Pool box (40 cells each) |
|---|---|
| y 0–4 | Ground 30 / no water |
| y 4–8 | empty |
| y 8–12 | water 113 |
| y 12–16 | water 63 |

**Stage A (03)** writes box layers y 8–16 to empty (no solid, no water).

**Stage B (04)** writes layers y 0–8 in one call, setting all three channels.
- Solid = Air in every cell. This clears the thin ground (fixes D3).
- Water: middle 86 / 91, ring 0 / 3.

**Fingerprint (01)** records:
- the parts and the full pivots, as before;
- the 7 named regions cell by cell in 3 channels;
- the **whole map** in 3 channels (163 tiles, 85,196,640 cells), with the pool box kept separately;
- an exact box summary.

**Compare (05)** requires:
- the pool box exactly in the planned state for the stage;
- the whole-map digest outside the box to be unchanged (any changed 256-stud tile is named);
- 0 changes in the named regions;
- the parts and pivots as before.

`CountCells` is printed only.

**Rollback (09)** checks every box cell in 3 channels (planned state or already restored, otherwise stop), and restores all 3 channels.

**New Play scripts:**
- **11 (depth map):** where a player swims or stands in the pool.
- **10 (player-data guard):** unchanged since Revision 2.

## 2. Rehearsal results (all on the test copy)
| Step | Result |
|---|---|
| Guards | Wrong place → refused. CONFIRM without the session token → refused (03, 04). Rollback dry run with nothing applied → stopped. |
| Target check (02) | 47/47 parts, exact full pivot, dune, 160 cells in 3 channels: OK |
| Stage A + compare | **PASS.** 48 planned parts exact; 0 unplanned part, group, pivot or terrain change; whole map outside the box identical; box exactly as planned. Running it a second time refused. |
| Stage B + compare | **PASS.** Box exactly R10 in 3 channels; whole map identical; 272 surrounding cells unchanged. |
| Water on the deck (06) | **PASS:** 0 points with water outside the pool (4 sides × 7 distances, 196 corner points) |
| Player-data guard + purchase | **PASS.** No DataStore access ("You must publish this place…"), before and after the purchase; −$25,000 of in-game test money; sign shown; second buy refused. |
| P1–P5 (scripted) | **PASS:** 1,334 samples, 0 deck-swim, 0 stuck. Every escape point had ≥ 2 free directions. The swim test reached every target and climbed out. |
| K1–K6 (real keys) | **PASS:** old trap path both ways, both laps, both house-side corners: always running. Swim in over the steps, deep middle, climb out with W + Space. |
| Depth map (11) | 66% of the pool area swims, 34% stands (shallow edge, about 1–2 studs wide). See the acceptance sheet. |
| Play changed nothing | Fingerprint after Play = AFTER_B |
| R1 Stage B only | **PASS:** fingerprint = AFTER_A in every line |
| Stage B again | Same state as the first time (reproducible) |
| R1 full (MODE ALL) | **PASS:** fingerprint = BEFORE in every line; target check OK again |
| R0 | **PASS:** "Don't Save"; file SHA-256 unchanged `6c804b23…`; after the reopen a fresh fingerprint equals BEFORE (all 127 digests) |

**Rehearsal problems, reported honestly:**
- Three real-key runs at first recorded no movement. The keys arrived after the sampling window had closed (tool-call delay). They were re-run with a 15-second window and passed. They are listed in the log.

## 3. What is still not covered (gaps)
- **The saved-file check after a live save has not been rehearsed.** I did not save any test file. `tools/rbxl_diff.py` exists and is tested on unchanged files.
  - The live procedure expects these differences after saving: Villa 10's part CFrames, the dune's CFrame, Villa 10's WorldPivot, the new copy folder objects, and `Terrain.SmoothGrid`.
  - Rehearsing it would need a Save As of the test copy to a third, throw-away file. That is your call.
- **Not tested:** mobile or gamepad controls, two players at once, and new screenshots of the Revision 3 water.
- **The scripts expect the backup's pool-box values.** On the current live file (00:59 version, hidden water 85 in the 40 floor cells) the target check would stop.
  - That is intended: D-1 must be decided first.
  - If you keep the 00:59 version, the before-values in the scripts need a change and a new rehearsal.
- **Studio windows:** the empty one and the read-only snapshot copy are still open. The live file is not open anywhere.

## 4. Live procedure outline (Revision 3), for later; not authorized
Only after D-1 (file decision), D-2 (acceptance) and D-3 (your explicit live authorization of the exact stages), plus Codex's review.
1. **Pre-flight:**
   - Hashes of the live file, backup and snapshot.
   - Fresh open of the live file.
   - Title-bar screenshot, then `00` (session token).
   - `02` must be OK, then `01` BEFORE.
   - The BEFORE digests must equal this rehearsal's BEFORE (after a D-1 restore, the files are byte-identical).
2. **Stage A (if authorized):** `03`, then `01` + `05` A. Then Play checks with `10` first.
3. **Stage B (if authorized):** `04`, then `01` + `05` B, then `06`. Then Play: `10`, `07`, `11`, K1–K6.
4. **Rollbacks:**
   - Any failure → **R0** (close, "Don't Save", reopen, hash check).
   - R1 (`09`) only if R0 is impossible.
5. **Save:** only if everything passes, and only with your explicit approval. Then hash the file, run `rbxl_diff.py` against the backup, and keep the report.
