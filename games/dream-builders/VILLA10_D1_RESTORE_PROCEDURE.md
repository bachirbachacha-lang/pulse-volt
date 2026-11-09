# D-1: restoring `DreamBuilders.rbxl` from the verified backup (procedure only, NOT done)
Prepared 9 Nov 2026, 16:20 Riyadh, by Claude, at the owner's request ("prepare the exact restoration procedure. Do not replace the main file yet").
**Nothing below has been run.** It needs the owner's separate approval.

## 1. Verified now (9 Nov, 16:02 Riyadh, read-only)
| File (all in `C:\Users\PC\Downloads\`) | Bytes | SHA-256 | Last written |
|---|---|---|---|
| `DreamBuilders.rbxl` (live) | 4,593,113 | `00a816a4b6fbba93559f98f1a7631bb2c7c870579d4bcfdd48ea39e3bc93c975` | 9 Nov 00:59:19 |
| `DreamBuilders_SNAPSHOT_live_saved_0059_READONLY.rbxl` (preserved copy of the live file) | 4,593,113 | `00a816a4b6fbba93559f98f1a7631bb2c7c870579d4bcfdd48ea39e3bc93c975` | 9 Nov 15:28:28 (made by Claude) |
| `DreamBuilders_backup_8Nov_before_villa10.rbxl` (verified backup) | 4,593,098 | `6c804b239b6c3853e9329c82af22ed885d6f92552f5909222234f774bf1d4a5a` | 8 Nov 17:22:01 |
| `DreamBuilders_TEST_villa10_pool_edge.rbxl` (test copy) | 4,593,098 | `6c804b239b6c3853e9329c82af22ed885d6f92552f5909222234f774bf1d4a5a` | 8 Nov 21:49:27 |

- **The snapshot is preserved:** `cmp` found it byte-for-byte equal to the live file.
- **The backup and the test copy** are byte-for-byte equal.
- **The only content difference** between the live file and the backup: 40 hidden-water cells under Villa 10's pool (`evidence/2026-11-09_villa10_rev2_rehearsal/`).

## 2. Restoration steps (after approval only)
1. **No Studio window may have the live file open.**
   - `list_roblox_studios` must not list `DreamBuilders.rbxl`.
   - If it does, ask the owner to close it, or close it with **Don't Save** after checking the title bar on a screenshot.
2. **Re-verify immediately before the copy.** Stage all three files and recompute the SHA-256:
   - live = `00a816a4…` with mtime 1794175159042 ms;
   - snapshot = `00a816a4…`;
   - backup = `6c804b23…`.
   - Any difference → stop and report.
3. **A second safety copy of the current live file:** `DreamBuilders_before_restore_<YYYYMMDD-HHMM>.rbxl`, written and then re-hashed (`00a816a4…`).
4. **Restore:**
   - Copy the backup's bytes to `C:\Users\PC\Downloads\DreamBuilders.rbxl` with `device_commit_files`.
   - Pass `expectedMtimeMs = 1794175159042`, so the write is refused if the live file changed since step 2.
5. **Verify:**
   - Stage the live file again: SHA-256 must be `6c804b23…4a5a`.
   - `tools/rbxl_diff.py` against the backup must print `IDENTICAL CONTENT`.
6. **Report:** the hashes before and after, and the tool output. The 00:59 version stays available as the snapshot and the safety copy.

## 3. If the restoration must be undone
- Copy `DreamBuilders_SNAPSHOT_live_saved_0059_READONLY.rbxl` back over `DreamBuilders.rbxl` in the same way.
- Check that the SHA-256 is `00a816a4…`.

## 4. What restoration does not do
- It does not repair Villa 10. The live game goes back to the state before 8 Nov 17:25: the house still raised, the dune still in place, no hidden water.
- It does not publish anything.
