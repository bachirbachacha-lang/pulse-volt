# Villa 10, Revision 3.1: device tests on a separate test copy (9 and 15 Nov 2026)
By Claude. Test copy only: `DreamBuilders_TEST_rev31_devices.rbxl`. **The live project was not opened, edited, saved or restored.**
Owner decisions D-1, D-2 and D-3 are still unresolved. Codex's Revision 3.1 checklist (six findings) was never received, so the six findings are **Not started**.

## 1. Files (SHA-256, checked 15 Nov 08:20 and 14:55 Riyadh)
| File | SHA-256 | Note |
|---|---|---|
| DreamBuilders.rbxl (live) | 00a816a4b6fbba93559f98f1a7631bb2c7c870579d4bcfdd48ea39e3bc93c975 | Unchanged. mtime 1794175159042 (9 Nov 00:59), 4,593,113 bytes |
| DreamBuilders_SNAPSHOT_live_saved_0059_READONLY.rbxl | 00a816a4… (same) | Unchanged |
| DreamBuilders_backup_8Nov_before_villa10.rbxl | 6c804b239b6c3853e9329c82af22ed885d6f92552f5909222234f774bf1d4a5a | Unchanged |
| DreamBuilders_TEST_villa10_pool_edge.rbxl | 6c804b23… (same) | Unchanged |
| DreamBuilders_TEST_rev31_devices.rbxl | 65816c1b74f90f7724eecf71607cc210b1998363415be7c302370a62d95fa0f9 at 08:20 | **Was saved twice, not by Claude** (see section 2) |

## 2. The test copy was saved (not by Claude)
- Created 9 Nov 19:5x as a byte copy of the backup (hash 6c804b23…, 4,593,098 bytes, mtime 1794243189780).
- Stage A and Stage B applied in memory on 9 Nov 19:56 (outputs below). Claude never used Save.
- On 15 Nov the file was found changed: 4,593,670 bytes, mtime 1794245836577 (9 Nov 20:37 Riyadh). Then changed again: 4,594,209 bytes, mtime 1794720908942 (15 Nov about 08:35), about ten minutes after Claude reopened it; Studio was closed by then.
- Who or what saved it is **not known** (possibly Save chosen when Studio was closed). It is a test copy, so no live data is affected. But it matters for the live procedure: rollback R0 depends on closing with "Don't Save".
- Useful side effect: it is the first **saved-file check** of Stage A + B. Reopened from disk (15 Nov 08:26 and 14:56), read-only:
  - `box cells differing from R10 (3 channels): 0`
  - `pivot == PIVOT_AFTER: true` (y 0.5000104904174805)
  - `dune at (385.000, -15.000, -1148.000)`
  - `copy folder: 85 objects`, `PoolFloor y 2.570 (Stage A expects 2.570)`, `PlaceId 0`
  - Instance count in the file: 29,932 (backup) to 30,018 = +86 (the copy folder and its 85 objects). `tools/rbxl_diff.py` output is not a clean property diff because the added instances shift the referent lists.
- **Not done:** a full fingerprint (script 01) and compare (script 05) on the saved file; the whole-map terrain digest on the saved file.

## 3. Stage A and B on this copy (9 Nov 19:56 Riyadh, verbatim)
```
[16:56:56Z] ran 00 -> SESSION IDENTITY: place=DreamBuilders_TEST_rev31_devices.rbxl ... PlaceId=0
[16:56:57Z] ran 03 (as-run hash 629252459-346480087) -> STAGE A DONE: 47 parts moved, WorldPivot {453.682556, 8.07826042, -843.922485, ...} -> {453.682556, 0.50001049, -843.922485, ...}, dune at (385.000, -15.000, -1148.000), 80 pool-box cells changed (expected 80), 0 box cells differ from the planned Stage A state (3 channels), shell changed 0, copy folder 85 objects.
[16:56:58Z] ran 04 (as-run hash 327096756-636177746) -> STAGE B DONE: 47 Stage A parts confirmed, WorldPivot unchanged ..., 80 pool-box cells changed (expected 80), 0 box cells differ from the planned R10 state (3 channels), shell changed 0.
```

## 4. Mobile (Studio Device Simulator, iPhone XR, real touch input sent with the mouse)
`TouchEnabled=true`, TouchGui with dynamic thumbstick and Jump button present, `LastInputType Touch`. Samples every 0.1 s; pool-relative coordinates.

| Run | Date | Result (verbatim summary) |
|---|---|---|
| House-side path east to west | 9 Nov | `131 samples, moving: Running=117, deck-swim 0, stuck-swim 0`, covered x -20.1..21.5, z 8.2..8.9 |
| House-side path west to east | 9 Nov | `127 samples, moving: Running=72, deck-swim 0, stuck-swim 0`, covered x -21.5..10.9 |
| Round the west end, house side to garden side | 9 Nov | `177 samples, moving: Running=72, deck-swim 0`, covered x -24.5..7.4, z -10.2..8.5 |
| Walk in over the steps end | 9 Nov | `Running@deck -> t5.8 Swimming@pool(16.1,5.9,-3.4)`, deck-swim 0 |
| Garden side west to east (starts 2.0 studs from the wall, drifts to 5.9) | 15 Nov | `moving: Running=46, deck-swim 0, stuck-swim 0`, covered x -21.5..31.6, z -12.2..-8.3 |
| Swim the length and climb out, thumbstick only | 15 Nov | start `Swimming@pool(-10.4,5.5,-0.2)`; with the stick held: `t10 x2.7 v12.8 Swim`, `t11 x16.7 v14.4 Swim`, `t11.2 GettingUp@pool(17.0,5.8,-0.6)`, `t11.3 Running@pool(18.9,7.3)`, `t11.4 Running@deck(20.5,8.3,-0.6)` |
| Jump button, press held 0.4 s, on the house-side path | 15 Nov | `jumps 2` of 2, touches on the button `(738,297) gp=true` |

