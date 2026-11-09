# Villa 10: Revision 2 report (answers Codex's Revision 2 audit)
9 Nov 2026, 15:25–16:10 Riyadh, by Claude.

Read together with Codex's 8 audit files and with `evidence/2026-11-09_villa10_rev2_rehearsal/`.

## Bottom line
- **The live project was not edited, saved or opened by me.**
- **Nothing is ready for a live run.** The test-copy rehearsal found four real defects in my scripts (D1–D4 below). Two of them would have made the live repair wrong or unverifiable.
- **The live file changed while I was away:** it was saved at 00:59 today. Exactly one thing differs from the backup: 40 cells of hidden water under Villa 10's pool, left by my 8 Nov attempt. Details: `evidence/2026-11-09_villa10_rev2_rehearsal/LIVE_FILE_CHANGE_0059.md`.
- **Decisions needed from you:** listed at the end.

**Status labels used below:**
- **Tested** means it was run and checked in Roblox Studio on the test copy.
- **Not tested** means it was not run.
- **Not authorized** means it has no current owner approval.

---

## 1. The four Codex conditions

### Condition 1: owner acceptance of the 46% shallow edge; remove unsupported pixel claims
| Item | Status |
|---|---|
| Owner acceptance record | **Prepared, not signed.** `VILLA10_OWNER_DECISIONS.md` (decision D-2) states the trade-off in plain numbers. I have **not** assumed acceptance. "Proceed with Option 1 only" (8 Nov 21:45) asked for the plan; it did not accept the result. |
| "Pixel-identical" claim | **Removed.** `VILLA10_LIVE_PROCEDURE.md` §1 said the screenshots were "pixel-identical". The measured result (`test_results.md`) was: close-up differs by at most 3 of 255 per pixel, the path view in 54 pixels (palm leaves), the top-down view in 344 pixels (a thin rendering line). The procedure now quotes those numbers, and its heading no longer says "(confirmed)". |

### Condition 2: full Villa 10 WorldPivot comparisons, alongside the neighbour checks
**Status: done in the scripts, and tested on the test copy.**

**What the scripts now record and check:**
- All 12 numbers of the Villa 10 WorldPivot CFrame are hard-coded from a read-only live read (9 Nov 00:30):
  `{453.682556, 8.07826042, −843.922485, −1, 0, −8.74e−08, 0, 1, 0, 8.74e−08, 0, −1}`
- `02`, `03`, `04` and `09` check the full CFrame exactly, before and after writing.
- `01` records the full WorldPivot of **every** villa model (31).
- `05` checks:
  - Villa 10 equals exactly the before-pivot + (0, −7.57825, 0), and only the y component changed.
  - The other 30 villas, including Villas 1, 6, 15, 8, 16 and 4, are **bit-identical**.

**Tested result (test copy):**
- Stage A: `{453.682556, 8.07826042, …} -> {453.682556, 0.50001049, …}`.
- `31 model pivots compared; 30 other villas bit-identical`.
- After the Stage-B-only rollback the pivot was unchanged, as planned.

### Condition 3: evidence of the exact prior approval for the 47 parts, pivot, dune #43 and the 80-cell water clearing
| Evidence | What it shows | Limit |
|---|---|---|
| Plan revision 2, committed **17:19** on 8 Nov (`67237f6`, `VILLA10_REPAIR_PLAN.md` §3) | Lists exactly: 47 parts y − 7.57825; WorldPivot y 8.07826 → 0.50001; dune #43 → (385, −15, −1148); 4a: 80 water cells y 8–16 → Air; 4b; 4c | A plan, not an approval |
| `VILLA10_REPAIR_STATUS.md` lines 2 and 25 (written by me at 21:42) | "The owner approved the plan (revision 2) at 17:20, with 6 conditions" | **My own record.** The owner's 17:20 message itself is not saved in the repo. The part of this chat that held it is no longer readable in my workspace (only the last 100 transcript lines remain), so I cannot quote it. |
| Codex found (in its own chat) the owner's message "I have approved the repairs, but Claude is executing them separately with backups and Play tests." | A broad approval of the repair work | Does not name the R10 values or the shallow edge |
| Owner, 8 Nov 21:45: "Stop and wait for my approval before applying anything to the live project." | Any new live application needs **new** approval | — |

