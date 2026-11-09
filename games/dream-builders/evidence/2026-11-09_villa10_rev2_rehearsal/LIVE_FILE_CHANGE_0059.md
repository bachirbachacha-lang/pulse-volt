# The live file changed at 00:59 on 9 Nov (found 15:26)

## What was found
- `C:\Users\PC\Downloads\DreamBuilders.rbxl` was last written at **9 Nov 2026, 00:59:19 Riyadh**.
- **Its SHA-256 is now `00a816a4b6fbba93559f98f1a7631bb2c7c870579d4bcfdd48ea39e3bc93c975`** (4,593,113 bytes). Until then it matched the backup: `6c804b23…4a5a`, 4,593,098 bytes.
- **The backup** `DreamBuilders_backup_8Nov_before_villa10.rbxl` and **the test copy** are unchanged (`6c804b23…4a5a`).

## Who saved it
- **Not Claude.** My last action on the live window was a read-only query at about 00:36: Villa 15's part list, then 23:53/00:30 pivot reads. I never pressed Save or Ctrl+S on the live place in this session.
- When I came back at 15:25, every Studio window had been closed.
- Most likely the live Studio window was closed and "Save" was chosen in the "Save changes?" box. Studio asks because the window still held unsaved changes from the 8 Nov 17:25 repair attempt and its undo.
- **I can't confirm this. Please tell me if you know what happened.**

## Exactly what changed (all read-only checks)
1. `tools/rbxl_diff.py` (output in `rbxl_diff_output.txt`):
   - All 107 classes, all 29,932 instances and 2,131 of 2,132 class properties are **byte-identical** to the backup.
   - The only property that differs is `Terrain.SmoothGrid` (the terrain data).
2. Whole-map terrain comparison (`terrain_full_comparison.md`): the only content difference is **40 cells of hidden water (liquid 0.3333) inside the ground cells under Villa 10's raised pool**, at x 324…364, y 0…4, z −1048…−1032. The rest of the terrain is identical in all three channels.

## How the hidden water got there (my mistake on 8 Nov)
- The 17:25 repair attempt wrote the pool water into the thin ground layer under Villa 10's pool.
- The undo restored the cells to the values `ReadVoxels` shows (Ground 30/256). It did not clear the hidden liquid amount, because `ReadVoxels` cannot see it.
- So my 21:42 report, "0 terrain cells different", was **incomplete**.
  - The saved file really was unchanged at that time.
  - The open session still held the 40 hidden-water amounts.
  - When the session was saved at 00:59, they went into the file.

## Effect on the game
- The 40 cells are inside the ground under Villa 10's raised pool and house platform, far below the raised pool (pool floor at y 10.15).
- I have **not** Play-tested whether a player can reach or see this water. Status: **not tested**.

## Options (your decision; nothing has been done)
1. **Restore the live file from the verified backup.** A byte copy of `DreamBuilders_backup_8Nov_before_villa10.rbxl` replaces `DreamBuilders.rbxl`, and the SHA-256 must then be `6c804b23…4a5a`.
   - It removes the hidden water and nothing else (the diff above shows nothing else differs).
   - Before that, the current file is kept as `DreamBuilders_SNAPSHOT_live_saved_0059_READONLY.rbxl` (already made, same SHA-256 `00a816a4…`).
   - **Recommended.** It needs your approval, because it replaces the live file.
2. **Leave it.** The Villa 10 repair would later rewrite those 40 cells anyway. But then every baseline and rollback must use the new hash `00a816a4…` and include the hidden water.
