# Villa 10: owner decisions and acceptance record
Prepared 9 Nov 2026 by Claude. Updated 16:45 with the owner's decisions of 16:00.

**Owner's decisions, 9 Nov 16:00 Riyadh (copied word for word):**
> "D-1: I am considering restoring DreamBuilders.rbxl from the verified backup. Before doing anything, confirm that the 00:59 snapshot is preserved, verify both SHA-256 hashes, and prepare the exact restoration procedure. Do not replace the main file yet. D-2: Defer acceptance of R10. Fix Stage B first, remeasure the pool and provide a new acceptance sheet. D-3: No live authorization for any Stage A or Stage B changes yet. D-4: APPROVED — proceed with Revision 3 work on a separate test copy ONLY."

| Decision | Status after 16:00 |
|---|---|
| D-1 | **Open.** Snapshot preserved and hashes verified; the procedure is in `VILLA10_D1_RESTORE_PROCEDURE.md`. Not restored. |
| D-2 | **Deferred.** The new sheet after the Stage B fix is `VILLA10_R10_ACCEPTANCE_SHEET.md`. |
| D-3 | **No live authorization.** |
| D-4 | **Approved and done** (test copy only): `VILLA10_REV3_REPORT.md`. |

**Owner's instruction, 9 Nov 19:34 Riyadh (copied word for word):**
> "Please package all Revision 3 reports, scripts, test outputs, rollback evidence and the updated live restoration procedure into one complete ZIP. Do not restore or modify the live project. I want Codex to independently review the entire Revision 3 package before making any live decisions. Keep D-1, D-2 and D-3 unresolved until I explicitly decide them."

So D-1, D-2 and D-3 stay **unresolved**. Next: Codex reviews the complete Revision 3 package (`villa10_rev3_complete_review_2026-11-09.zip`).

The original decision texts follow.

To decide, reply in chat with the decision number and your answer, for example "D-1: restore. D-2: accept." I will copy your exact words and the time into this file. A decision counts only when it comes from you in chat.

## D-1. The live file saved at 00:59
- **Facts:**
  - `DreamBuilders.rbxl` was saved at 00:59 today, not by Claude.
  - Compared with the verified backup (`6c804b23…`), exactly one thing differs: 40 cells of hidden water under Villa 10's raised pool (x 324–364, y 0–4, z −1048 to −1032).
  - Every part, script and other property is byte-identical.
  - The hidden water came from the 8 Nov repair attempt, whose undo could not see it.
- **Options:**
  1. **Restore the live file from the backup (recommended).** A byte copy of `DreamBuilders_backup_8Nov_before_villa10.rbxl` replaces `DreamBuilders.rbxl`; the result must have SHA-256 `6c804b23…4a5a`. The 00:59 version stays kept as `DreamBuilders_SNAPSHOT_live_saved_0059_READONLY.rbxl` (`00a816a4…`).
  2. **Keep the 00:59 version.** All baselines would then use `00a816a4…` and must include the hidden water.
- **Your decision:** ____ (not given)

## D-2. Acceptance of the shallow pool edge (the R10 trade-off)
**What a player would get at Villa 10**, as measured on 8 Nov in the test copy. It must be re-measured after the Stage B fix (D3), and you will see the new numbers before any live run.
- **On the deck around the pool** (every side, every corner and the narrow 3.6-stud path by the house): you walk normally and never start swimming by accident. 8 Nov: 0 swimming samples in 910, and 0 in real key presses.
- **In the water:**
  - The middle, 32 × 8 studs (about **54%** of the water area), is deep: you swim.
  - Near the walls (about **46%** of the water area) it is shallow: you stand and wade on the pool floor instead of swimming.
  - The band is 1.9 studs wide along the house wall, 2.7 along the garden wall and the west end, and 3.1 at the steps end.
- **Looks:** from the deck the water looks the same. Screenshot differences: at most 3 of 255 per pixel in the close-up; 54 pixels (palm leaves) in the path view.
- **Getting in and out:** easy, at the steps end.
- **Compared with other villas:** at Villas 1 and 15 you can swim right up to the walls, but players there also start swimming by accident on the deck (9% and 24% of the walking test).
- **The alternative (R9):**
  - About 82% of the water stays deep.
  - But it had 1 accidental-swim sample in 797.
- **Your decision:** accept R10 / prefer R9 / neither: ____ (not given)

## D-3. Stage A items for a future live run
These were planned in revision 2 (commit `67237f6`, 17:19 on 8 Nov) and recorded as approved at 17:20 (Claude's record). The approval covered one attempt, which was undone. Each item needs your approval again:

| Item | Change | Your approval |
|---|---|---|
| A1 | 47 Villa 10 house parts down 7.57825 studs (list: `VILLA10_LIVE_PROCEDURE.md` §2.1) | ____ |
| A2 | Villa 10 WorldPivot: full CFrame `{453.682556, 8.07826042, −843.922485, −1, 0, −8.74e−08, 0, 1, 0, 8.74e−08, 0, −1}` → the same with y 0.50001049 | ____ |
| A3 | Dune #43 from (344.565, −15, −1060.26) to (385, −15, −1148), same size and rotation | ____ |
| A4 | The 80 old raised-pool water cells (x 324–364, y 8–16, z −1048 to −1032) → Air | ____ |
| B1 | The 80 lower pool cells → the R10 water, after the D3 fix, the re-test and D-2 | ____ |

## D-4. Revision 3 work (test copy only, no live edits)
- Rewrite the scripts for all three terrain channels.
- Fix Stage B.
- Re-measure R10.
- Run the full rehearsal again, including the pool tests and both rollbacks.
- Send the result to Codex.
- **Your decision:** ____ (not given)

**Live implementation** needs a separate, explicit authorization after D-1 to D-4 and Codex's review.