**My conclusion:**
- The 17:20 approval covered **one attempt**. That attempt was made, failed check 12 and was undone.
- It does **not** authorize a new live run.
- So, as Codex asked, the 47 parts, pivot, dune and 80-cell clearing are **kept out of any live work until you approve them again**. Decision D-3 in `VILLA10_OWNER_DECISIONS.md` lists them one by one.
- **Please confirm or correct my record of the 17:20 approval.**

### Condition 4: rehearse every write and rollback script on a separate test copy, with the actual outputs
**Status: rehearsal run, then stopped at the first real failure, as the rules require.**

All outputs: `evidence/2026-11-09_villa10_rev2_rehearsal/rehearsal_log.md`.

| Step | Script | Result on the test copy |
|---|---|---|
| Guard tests G1–G7 | 00, 02, 03, 09 | **Tested, all refused.** Wrong place name; no CONFIRM; no session token; a made-up token; a title path naming the live file; a real rollback without CONFIRM; a rollback dry run with nothing to roll back. Nothing was written. |
| Session identity | 00 (new) | **Tested** after fixing D1. It prints a one-window token; write scripts refuse without it. |
| Target check | 02 | **Tested:** 47/47 parts, exact full pivot, dune, 160 cells OK |
| BEFORE fingerprint | 01 | **Tested** (full output saved) |
| Stage A | 03 | **Tested, correct:** 47 parts moved exactly; pivot y only; dune exact; 80 cells; 272 surrounding cells unchanged; copy folder 85 objects. Running it a second time refused. |
| Compare after A | 05 | Everything **PASS** except D2 (wrong CountCells expectation): 48 planned parts exact, 0 unplanned part, pivot, group or terrain changes; Villas 1, 6, 15, 8, 16 and 4 terrain 0 differences; scripts identical |
| Play: player-data guard | 10 (new) | **Tested, PASS** (section 2) |
| Play: purchase | H2 | **Tested:** −$25,000, sign "crrusher14's Villa", second buy refused |
| Play: walk in, front door | H4, H5 | **Tested** with real keys: walked up the entrance step into the house; E opened the front door |
| Play changed nothing | 01 again | **Tested:** identical to AFTER_A |
| Stage B | 04 | **FAILED (D3).** The 16 inner pool-floor cells stayed Ground |
| Water on the deck | 06 | Ran: 0 water on the deck (but on the failed Stage B) |
| R1 rollback, Stage B only | 09 STAGE_B | **Tested:** dry run, then real run; returned to the Stage A state as far as `ReadVoxels` can see |
| R0 rollback | close without saving and reopen | **Tested:** "Don't Save"; file SHA-256 unchanged `6c804b23…`; reopened clean |
| Scripted pool tests P1–P5 | 07 | **Not tested** (stopped at D3) |
| Real-key pool tests K1–K6 | 08 | **Not tested** (stopped at D3) |
| Full rollback | 09 ALL | **Not tested** (stopped at D3) |

## 2. Player-data protection during the purchase test (tested)
- **Script 10** (Play server, before and after the purchase):
  - `game.PlaceId == 0`, `GameId == 0`.
  - Roblox refuses DataStore access: *"You must publish this place to the web to access DataStore."*
  - Exactly 1 player in the session.
- **The game's own code** (read-only `script_grep` of the live place):
  - Every DataStore user (GameServer, PropertyServer, BusinessServer, ResidenceServer, ShopInventoryServer, StyleServer) obtains its store inside `pcall`.
  - With no access, the store stays nil, or every call is wrapped in `pcall`.
  - No `MarketplaceService` use (only a comment that says "no Robux"). No `HttpService` use.
