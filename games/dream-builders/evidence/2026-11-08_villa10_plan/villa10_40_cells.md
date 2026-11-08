# Villa 10 pool: the 40 terrain cell columns (read-only inspection, 8 Nov 2026)

Read in Studio Edit mode. Each terrain cell is a 4 x 4 x 4 stud box on the fixed terrain grid.
- Areas are the cell's 16 stud² seen from above. They are split into: inside the pool's water area, under the pool walls, and past the outer face of the walls. Measured for the pool **after** lowering; x and z don't change.
- Pool after lowering: water area x 325.28 to 363.08, z -1046.72 to -1034.12. Outer faces of the walls: x 324.02 to 364.34, z -1047.98 to -1032.86. Pool floor top y 2.66, wall top y 5.90.
- **Now** columns: y 0-4 / y 4-8 / y 8-16. **After** column: y 0-4 / y 4-8.
- **After** fill is the expected value, using the same water-fill rule measured at Villas 1, 7, 8 and 15. It will be measured after the change.

| # | x | z | now y 0-4 | now y 4-8 | now y 8-12 / 12-16 | in water area | under walls | past the walls | after fill y 0-4 / 4-8 | where |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 324 to 328 | -1048 to -1044 | Ground 12% | Air | Water 44% / 25% | 7.4 | 8.4 | 0.2 | ~34% / ~35% | reaches past the wall (garden side 0.02, west 0.02 studs), under the deck |
| 2 | 328 to 332 | -1048 to -1044 | Ground 12% | Air | Water 44% / 25% | 10.9 | 5.0 | 0.1 | ~34% / ~35% | reaches past the wall (garden side 0.02 studs), under the deck |
| 3 | 332 to 336 | -1048 to -1044 | Ground 12% | Air | Water 44% / 25% | 10.9 | 5.0 | 0.1 | ~34% / ~35% | reaches past the wall (garden side 0.02 studs), under the deck |
| 4 | 336 to 340 | -1048 to -1044 | Ground 12% | Air | Water 44% / 25% | 10.9 | 5.0 | 0.1 | ~34% / ~35% | reaches past the wall (garden side 0.02 studs), under the deck |
| 5 | 340 to 344 | -1048 to -1044 | Ground 12% | Air | Water 44% / 25% | 10.9 | 5.0 | 0.1 | ~34% / ~35% | reaches past the wall (garden side 0.02 studs), under the deck |
| 6 | 344 to 348 | -1048 to -1044 | Ground 12% | Air | Water 44% / 25% | 10.9 | 5.0 | 0.1 | ~34% / ~35% | reaches past the wall (garden side 0.02 studs), under the deck |
| 7 | 348 to 352 | -1048 to -1044 | Ground 12% | Air | Water 44% / 25% | 10.9 | 5.0 | 0.1 | ~34% / ~35% | reaches past the wall (garden side 0.02 studs), under the deck |
| 8 | 352 to 356 | -1048 to -1044 | Ground 12% | Air | Water 44% / 25% | 10.9 | 5.0 | 0.1 | ~34% / ~35% | reaches past the wall (garden side 0.02 studs), under the deck |
| 9 | 356 to 360 | -1048 to -1044 | Ground 12% | Air | Water 44% / 25% | 10.9 | 5.0 | 0.1 | ~34% / ~35% | reaches past the wall (garden side 0.02 studs), under the deck |
| 10 | 360 to 364 | -1048 to -1044 | Ground 12% | Air | Water 44% / 25% | 8.4 | 7.5 | 0.1 | ~34% / ~35% | reaches past the wall (garden side 0.02 studs), under the deck |
| 11 | 324 to 328 | -1044 to -1040 | Ground 12% | Air | Water 44% / 25% | 10.9 | 5.0 | 0.1 | ~34% / ~35% | reaches past the wall (west 0.02 studs), under the deck |
| 12 | 328 to 332 | -1044 to -1040 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 13 | 332 to 336 | -1044 to -1040 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 14 | 336 to 340 | -1044 to -1040 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 15 | 340 to 344 | -1044 to -1040 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 16 | 344 to 348 | -1044 to -1040 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 17 | 348 to 352 | -1044 to -1040 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 18 | 352 to 356 | -1044 to -1040 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 19 | 356 to 360 | -1044 to -1040 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 20 | 360 to 364 | -1044 to -1040 | Ground 12% | Air | Water 44% / 25% | 12.3 | 3.7 | 0.0 | ~34% / ~35% | water area + under a wall |
| 21 | 324 to 328 | -1040 to -1036 | Ground 12% | Air | Water 44% / 25% | 10.9 | 5.0 | 0.1 | ~34% / ~35% | reaches past the wall (west 0.02 studs), under the deck |
| 22 | 328 to 332 | -1040 to -1036 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 23 | 332 to 336 | -1040 to -1036 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 24 | 336 to 340 | -1040 to -1036 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 25 | 340 to 344 | -1040 to -1036 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 26 | 344 to 348 | -1040 to -1036 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 27 | 348 to 352 | -1040 to -1036 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 28 | 352 to 356 | -1040 to -1036 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 29 | 356 to 360 | -1040 to -1036 | Ground 12% | Air | Water 44% / 25% | 16.0 | 0.0 | 0.0 | ~34% / ~35% | fully inside the water area |
| 30 | 360 to 364 | -1040 to -1036 | Ground 12% | Air | Water 44% / 25% | 12.3 | 3.7 | 0.0 | ~34% / ~35% | water area + under a wall |
| 31 | 324 to 328 | -1036 to -1032 | Ground 12% | Air | Water 44% / 25% | 5.1 | 7.4 | 3.5 | ~34% / ~35% | reaches past the wall (house side 0.86, west 0.02 studs), under the deck |
| 32 | 328 to 332 | -1036 to -1032 | Ground 12% | Air | Water 44% / 25% | 7.5 | 5.0 | 3.4 | ~34% / ~35% | reaches past the wall (house side 0.86 studs), under the deck |
| 33 | 332 to 336 | -1036 to -1032 | Ground 12% | Air | Water 44% / 25% | 7.5 | 5.0 | 3.4 | ~34% / ~35% | reaches past the wall (house side 0.86 studs), under the deck |
| 34 | 336 to 340 | -1036 to -1032 | Ground 12% | Air | Water 44% / 25% | 7.5 | 5.0 | 3.4 | ~34% / ~35% | reaches past the wall (house side 0.86 studs), under the deck |
| 35 | 340 to 344 | -1036 to -1032 | Ground 12% | Air | Water 44% / 25% | 7.5 | 5.0 | 3.4 | ~34% / ~35% | reaches past the wall (house side 0.86 studs), under the deck |
| 36 | 344 to 348 | -1036 to -1032 | Ground 12% | Air | Water 44% / 25% | 7.5 | 5.0 | 3.4 | ~34% / ~35% | reaches past the wall (house side 0.86 studs), under the deck |
| 37 | 348 to 352 | -1036 to -1032 | Ground 12% | Air | Water 44% / 25% | 7.5 | 5.0 | 3.4 | ~34% / ~35% | reaches past the wall (house side 0.86 studs), under the deck |
| 38 | 352 to 356 | -1036 to -1032 | Ground 12% | Air | Water 44% / 25% | 7.5 | 5.0 | 3.4 | ~34% / ~35% | reaches past the wall (house side 0.86 studs), under the deck |
| 39 | 356 to 360 | -1036 to -1032 | Ground 12% | Air | Water 44% / 25% | 7.5 | 5.0 | 3.4 | ~34% / ~35% | reaches past the wall (house side 0.86 studs), under the deck |
| 40 | 360 to 364 | -1036 to -1032 | Ground 12% | Air | Water 44% / 25% | 5.8 | 6.8 | 3.4 | ~34% / ~35% | reaches past the wall (house side 0.86 studs), under the deck |

**Totals** (of 640 stud²):
- 476.3 in the water area, 128.2 under the walls, 35.5 past the walls.
- 16 cells are fully inside the water area.
- Past the walls: 0.02 studs on the garden side and the west, 0.86 on the house side, none on the east (steps) side.

**What covers the bits past the walls after lowering:** 100% the deck part (`Mansion_stone`, top y 2.48). Sampled every 0.25 stud on Villa 15, which has the same layout.

**Cells around them** (one ring, y -4 to 16) and below them (y -4 to 0, Ground 89%): not changed by any step.

**Compared with Villa 1:** Villa 1's cells reached 94.4 stud² past its walls, Villa 10's only 35.5, so less water should sit outside Villa 10's walls. This is a prediction, to be measured after the change.

**Villa 15 (correct, same design) for reference:**
- Its pool cells are 34% (y 0-4) / 35% (y 4-8). The garden-side row is 27% because Villa 15 sits differently on the grid.
- Its east edge column has no water, since only 0.01 stud of it is inside the pool.
