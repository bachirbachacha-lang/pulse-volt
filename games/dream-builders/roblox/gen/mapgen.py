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

# ---------------------------------------------------------------- palette
GRASS, ROAD, LINE, WALK, CURB = (78, 142, 66), (42, 43, 48), (240, 210, 80), (196, 192, 184), (150, 148, 142)
WHITE, DARK, GOLD, GLASS = (245, 244, 240), (34, 37, 46), (255, 190, 40), (120, 180, 225)
SIZE = 1200
box((SIZE, 2, SIZE), (0, -1, 0), GRASS, "Grass", group="Ground", name="Ground")

# ---------------------------------------------------------------- roads
BLV_W, ST_W = 44, 28
ZS = [-300, -100, 100, 300]          # cross streets
XS = [-260, 260]                     # side avenues
def road(x, z, w, l, along_z):
    if along_z: box((w, 0.4, l), (x, 0.2, z), ROAD, "Asphalt", group="Roads")
    else: box((l, 0.4, w), (x, 0.21, z), ROAD, "Asphalt", group="Roads")
# boulevard with planted median
road(-13, 0, 18, 1000, True); road(13, 0, 18, 1000, True)
box((8, 0.9, 1000), (0, 0.45, 0), (120, 118, 112), "Concrete", group="Roads", name="Median")
box((6, 1.0, 1000), (0, 0.5, 0), (70, 128, 58), "LeafyGrass", group="Roads", name="MedianGrass")
for z in ZS: road(0, z, ST_W, 1000, False)
for x in XS: road(x, 0, ST_W, 1000, True)
road(0, -470, ST_W, 1000, False); road(0, 470, ST_W, 1000, False)   # ring ends
# lane dashes
for z in range(-490, 491, 24):
    if any(abs(z - zz) < 20 for zz in ZS + [-470, 470]): continue
    for x in (-13, 13): box((0.7, 0.05, 9), (x, 0.43, z), LINE, "Neon", group="Roads")
for zz in ZS + [-470, 470]:
    for x in range(-490, 491, 24):
        if abs(x) < 30 or any(abs(x - xx) < 20 for xx in XS): continue
        box((9, 0.05, 0.7), (x, 0.44, zz), WHITE, "SmoothPlastic", group="Roads")
for xx in XS:
    for z in range(-490, 491, 24):
        if any(abs(z - zz) < 20 for zz in ZS + [-470, 470]): continue
        box((0.7, 0.05, 9), (xx, 0.43, z), WHITE, "SmoothPlastic", group="Roads")
# crosswalks at boulevard crossings
for zz in ZS:
    for side in (-1, 1):
        for i in range(-8, 9):
            box((2.2, 0.06, 7), (i * 2.6, 0.45, zz + side * (ST_W / 2 + 4.5)), WHITE, group="Roads")
# sidewalks around every block edge
def walk(x, z, sx, sz):
    box((sx, 0.8, sz), (x, 0.4, z), WALK, "Concrete", group="Sidewalks")
for side in (-1, 1):
    walk(side * (BLV_W / 2 + 4), 0, 8, 1000)
    for xx in XS: walk(xx + side * (ST_W / 2 + 4), 0, 8, 1000)
for zz in ZS + [-470, 470]:
    for side in (-1, 1): walk(0, zz + side * (ST_W / 2 + 4), 1000, 8)

# ---------------------------------------------------------------- props
def palm(x, z, h=None):
    h = h or random.uniform(26, 34); lean = random.uniform(-6, 6); ry = random.uniform(0, 360)
    segs = 6
    for i in range(segs):
        y = 1 + (i + 0.5) * h / segs
        cyl((h / segs + 0.3, 2.2 - i * 0.18, 2.2 - i * 0.18), (x + math.sin(math.radians(ry)) * lean * i / segs, y, z + math.cos(math.radians(ry)) * lean * i / segs),
            (130 - i * 4, 100 - i * 3, 70), "Wood", rz=90, group="Trees")
    tx, tz = x + math.sin(math.radians(ry)) * lean, z + math.cos(math.radians(ry)) * lean
    for j in range(8):
        a = j * 45 + random.uniform(-10, 10)
        box((1.6, 0.5, 14), (tx + math.sin(math.radians(a)) * 6, 1 + h - 1.5, tz + math.cos(math.radians(a)) * 6),
            random.choice([(52, 128, 50), (60, 140, 56), (44, 112, 44)]), "LeafyGrass", ry=a, rx=-22, group="Trees")
    ball((2.6, 2.6, 2.6), (tx, 1 + h - 0.5, tz), (96, 70, 40), "Wood", group="Trees")
