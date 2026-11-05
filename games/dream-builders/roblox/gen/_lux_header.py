"""mapgen.py: one source of truth for the Dream Builders map v2.
Builds a list of primitives (boxes, cylinders, balls, signs, lights, water) and writes
  ../02_map_v2.lua   (data-driven Luau for the Studio command bar)
  map_v2.json        (same data, rendered as previews by render_preview.py)
Roblox units (studs), Y up. Run: python3 mapgen.py"""
import json, math, random, os
random.seed(11)
HERE = os.path.dirname(os.path.abspath(__file__))
P = []        # primitives
PAL = []      # colour palette
MATS = ["SmoothPlastic", "Grass", "Asphalt", "Concrete", "Wood", "WoodPlanks", "Brick", "Marble", "Glass", "Metal", "Neon", "Sand", "Ground", "Slate", "Fabric", "Pebble", "LeafyGrass", "Cobblestone", "DiamondPlate", "Foil"]
def col(rgb):
    if rgb not in PAL: PAL.append(rgb)
    return PAL.index(rgb)
def mi(m): return MATS.index(m)
def add(kind, size, pos, rgb, mat="SmoothPlastic", ry=0, rx=0, rz=0, group="Map", tr=0, name=None, extra=None):
    d = dict(k=kind, s=[round(v, 2) for v in size], p=[round(v, 2) for v in pos], r=[round(rx, 1), round(ry, 1), round(rz, 1)],
             c=col(rgb), m=mi(mat), g=group)
    if tr: d["t"] = tr
    if name: d["n"] = name
    if extra: d["x"] = extra
    P.append(d); return d
def box(*a, **k): return add("B", *a, **k)
def cyl(*a, **k): return add("C", *a, **k)   # cylinder along X in Roblox; we pass rz=90 for upright
def ball(*a, **k): return add("S", *a, **k)
def sign(size, pos, ry, text, bg, fg, group="Signs"):
    return add("T", size, pos, bg, "SmoothPlastic", ry=ry, group=group, extra={"text": text, "fg": list(fg)})
