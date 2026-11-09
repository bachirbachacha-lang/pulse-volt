# villa10_live scripts: status after the Revision 3 rehearsal (9 Nov 2026, test copy only)
**None of these has been run on the live place.** Live use needs the owner's decisions D-1 to D-3 and Codex's review. Full log: `../evidence/2026-11-09_villa10_rev3_rehearsal/rehearsal_log.md`.

| Script | Digest | Revision 3 rehearsal (test copy) |
|---|---|---|
| 00_session_identity_readonly.lua | 560909364-472752660 | Tested: token issued; write scripts refuse without it |
| 01_fingerprint_readonly.lua | 994058471-299595279 | Tested. Three channels, whole map, pool box. The same digests in a fresh session after R0. |
| 02_check_targets_readonly.lua | 320714108-188354711 | Tested OK, before and after the full rollback |
| 03_apply_stageA.lua | 790232592-764336276 | **Tested, PASS.** Refused a second run, and refused without the token |
| 04_apply_stageB.lua | 428322611-596927244 | **Tested, PASS** twice. The ground is cleared (D3 fixed) |
| 05_compare_readonly.lua | 783107587-819093380 | Tested: PASS for stages A, B, B_ROLLBACK and ROLLBACK |
| 06_measure_water_readonly.lua | 500647535-891111921 | Tested: no water on the deck |
| 07_acceptance_suite_client.lua | 252240190-242483067 | Tested (pasted in Play): PASS, 1,334 samples |
| 08_keyboard_helpers_client.lua | 496461429-736564378 | Tested (pasted in Play, with the K1 set-up lines added after it in the same paste): K1–K6 |
| 09_rollback_guarded.lua | 063828980-269245444 | **Tested:** dry run and real run, MODE STAGE_B and MODE ALL, both PASS |
| 10_player_data_guard_server.lua | 947711342-345287933 | Tested (pasted on the server): PASS before and after the purchase |
| 11_depth_map_client.lua | 654871042-539089174 | Tested (pasted in Play): 444 points |

**Before-values are those of the backup** (`6c804b23…`). On the current live file (00:59 version, hidden water in the pool floor) `02`, `03` and `09` stop by design until owner decision D-1.