- **So:** a Play test on this unpublished local file cannot read or write any real player data and cannot spend Robux. The in-game money is test money that disappears when Play stops.
- **Rule added to the procedure:** run script 10 before any purchase test. If it fails (for example, after the place is ever published), do not run the purchase test.

## 3. Defects found by the rehearsal (why it is not ready)
| # | Defect | Effect if run live | Fix |
|---|---|---|---|
| D1 | `00`: a Windows path in a normal Lua string loses its backslashes, so the identity check always failed | Blocks the run (safe) | **Fixed and tested:** raw string `[[…]]` |
| D2 | `05` expected `CountCells` to change by −80 (A) and −64 (B); the real change is −26 for Stage A | False FAIL (safe) | Use the measured values, or drop the check. It is only a count; it is not a location check. |
| D3 | `04` writes Water into cells that hold Ground; Roblox keeps the Ground and adds the water separately | **Wrong pool** (16 floor cells stay ground) | Clear the lower box completely first (all channels), then write the water. Then re-measure R10 and re-run the swim and deck tests, because the 8 Nov R10 numbers came from a different write method. |
| D4 | Every check reads terrain with `ReadVoxels`, which **cannot see water hidden inside ground cells** | Checks report "identical" when they are not. This is exactly how my 8 Nov undo left 40 hidden-water amounts behind. | Rewrite 01, 02, 03, 04, 05 and 09 to read, compare and write all three channels (`ReadVoxelChannels` / `WriteVoxelChannels`: SolidMaterial, SolidOccupancy, LiquidOccupancy) |

**Also confirmed and kept:**
- **R0 is the default rollback.** It is the only one shown to be exact.
- **The old `_G.V10_RESTORE()` stays excluded.**
- **The terrain-comparison claims are narrowed:**
  - The scripts compare the 7 named regions, the 272-cell shell and the 160-cell box.
  - A whole-map, three-channel comparison now exists as a separate read-only check: 85 million cells, `terrain_full_comparison.md`. It belongs in Revision 3, before and after the live run.
- **Saved-file comparison:** `tools/rbxl_diff.py` gives a reproducible diff of two place files (every class and property chunk). Its output is in the evidence folder.

## 4. Proposal: what Revision 3 must contain before any live run
1. **Your decision on the live file** (D-1). Recommended: restore it from the verified backup.
2. **Rewrite the terrain parts of 01, 02, 03, 04, 05 and 09 for all three channels.** Use exact before-values measured from the backup file (for example, pool-floor cells Ground 0.1176 with liquid 0).
3. **Stage B:** clear the 80 lower cells (all channels), then write the R10 water. Re-measure the water on the deck, then re-run P1–P5 and K1–K6 on the test copy. If the numbers change, you get a new acceptance sheet.
4. **Replace the CountCells expectation** with the whole-map, three-channel digest, before and after.
5. **A complete rehearsal again on the test copy:** everything in §1 condition 4, including 07, 08, 09 ALL and R0, with full outputs.
6. **Codex review**, then **your live authorization** for the exact stages (D-3, D-4).

## 5. Decisions needed from you
See `VILLA10_OWNER_DECISIONS.md`. In short:

| # | Decision |
|---|---|
| D-1 | **The live file:** restore it from the backup (recommended), or keep the 00:59 version. Also, if you know who saved at 00:59, please tell me. |
| D-2 | Do you accept the shallow pool edge? About 46% of the water area is wading-depth near the walls; the 32 × 8-stud middle is for swimming. (It will be re-measured after the D3 fix.) |
| D-3 | Re-approve each Stage A item for a future live run: 47 parts, full pivot, dune #43 → (385, −15, −1148), 80 upper water cells. |
| D-4 | Approve the Revision 3 work in §4 (test copy only). |

**Villa 6:** untouched and not started.
