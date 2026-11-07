# Dream Builders — Risk Register
Updated 8 Nov 2026.

| ID | Risk | Level | Evidence and response |
|---|---|---|---|
| A1 | Lobby ScreenFade sends nil text | High | LobbyServer fires without payload; Phone assigns first argument to TextLabel.Text. Back up, pass existing ride message/duration, test. |
| A2 | Phone line number differs by one | Medium | Report said Phone:342; inspected assignment is 341 and next tween 342. Capture a fresh baseline. |
| A3 | 20 asset IDs have no verified path/owner | Medium | Output says content representation is being generated. Map and test before replacement. |
| A4 | Available backup predates current place | High | 7 Nov backup is 4,523,491 bytes; current is 4,591,091 bytes, timestamp 8 Nov 01:06. Restore unverified; create checkpoint. |
| A5 | City bounds/routes unknown | High | No reliable coordinates; no relocation until measured. |
| A6 | Property/economy/business/data regression | High | Only property v1 has a Claude-reported Play test in shared handoff. Preserve data contracts and baseline-test. |
| A7 | Vehicle/road obstruction undiagnosed | High | Content exists; no collision/drive test by Codex. Reproduce on a named surface. |
| A8 | Metro behavior unknown | Medium | Scripts/folder exist; no trip test. |
| A9 | Performance risk | Medium | 19,719 BaseParts in snapshot; no profiling. |
| A10 | Phase 1 audit was incomplete/stale | Medium | Most requested docs were absent; this is a partial dated supplement. |

Do not mass-move content, replace systems, alter schemas, disable collision globally, or delete assets without dependencies and rollback.

## Historical place-edit note
The existing Known Issues file records that Codex previously changed Station_Downtown.StairTower and saved DreamBuilders.rbxl before reading the ownership split. This is not an action in the current audit. Claude should verify the current object and saved place against intended metro work; do not assume the historical dimensions remain current.