def oak(x, z):
    h = random.uniform(10, 14)
    cyl((h, 2.4, 2.4), (x, h / 2, z), (100, 74, 50), "Wood", rz=90, group="Trees")
    for _ in range(3):
        r = random.uniform(11, 15)
        ball((r, r * 0.85, r), (x + random.uniform(-3, 3), h + random.uniform(0, 4), z + random.uniform(-3, 3)),
             random.choice([(58, 120, 48), (70, 134, 54), (50, 106, 44)]), "LeafyGrass", group="Trees")
def lamp(x, z, face):
    cyl((16, 0.8, 0.8), (x, 8.8, z), (40, 42, 48), "Metal", rz=90, group="Lamps")
    ax, az = math.sin(math.radians(face)) * 2.5, math.cos(math.radians(face)) * 2.5
    box((0.5, 0.5, 5), (x + ax, 16.6, z + az), (40, 42, 48), "Metal", ry=face, group="Lamps")
    add("L", (2.2, 0.7, 1.6), (x + ax * 1.8, 16.2, z + az * 1.8), (255, 236, 190), "Neon", ry=face, group="Lamps")
def bench(x, z, ry):
    box((8, 0.6, 2.4), (x, 2.2, z), (150, 105, 65), "WoodPlanks", ry=ry, group="Props")
    box((8, 2.2, 0.5), (x - math.cos(math.radians(ry)) * 0 + math.sin(math.radians(ry)) * 1.2, 3.4, z + math.cos(math.radians(ry)) * 1.2), (150, 105, 65), "WoodPlanks", ry=ry, group="Props")
    for s in (-3, 3): box((0.5, 2, 2), (x + math.cos(math.radians(ry)) * s, 1, z - math.sin(math.radians(ry)) * s), (40, 42, 48), "Metal", ry=ry, group="Props")
def car(x, z, ry, rgb):
    box((7, 2.4, 15), (x, 2.2, z), rgb, "SmoothPlastic", ry=ry, group="Cars")
    box((6.4, 2.2, 7.5), (x - math.sin(math.radians(ry)) * 0.8, 4.5, z - math.cos(math.radians(ry)) * 0.8), (30, 34, 44), "Glass", ry=ry, group="Cars", tr=0.2)
    for sx in (-3.4, 3.4):
        for sz in (-4.8, 4.8):
            wx = x + math.cos(math.radians(ry)) * sx + math.sin(math.radians(ry)) * sz
            wz = z - math.sin(math.radians(ry)) * sx + math.cos(math.radians(ry)) * sz
            cyl((1.2, 3, 3), (wx, 1.5, wz), (25, 25, 28), "SmoothPlastic", ry=ry, group="Cars")

# boulevard palms + lamps
for z in range(-440, 441, 40):
    if any(abs(z - zz) < 22 for zz in ZS): continue
    palm(0, z)
for z in range(-460, 461, 60):
    if any(abs(z - zz) < 22 for zz in ZS): continue
    for side in (-1, 1): lamp(side * (BLV_W / 2 + 6), z, -90 * side)
for xx in XS:
    for z in range(-430, 431, 70):
        if any(abs(z - zz) < 22 for zz in ZS): continue
        for side in (-1, 1): lamp(xx + side * (ST_W / 2 + 6), z, -90 * side)

