# Whole-map terrain comparison: test copy (= backup) vs the saved live file (9 Nov 2026, ~15:30 Riyadh)

**Read-only. Neither file was changed.**
- **Left:** `DreamBuilders_TEST_villa10_pool_edge.rbxl`, SHA-256 `6c804b23…4a5a`, the same bytes as the backup.
- **Right:** `DreamBuilders_SNAPSHOT_live_saved_0059_READONLY.rbxl`, SHA-256 `00a816a4…c975`, a byte copy of `DreamBuilders.rbxl` as saved at 00:59. The live file itself was not opened.

**Extent of the scan:**
- Found with 263,169 downward and upward rays that hit only terrain, every 32 studs over ±8192: terrain lies in x −3680…2144, z −2080…3680, y −63.25…6.16.
- The scan covers x −4000…2464, y −96…32, z −2400…4000: **85,196,800 cells** of 4 studs, in 256-stud tiles.
- No tile on the border of the scan contains terrain.

## Pass 1: `ReadVoxels` (one material + occupancy per cell, occupancy compared to 1e-6)
| | Test copy | Saved live file |
|---|---|---|
| Non-air cells | 3,991,208 | 3,991,208 |
| Water cells | 3,608,933 | 3,608,933 |
| `Terrain:CountCells()` | 3,696,540 | 3,696,540 |
| Digest of all 163 tiles | 372299450-935005746 | 372299450-935005746 |

**Identical.** This method cannot see water inside a solid cell (defect D4).

## Pass 2: `ReadVoxelChannels` (SolidMaterial, SolidOccupancy, LiquidOccupancy; amounts compared to 1e-6)
| | Test copy | Saved live file |
|---|---|---|
| Cells with a solid | 382,275 | 382,275 |
| Cells with liquid | 3,609,084 | **3,609,124 (+40)** |
| Digest of all tiles | 970832667-980078572 | **373315517-920410380** |

**Tile by tile:** 161 of 163 tiles are identical. The two that differ:

| Tile (x, z origin) | Test copy: solid / liquid cells | Live file | Difference |
|---|---|---|---|
| (96, −1120) | 3616 / 144 | 3616 / 172 | +28 liquid |
| (352, −1120) | 3813 / 24 | 3813 / 36 | +12 liquid |

**Where the 40 cells are:**
- They match the 40 pool-floor cells of Villa 10's pool box exactly: x 324…364 is 10 columns, of which 7 fall in the first tile and 3 in the second; z −1048…−1032 is 4 rows; y 0…4 is 1 layer. 7 × 4 = 28 and 3 × 4 = 12.
- A direct read of that box:
```
live file (snapshot):  (328,0,-1044) Ground 0.1176 liquid 0.3333   ... all 40 cells x 324..360, z -1048..-1036: liquid 0.3333; solid cells with liquid = 40
test copy / backup:    (328,0,-1044) Ground 0.1176 liquid 0.0000   ... solid cells with liquid = 0
```

**Conclusion:**
- The saved live file differs from the backup in exactly one way that Roblox can read back: 40 hidden-water amounts (0.3333) in the ground cells under Villa 10's raised pool, at y 0–4.
- Every part, script and other property is byte-identical (`rbxl_diff_output.txt`).
- The rest of the terrain is identical at 1e-6 in all three channels.