Disclosed problems and corrections:
- **Correction of the 14 Nov note** ("two Jump taps produced no jump, the City Map button may be the cause"): on 9 Nov the taps were aimed beside the button (at gui x about 689; the button starts at 706). Not a game fault.
- Instant taps exactly on the Jump button (mouse down and up in the same moment): 0 jumps in 2 taps, although both touches reached the button. With a 0.4 s press: 2 of 2. Likely an effect of how the emulator delivers an instant click; **not tested on a real phone.**
- Three touch runs on 15 Nov looked like very slow swimming (`stuck-swim 133`, `102`, `78`). They were delay artefacts: the sampling started several seconds before the drag arrived (`MoveDirection magnitude 0.00` for the first 8.5 s in the instrumented run). Once the stick was held, swim speed was 13 to 14 studs/s.
- One garden-side run went the wrong way (west, away from the pool) because the mobile camera turned after it was set; it was repeated.
- The phone layout of the HUD was seen but not measured: the City Map panel sits behind the Jump button and the left menu is close to the thumbstick area. This is a whole-game UI matter, not Villa 10.
- **Not tested:** a real phone or tablet; other screen sizes; two fingers at once (move while jumping); the corners and laps with touch.

## 5. New finding: one-frame swim blips when jumping beside the house wall (15 Nov, Play, per-frame sampling)
Method: character placed at deck points, `Humanoid:ChangeState(Jumping)` twice per point, state read every frame for 1.3 s per jump.

| Area | Points | Jumps | Frames | Swimming frames | Longest run | Ended swimming |
|---|---|---|---|---|---|---|
| House side, 1.0 / 1.8 / 2.6 studs from the wall, x -15..15 | 15 | 30/30 | 2374 | **6 (0.25%)** | 1 frame | 0 |
| House side z scan (rel z 7.0 to 9.6) at x 0 and -12 | 14 | 28/28 | 2215 | **7 (0.32%)** | 1 frame | 0 |
| Garden side | 15 | 30/30 | 2371 | 0 | 0 | 0 |
| West end | 9 | 18/18 | 1421 | 0 | 0 | 0 |
| East end beyond the steps | 9 | 18/18 | 1420 | 0 | 0 | 0 |

- All blips were at rel z 8.9 to 9.6 (the strip of the path nearest the house), on landing; the character was always Running at the end and never stuck. None at rel z 7.0 to 8.6.
- Also seen once with the touch Jump button at 0.1 s sampling: `t1.4 Swimming@deck(0.0,5.6,9.1) ; t1.5 Running@deck`.
- Terrain there: the cell z -1036..-1032, y 4..8 is the R10 ring with trace water 3/255; the next cells toward the house (z -1032..-1028) have Ground 30/255 at y 0..4 and no water. Floor is `Mansion_stone`, y 2.480.
- **Experiment (Play only, discarded on Stop, then undone and re-checked: `box cells differing from R10: 0`):** house-side ring row, layer 2, water 3/255 set to 0. Result on the same strip: `15 points, 30 of 30 jumps, 2370 frames, 0 swimming frames`.
- Meaning: the 3/255 trace water in the house-side ring row is the cause. A variant of R10 without it on the house side is a **candidate only**: it has not had the deck-walk suite, the depth map or the water-on-deck check, and it is not proposed for live use.
- The Revision 3 suites (P1-P5, K1-K6) did not include jumping on the deck, so they did not see this.

## 6. Gamepad: NOT TESTED (blocked)
- Studio's Controller Emulator was used (15 Nov). Its input arrived: `events: Gamepad2/ButtonA`, left stick `0, 0.8585858941078186, 0`, later `stick max 1.00`, `last input Gamepad2`.
- The character did not move (`0 samples with stick input`, `jumps 0`). This PC reports two gamepads: `Gamepad1 connected=true inputs=24 supportsA=true | Gamepad2 connected=true inputs=24 supportsA=false`. The emulator is Gamepad2; the default control scripts follow Gamepad1 (some other connected device).
- The Studio keyboard tool does not deliver gamepad key codes (`events: (none)`).
- To test: the owner plays with a real controller, or the other gamepad device is disconnected so the emulator becomes Gamepad1.

## 7. Two players: NOT TESTED (not completed)
- Test > Start Test Session > Server and Clients started a local server (place name `Server`, PlaceId 0, pool water read on the server: `pool inner layer 2 liquid 91 (R10 expects 91)`), but **0 clients joined** (`0 players`) in about a minute. Adding clients needs more clicks in the server window; the session was stopped there.

## 8. State left behind
- Studio windows may still be open (the test copy in Edit, a stopped Server window, an empty window). Close them with **Don't Save**. The live file is not open in any of them.