# ---------------------------------------------------------------- plots (12 city + 4 lakeside premium)
PLOT = 92
plots = []
pid = 0
for side in (-1, 1):
    for (z0, z1) in ((-300, -100), (-100, 100), (100, 300)):
        for k in (0, 1):
            pid += 1
            cz = z0 + ST_W / 2 + 8 + (k + 0.5) * ((z1 - z0 - ST_W - 16) / 2)
            cx = side * ((BLV_W / 2 + 8) + (XS[1] - ST_W / 2 - 8 - BLV_W / 2 - 8) / 2)
            plots.append((pid, cx, cz, side, False))
for k, cz in enumerate((-195, -65, 65, 195)):
    pid += 1; plots.append((pid, 345, cz, 1, True))
for (pid, cx, cz, side, prem) in plots:
    g = f"Plot{pid}"
    size = PLOT if not prem else 104
    box((size, 1, size), (cx, 0.5, cz), (164, 132, 92), "Ground", group=g, name="Pad",
        extra={"plot": pid, "price": 25000 if not prem else 60000, "premium": prem})
    # hedge border with a gap facing the road
    face = -side if not prem else -1
    for e in range(4):
        horizontal = e in (0, 1)
        off = (size / 2 + 1.2) * (1 if e % 2 else -1)
        if horizontal: box((size + 4, 3.2, 2.2), (cx, 1.6, cz + off), (54, 110, 46), "LeafyGrass", group=g)
        else:
            if (off > 0) == (face > 0):
                for seg in (-1, 1): box((2.2, 3.2, size / 2 - 8), (cx + off, 1.6, cz + seg * (size / 4 + 4)), (54, 110, 46), "LeafyGrass", group=g)
            else: box((2.2, 3.2, size + 4), (cx + off, 1.6, cz), (54, 110, 46), "LeafyGrass", group=g)
    sx = cx + face * (size / 2 + 6)
    cyl((10, 0.7, 0.7), (sx, 5, cz - 12), (90, 60, 35), "Wood", rz=90, group=g)
    sign((14, 6, 0.6), (sx, 11, cz - 12), 90 if face > 0 else -90,
         f"PLOT {pid}\nFOR SALE\n${(60000 if prem else 25000):,}", (255, 205, 60) if not prem else (40, 200, 190), (30, 30, 35), group=g)

# ---------------------------------------------------------------- lake + beach (east)
add("W", (150, 30, 520), (500, -14, 0), (60, 140, 200), "SmoothPlastic", group="Lake", name="Lake")
box((24, 0.8, 520), (412, 0.4, 0), (226, 206, 160), "Sand", group="Lake", name="Beach")
for z in range(-240, 241, 48): palm(406, z)
box((10, 1, 70), (440, 1.2, 120), (150, 110, 70), "WoodPlanks", group="Lake", name="Pier")
for z in (90, 110, 130, 150): cyl((6, 1.2, 1.2), (436, -1, z), (110, 80, 50), "Wood", rz=90, group="Lake")
# west park
box((200, 0.6, 520), (-370, 0.3, 0), (88, 152, 70), "LeafyGrass", group="Park", name="Park")
for _ in range(34): oak(random.uniform(-460, -290), random.uniform(-240, 240))
for z in range(-200, 201, 80): bench(-300, z, 90)
box((8, 0.5, 480), (-370, 0.62, 0), (210, 196, 170), "Pebble", group="Park", name="Path")

# ---------------------------------------------------------------- HQ campus (north)
HZ = 400
box((300, 0.6, 120), (0, 0.3, HZ), (210, 208, 200), "Concrete", group="HQ", name="Plaza")
# fountain plaza
cyl((2, 28, 28), (0, 1, HZ - 30), (230, 228, 220), "Marble", rz=90, group="HQ")
cyl((1.2, 24, 24), (0, 1.8, HZ - 30), (90, 170, 230), "Glass", rz=90, group="HQ", tr=0.25)
cyl((10, 2.4, 2.4), (0, 6, HZ - 30), (230, 228, 220), "Marble", rz=90, group="HQ")
ball((4, 4, 4), (0, 12, HZ - 30), GOLD, "Metal", group="HQ")
for a in range(0, 360, 60): bench(math.sin(math.radians(a)) * 22, HZ - 30 + math.cos(math.radians(a)) * 22, a + 90)
# tower: lobby + 4 glass floors
TX, TZ = 0, HZ + 30
box((90, 1, 50), (TX, 1, TZ), (236, 234, 228), "Marble", group="HQ", name="LobbyFloor")
for f in range(5):
    y = 2 + f * 14
    box((90, 1.2, 50), (TX, y + 13.4, TZ), (236, 234, 228), "Concrete", group="HQ")
    for s in (-1, 1): box((2, 14, 50), (TX + s * 44, y + 7, TZ), DARK, "Concrete", group="HQ")
    box((90, 14, 2), (TX, y + 7, TZ + 24), DARK, "Concrete", group="HQ")
    box((86, 12.6, 0.6), (TX, y + 7, TZ - 24.5), GLASS, "Glass", group="HQ", tr=0.35 if f else 0.55)
    for mx in range(-40, 41, 10): box((0.8, 14, 0.8), (TX + mx, y + 7, TZ - 24.8), DARK, "Metal", group="HQ")
