# villa10_live scripts: status after the 9 Nov test-copy rehearsal
**None of these may be run on the live place.** See `../VILLA10_REV2_REPORT.md`.

| Script | Rehearsal result (test copy, 9 Nov) | Live use |
|---|---|---|
| 00_session_identity_readonly.lua (new) | Tested after fixing D1 (raw-string path). It refuses a title path naming the other file. | Blocked until Revision 3 |
| 01_fingerprint_readonly.lua | Ran (BEFORE, AFTER_A, AFTER_A_PLAY, AFTER_B, AFTER_B_ROLLBACK). Records the full pivot of every villa; digests are now order-independent. **Terrain via `ReadVoxels` cannot see hidden liquid (D4).** | Blocked (D4) |
| 02_check_targets_readonly.lua | Tested OK (47/47, exact full pivot). Its terrain before-values miss the liquid channel (D4). | Blocked (D4) |
| 03_apply_stageA.lua | **Tested, correct** (parts, pivot, dune, 80 cells, 272-cell shell). It refused a second run, and refused without CONFIRM or the session token. Terrain check is `ReadVoxels`-only (D4). | Blocked (D4, owner approval D-3) |
| 04_apply_stageB.lua | **FAILED (D3):** Ground stays under the written water. | Blocked; must be rewritten |
| 05_compare_readonly.lua | Ran. Pivot, part and neighbour checks worked. Wrong CountCells expectation (D2); `ReadVoxels`-only (D4). | Blocked (D2, D4) |
| 06_measure_water_readonly.lua | Ran, but on the failed Stage B. | Re-run after the fix |
| 07_acceptance_suite_client.lua | Not tested (rehearsal stopped at D3) | Not tested |
| 08_keyboard_helpers_client.lua | Not tested | Not tested |
| 09_rollback_guarded.lua | STAGE_B dry run and real run tested. Blind to hidden liquid (D4). MODE ALL not tested. | Blocked (D4); R0 stays the default |
| 10_player_data_guard_server.lua (new) | **Tested, PASS** on the Play server, before and after a purchase | Ready to use as written |