box((96, 2, 56), (TX, 74, TZ), GOLD, "Metal", group="HQ", name="Roof")
cyl((0.6, 24, 24), (TX, 75.4, TZ), (60, 62, 70), "Concrete", rz=90, group="HQ")
sign((70, 10, 1), (TX, 84, TZ - 20), 180, "DREAM BUILDERS", (20, 20, 25), (255, 200, 50), group="HQ")
# job pads with arches
for name, x, rgb in (("Construction Worker", -60, (255, 150, 30)), ("Architect", 60, (80, 170, 255))):
    box((20, 1, 20), (x, 0.8, HZ - 20), rgb, "Neon", group="JobPads", name=name, extra={"job": name})
    for s in (-1, 1): box((1.5, 14, 1.5), (x + s * 10, 7, HZ - 10), (40, 42, 48), "Metal", group="JobPads")
    sign((22, 5, 0.6), (x, 15, HZ - 10), 180, name.upper(), (25, 25, 30), rgb, group="JobPads")
# parking
for i in range(9):
    x = -130 + i * 12
    box((0.6, 0.05, 18), (x, 0.62, HZ + 30), WHITE, group="HQ")
    if i < 8 and random.random() < 0.7: car(x + 6, HZ + 30, 0, random.choice([(200, 30, 40), (240, 240, 240), (25, 25, 30), (40, 90, 200), (200, 170, 40)]))
add("SPAWN", (14, 1, 14), (0, 1, HZ - 60), (255, 255, 255), "SmoothPlastic", group="HQ")

# ---------------------------------------------------------------- construction yard (south)
YZ = -400
box((360, 0.8, 120), (0, 0.4, YZ), (128, 126, 120), "Concrete", group="Yard", name="YardFloor")
# fence
for x in range(-178, 179, 6):
    box((0.4, 8, 0.4), (x, 4.4, YZ - 60), (170, 170, 175), "Metal", group="Yard")
box((358, 7, 0.2), (0, 4.6, YZ - 60), (170, 170, 175), "Metal", group="Yard", tr=0.6, name="Mesh")
# tower crane
CX, CZ = 110, YZ - 20
for sx in (-3, 3):
    for sz in (-3, 3): box((0.8, 96, 0.8), (CX + sx, 48.4, CZ + sz), (255, 196, 30), "Metal", group="Crane")
for y in range(6, 96, 8):
    for (a, b, ry) in (((0, -3), (6, 0.5), 0), ((0, 3), (6, 0.5), 0), ((-3, 0), (0.5, 6), 0), ((3, 0), (0.5, 6), 0)):
        box((b[0] + 0.01, 0.5, b[1] + 0.01), (CX + a[0], y, CZ + a[1]), (255, 196, 30), "Metal", group="Crane")
box((7, 6, 7), (CX, 99, CZ), (255, 196, 30), "Metal", group="Crane", name="Cab")
box((110, 2.4, 3), (CX - 40, 103, CZ), (255, 196, 30), "Metal", group="Crane", name="Jib")
box((14, 6, 6), (CX + 20, 100, CZ), (90, 92, 100), "Concrete", group="Crane", name="Counterweight")
box((0.3, 60, 0.3), (CX - 70, 72, CZ), (40, 40, 40), "Metal", group="Crane", name="Cable")
box((6, 3, 6), (CX - 70, 40, CZ), (170, 75, 55), "Brick", group="Crane", name="Load")
# materials
for i in range(18):
    box((6, 3, 4), (-150 + (i % 6) * 10.5, 2.3 + (i // 6) * 3, YZ + 30), (170, 75, 55), "Brick", group="Materials", name="BrickStack")
for i in range(8):
    box((16, 1.2, 2), (-60, 1.4 + i * 1.25, YZ + 20 + (i % 2) * 0.4), (196, 160, 110), "WoodPlanks", group="Materials", name="Lumber")
for i in range(5): cyl((10, 3, 3), (-20 + i * 3.2, 2.3, YZ + 34), (110, 112, 118), "Metal", ry=90, group="Materials", name="Pipe")
for i in range(3): cyl((6, 6, 6), (20 + i * 8, 3.8, YZ + 30), (150, 150, 150), "Concrete", rz=90, group="Materials", name="CementBag")
# trucks
def truck(x, z, ry, rgb):
    box((10, 8, 30), (x, 6, z), (200, 200, 205), "Metal", ry=ry, group="Trucks")
    box((10, 8, 8), (x + math.sin(math.radians(ry)) * 20, 6, z + math.cos(math.radians(ry)) * 20), rgb, "SmoothPlastic", ry=ry, group="Trucks")
    for s in (-1, 1):
        for d in (-10, 0, 20):
            wx = x + math.cos(math.radians(ry)) * s * 5 + math.sin(math.radians(ry)) * d
            wz = z - math.sin(math.radians(ry)) * s * 5 + math.cos(math.radians(ry)) * d
            cyl((1.6, 4, 4), (wx, 2, wz), (25, 25, 28), "SmoothPlastic", ry=ry, group="Trucks")
truck(-110, YZ - 20, 90, (255, 140, 0)); truck(-40, YZ - 30, 90, (30, 110, 200))
sign((50, 8, 0.6), (0, 16, YZ + 58), 0, "SUPPLY YARD", (25, 25, 30), (255, 150, 30), group="Yard")
for s in (-1, 1): box((1.5, 18, 1.5), (s * 25, 9, YZ + 58), (40, 42, 48), "Metal", group="Yard")
# cones
for x in range(-170, 171, 20): cyl((3, 1.6, 1.6), (x, 2.3, YZ + 56), (255, 110, 20), "SmoothPlastic", rz=90, group="Yard")

# ---------------------------------------------------------------- write outputs
json.dump({"pal": PAL, "mats": MATS, "prims": P}, open(os.path.join(HERE, "map_v2.json"), "w"))
groups = sorted({d["g"] for d in P})
def num(v): return ("%g" % v)
lines = []
for d in P:
    k = d["k"]; s, p, r = d["s"], d["p"], d["r"]
    base = f'{{"{k}",{num(s[0])},{num(s[1])},{num(s[2])},{num(p[0])},{num(p[1])},{num(p[2])},{num(r[0])},{num(r[1])},{num(r[2])},{d["c"]+1},{d["m"]+1},{groups.index(d["g"])+1}'
    tail = ""
    if d.get("t"): tail += f',t={d["t"]}'
    if d.get("n"): tail += f',n="{d["n"]}"'
    x = d.get("x") or {}
    if "text" in x: tail += ',txt="' + x["text"].replace("\n", "\\n") + '",fg={' + ",".join(map(str, x["fg"])) + '}'
    if "plot" in x: tail += f',plot={x["plot"]},price={x["price"]},prem={"true" if x["premium"] else "false"}'
    if "job" in x: tail += f',job="{x["job"]}"'
    lines.append(base + tail + "}")
pal = ",".join("{%d,%d,%d}" % c for c in PAL)
mats = ",".join(f'"{m}"' for m in MATS)
grp = ",".join(f'"{g}"' for g in groups)
LUA = f'''-- Dream Builders map v2 (generated by gen/mapgen.py; edit the generator, not this file)
-- Paste into the Studio command bar and press Run. Rebuilds workspace.DreamBuilders.
local W = workspace
local old = W:FindFirstChild("DreamBuilders"); if old then old:Destroy() end
local root = Instance.new("Folder"); root.Name = "DreamBuilders"; root.Parent = W
local bp = W:FindFirstChild("Baseplate"); if bp then bp:Destroy() end
local PAL = {{{pal}}}
local MATS = {{{mats}}}
local GROUPS = {{{grp}}}
local folders = {{}}
local plotsFolder = Instance.new("Folder"); plotsFolder.Name = "Plots"; plotsFolder.Parent = root
for _, g in ipairs(GROUPS) do
	local f
	if g:sub(1, 4) == "Plot" then f = Instance.new("Model"); f.Parent = plotsFolder else f = Instance.new("Folder"); f.Parent = root end
	f.Name = g; folders[g] = f
end
local D = {{
{",\n".join(lines)}
}}
local function rgb(i) local c = PAL[i]; return Color3.fromRGB(c[1], c[2], c[3]) end
local count = 0
for _, d in ipairs(D) do
	local k = d[1]
	local cf = CFrame.new(d[5], d[6], d[7]) * CFrame.Angles(0, math.rad(d[9]), 0) * CFrame.Angles(math.rad(d[8]), 0, math.rad(d[10]))
	local size = Vector3.new(d[2], d[3], d[4])
	local parent = folders[GROUPS[d[13]]]
	if k == "W" then
		W.Terrain:FillBlock(cf, size, Enum.Material.Water)
	else
		local p
		if k == "SPAWN" then p = Instance.new("SpawnLocation"); p.Duration = 0 else p = Instance.new("Part") end
		if k == "C" then p.Shape = Enum.PartType.Cylinder elseif k == "S" then p.Shape = Enum.PartType.Ball end
		p.Anchored = true; p.Size = size; p.CFrame = cf; p.Color = rgb(d[11]); p.Material = Enum.Material[MATS[d[12]]]
		p.TopSurface = Enum.SurfaceType.Smooth; p.BottomSurface = Enum.SurfaceType.Smooth
		if d.t then p.Transparency = d.t end
		if d.n then p.Name = d.n end
		if d.txt then
			local g = Instance.new("SurfaceGui"); g.Face = Enum.NormalId.Front; g.PixelsPerStud = 30; g.Parent = p
			local t = Instance.new("TextLabel"); t.Size = UDim2.fromScale(1, 1); t.BackgroundTransparency = 1; t.Text = d.txt
			t.TextScaled = true; t.Font = Enum.Font.GothamBlack; t.TextColor3 = Color3.fromRGB(d.fg[1], d.fg[2], d.fg[3]); t.Parent = g
			local g2 = g:Clone(); g2.Face = Enum.NormalId.Back; g2.Parent = p
		end
		if k == "L" then local l = Instance.new("PointLight"); l.Range = 34; l.Brightness = 1.4; l.Color = Color3.fromRGB(255, 226, 170); l.Parent = p end
		if d.plot then p.Name = "Pad"; parent:SetAttribute("PlotId", d.plot); parent:SetAttribute("Price", d.price); parent:SetAttribute("Premium", d.prem); parent:SetAttribute("Stage", 0); parent.PrimaryPart = p end
		if d.job then p:SetAttribute("Job", d.job) end
		p.Parent = parent; count += 1
	end
end
local sp = W:FindFirstChild("SpawnLocation", false); if sp and sp.Parent == W then sp:Destroy() end
local L = game:GetService("Lighting"); L.ClockTime = 15.5; L.Brightness = 3; L.OutdoorAmbient = Color3.fromRGB(140, 140, 150)
if not L:FindFirstChildOfClass("Atmosphere") then local a = Instance.new("Atmosphere"); a.Density = 0.28; a.Haze = 1.2; a.Parent = L end
print("Dream Builders map v2 built: " .. count .. " parts")
'''
open(os.path.join(HERE, "..", "02_map_v2.lua"), "w").write(LUA)
print("prims", len(P), "lua bytes", len(LUA))
