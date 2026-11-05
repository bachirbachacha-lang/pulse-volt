# ================================================================ LUXURY CITY (style 2: golden-hour Dubai / Riyadh)
MATS += ["Limestone", "Plaster", "Sandstone", "Rock", "Basalt"]
SAND, SANDL, LAWN, LAWN2 = (214, 188, 146), (238, 222, 188), (96, 150, 66), (82, 136, 58)
ROAD, LINE, WALK, CURB = (36, 36, 41), (245, 215, 120), (232, 224, 206), (250, 248, 242)
WHITE, CREAM, DARK, GOLD, GLASS = (248, 246, 240), (236, 226, 204), (32, 34, 42), (226, 176, 70), (110, 170, 190)
WOOD, TEAL = (146, 98, 58), (40, 180, 190)
def rot(cx, cz, ry, lx, lz):
    c, s = math.cos(math.radians(ry)), math.sin(math.radians(ry))
    return cx + lx * c + lz * s, cz - lx * s + lz * c
SIZE = 1700
box((SIZE, 2, SIZE), (0, -1, 0), SAND, "Sand", group="Ground", name="Ground")
# ---------------------------------------------------------------- lawns under every block + roads (same layout as v2, gameplay names kept)
BLV_W, ST_W = 44, 28
ZS = [-300, -100, 100, 300]; XS = [-260, 260]; BL = 660
for side in (-1, 1):
    for (z0, z1) in ((-300, -100), (-100, 100), (100, 300)):
        box((212, 0.3, z1 - z0 - ST_W - 2), (side * 136, 0.15, (z0 + z1) / 2), LAWN, "Grass", group="Lawns")
box((150, 0.3, 120), (-340, 0.15, 0), LAWN2, "Grass", group="Lawns")
def road(x, z, w, l, along_z):
    if along_z: box((w, 0.4, l), (x, 0.2, z), ROAD, "Asphalt", group="Roads")
    else: box((l, 0.4, w), (x, 0.21, z), ROAD, "Asphalt", group="Roads")
road(-13, 0, 18, BL, True); road(13, 0, 18, BL, True)
box((8, 1.0, BL), (0, 0.5, 0), CURB, "Limestone", group="Roads", name="Median")
box((6.4, 1.1, BL), (0, 0.55, 0), LAWN, "Grass", group="Roads", name="MedianGrass")
for z in ZS: road(0, z, ST_W, 1000, False)
for x in XS: road(x, 0, ST_W, 1000, True)
road(0, -470, ST_W, 1000, False); road(0, 470, ST_W, 1000, False)
for z in range(-322, 323, 24):
    if any(abs(z - zz) < 20 for zz in ZS): continue
    for x in (-13, 13): box((0.7, 0.05, 9), (x, 0.43, z), LINE, "Neon", group="Roads")
for zz in ZS + [-470, 470]:
    for x in range(-490, 491, 24):
        if abs(x) < 30 or any(abs(x - xx) < 20 for xx in XS): continue
        box((9, 0.05, 0.7), (x, 0.44, zz), WHITE, group="Roads")
for zz in ZS:
    for side in (-1, 1):
        for i in range(-8, 9): box((2.2, 0.06, 7), (i * 2.6, 0.45, zz + side * (ST_W / 2 + 4.5)), WHITE, group="Roads")
def walk(x, z, sx, sz):
    box((sx, 0.8, sz), (x, 0.4, z), WALK, "Limestone", group="Sidewalks")
for side in (-1, 1):
    walk(side * (BLV_W / 2 + 4), 0, 8, BL)
    for xx in XS: walk(xx + side * (ST_W / 2 + 4), 0, 8, 1000)
for zz in ZS + [-470, 470]:
    for side in (-1, 1): walk(0, zz + side * (ST_W / 2 + 4), 1000, 8)
# ---------------------------------------------------------------- props
def palm(x, z, h=None, group="Trees"):
    h = h or random.uniform(28, 38); lean = random.uniform(-7, 7); ry = random.uniform(0, 360); segs = 7
    for i in range(segs):
        y = 1 + (i + 0.5) * h / segs
        cyl((h / segs + 0.3, 2.3 - i * 0.17, 2.3 - i * 0.17), (x + math.sin(math.radians(ry)) * lean * (i / segs) ** 1.5, y, z + math.cos(math.radians(ry)) * lean * (i / segs) ** 1.5),
            (150 - i * 5, 112 - i * 4, 76), "Wood", rz=90, group=group)
    tx, tz = x + math.sin(math.radians(ry)) * lean, z + math.cos(math.radians(ry)) * lean
    for j in range(9):
        a = j * 40 + random.uniform(-8, 8)
        box((1.8, 0.4, 15), (tx + math.sin(math.radians(a)) * 6.5, 1 + h - 1.8, tz + math.cos(math.radians(a)) * 6.5),
            random.choice([(56, 132, 52), (68, 146, 58), (48, 118, 46)]), "LeafyGrass", ry=a, rx=-24, group=group)
    ball((2.8, 2.8, 2.8), (tx, 1 + h - 0.6, tz), (110, 80, 44), "Wood", group=group)
def bush(x, z, rgb=None, r=None):
    r = r or random.uniform(3.5, 5.5)
    ball((r, r * 0.8, r), (x, r * 0.35, z), rgb or random.choice([(236, 120, 170), (220, 90, 140), (250, 200, 90), (70, 140, 60)]), "LeafyGrass", group="Flowers")
def lamp(x, z, face, group="Lamps"):
    cyl((18, 0.7, 0.7), (x, 9.8, z), (40, 36, 30), "Metal", rz=90, group=group)
    cyl((1.2, 1.6, 1.6), (x, 1.2, z), GOLD, "Metal", rz=90, group=group)
    ax, az = math.sin(math.radians(face)) * 2.6, math.cos(math.radians(face)) * 2.6
    box((0.45, 0.45, 5.2), (x + ax, 18.6, z + az), GOLD, "Metal", ry=face, group=group)
    add("L", (2.2, 0.6, 1.6), (x + ax * 1.85, 18.2, z + az * 1.85), (255, 230, 180), "Neon", ry=face, group=group)
def bench(x, z, ry):
    box((8, 0.6, 2.4), (x, 2.2, z), WOOD, "WoodPlanks", ry=ry, group="Props")
    bx, bz = rot(x, z, ry, 0, 1.2); box((8, 2.2, 0.5), (bx, 3.4, bz), WOOD, "WoodPlanks", ry=ry, group="Props")
def car(x, z, ry, rgb):
    box((7, 2.4, 15), (x, 2.2, z), rgb, "SmoothPlastic", ry=ry, group="Cars")
    gx, gz = rot(x, z, ry, 0, -0.8); box((6.4, 2.1, 7.5), (gx, 4.4, gz), (24, 28, 36), "Glass", ry=ry, group="Cars", tr=0.15)
    for sx in (-3.4, 3.4):
        for sz in (-4.8, 4.8):
            wx, wz = rot(x, z, ry, sx, sz); cyl((1.2, 3, 3), (wx, 1.5, wz), (22, 22, 25), "SmoothPlastic", ry=ry, group="Cars")
# boulevard: dense palms + flowers on the median, gold lamps both sides
for z in range(-320, 321, 22):
    if any(abs(z - zz) < 22 for zz in ZS): continue
    palm(0, z)
    bush(0, z + 11, r=3.2)
for z in range(-310, 311, 44):
    if any(abs(z - zz) < 24 for zz in ZS): continue
    for side in (-1, 1): lamp(side * (BLV_W / 2 + 6), z, -90 * side)
for xx in XS:
    for z in range(-440, 441, 60):
        if any(abs(z - zz) < 22 for zz in ZS + [-470, 470]): continue
        for side in (-1, 1): lamp(xx + side * (ST_W / 2 + 6), z, -90 * side)
# street furniture along the boulevard sidewalks: benches, bins, hydrants, bus stop at HQ
for z in range(-290, 291, 66):
    if any(abs(z - zz) < 26 for zz in ZS): continue
    for side in (-1, 1):
        x = side * (BLV_W / 2 + 4)
        bench(x + side * 2.5, z + 10, 90 * side)
        cyl((3.4, 2.2, 2.2), (x + side * 2.5, 1.9, z - 8), (40, 42, 48), "Metal", rz=90, group="Props", name="Bin")
        cyl((2.6, 1.2, 1.2), (x - side * 2, 1.7, z + 24), (200, 40, 40), "Metal", rz=90, group="Props", name="Hydrant")
box((24, 0.4, 7), (-30, 9.6, 330), (40, 42, 48), "Glass", group="Props", tr=0.3, name="BusStopRoof")
for x in (-41, -19): box((0.5, 9, 0.5), (x, 5, 332), (40, 42, 48), "Metal", group="Props")
sign((10, 3, 0.4), (-30, 11.5, 333), 180, "BUS", (25, 25, 30), (255, 205, 90), group="Props")
for zz in ZS:   # palms along the cross streets
    for x in range(-230, 231, 46):
        if abs(x) < 40: continue
        for s in (-1, 1): palm(x, zz + s * (ST_W / 2 + 12), random.uniform(24, 30))
# ---------------------------------------------------------------- villa builder (show homes; the in-game mansion stages follow the same look)
def villa(cx, cz, ry, w=46, d=32, group="ShowVillas", lit=True):
    def P(lx, lz): return rot(cx, cz, ry, lx, lz)
    x, z = P(0, 0); box((w + 10, 1.2, d + 26), (x, 0.6, z), (226, 218, 200), "Pebble", ry=ry, group=group)
    x, z = P(0, -4); box((w, 12, d), (x, 7.2, z), WHITE, "Plaster", ry=ry, group=group)
    x, z = P(0, -4 + d / 2 + 0.3); box((w - 6, 8.5, 0.4), (x, 6.6, z), GLASS, "Glass", ry=ry, group=group, tr=0.35)
    x, z = P(w * 0.12, -7); box((w * 0.72, 11, d * 0.86), (x, 18.7, z), CREAM, "Plaster", ry=ry, group=group)
    x, z = P(w * 0.12, -7 + d * 0.43 + 0.3); box((w * 0.6, 7, 0.4), (x, 18.4, z), GLASS, "Glass", ry=ry, group=group, tr=0.35)
    for i in range(7):
        x, z = P(-w * 0.32 + i * 1.6, -7 + d * 0.43 + 0.8); box((0.6, 11, 0.6), (x, 18.7, z), WOOD, "WoodPlanks", ry=ry, group=group)
    x, z = P(0, -2); box((w + 6, 1.1, d + 8), (x, 13.7, z), (60, 58, 56), "Concrete", ry=ry, group=group)
    x, z = P(w * 0.12, -5); box((w * 0.8, 1.1, d * 0.98), (x, 24.7, z), (60, 58, 56), "Concrete", ry=ry, group=group)
    x, z = P(-w / 2 - 6, -4); box((12, 10, d * 0.7), (x, 6, z), (236, 226, 204), "Plaster", ry=ry, group=group, name="Garage")
    x, z = P(-w / 2 - 6, -4 + d * 0.35 + 0.3); box((10, 8, 0.4), (x, 5, z), (60, 58, 56), "DiamondPlate", ry=ry, group=group)
    x, z = P(-w / 2 - 6, d / 2 + 8); box((10, 0.3, 26), (x, 1.25, z), (200, 194, 182), "Cobblestone", ry=ry, group=group)
    x, z = P(0, d / 2 + 8); box((w * 0.66, 0.8, 12), (x, 1.3, z), (240, 238, 232), "Marble", ry=ry, group=group)
    x, z = P(0, d / 2 + 8); box((w * 0.6, 0.3, 9.6), (x, 1.75, z), TEAL, "Glass", ry=ry, group=group, tr=0.2)
    for s in (-1, 1):
        x, z = P(s * (w / 2 + 2), d / 2 + 6); palm(x, z, random.uniform(22, 28), group=group)
        x, z = P(s * w * 0.42, d / 2 + 16); box((2.4, 0.6, 6), (x, 1.5, z), WHITE, "Fabric", ry=ry, group=group)
    if lit:
        for s in (-1, 1):
            x, z = P(s * (w / 2 - 1), -4 + d / 2 + 0.8); add("L", (0.8, 1.6, 0.4), (x, 10.5, z), (255, 225, 170), "Neon", ry=ry, group=group)
# ---------------------------------------------------------------- plots (same 16 as v2: 12 city, 4 premium waterfront)
PLOT = 92; plots = []; pid = 0
for side in (-1, 1):
    for (z0, z1) in ((-300, -100), (-100, 100), (100, 300)):
        cz = (z0 + z1) / 2
        for k, cxa in enumerate((84, 188)):
            pid += 1; plots.append((pid, side * cxa, cz, side if k else -side, False))
for cz in (-195, -65, 65, 195):
    pid += 1; plots.append((pid, 345, cz, -1, True))
for (pid, cx, cz, face, prem) in plots:
    g = f"Plot{pid}"; size = PLOT if not prem else 104
    box((size, 1, size), (cx, 0.5, cz), (222, 212, 190), "Pebble", group=g, name="Pad",
        extra={"plot": pid, "price": 60000 if prem else 25000, "premium": prem})
    for e in range(4):
        off = (size / 2 + 1.2) * (1 if e % 2 else -1)
        if e in (0, 1): box((size + 4, 2.4, 1.6), (cx, 1.2, cz + off), CURB, "Limestone", group=g)
        elif (off > 0) == (face > 0):
            for seg in (-1, 1): box((1.6, 2.4, size / 2 - 8), (cx + off, 1.2, cz + seg * (size / 4 + 4)), CURB, "Limestone", group=g)
        else: box((1.6, 2.4, size + 4), (cx + off, 1.2, cz), CURB, "Limestone", group=g)
    for (a, b) in ((-1, -1), (1, -1), (-1, 1), (1, 1)): palm(cx + a * (size / 2 - 5), cz + b * (size / 2 - 5), random.uniform(22, 30), group=g)
    sx = cx + face * (size / 2 + 6)
    # entrance details: stone driveway through the gap, gate pillars with lamps, mailbox, garden lights
    ex = cx + face * (size / 2 - 2)
    box((14, 0.25, 16), (ex - face * 4, 1.1, cz), (200, 194, 182), "Cobblestone", group=g)
    for sz2 in (-9, 9):
        box((2.4, 4.2, 2.4), (cx + face * (size / 2 + 1.2), 2.1, cz + sz2), CURB, "Limestone", group=g)
        add("L", (1.2, 0.8, 1.2), (cx + face * (size / 2 + 1.2), 4.6, cz + sz2), (255, 225, 170), "Neon", group=g)
    box((1.2, 3.2, 1.2), (sx, 1.6, cz + 14), DARK, "Metal", group=g, name="Mailbox")
    box((1.8, 1.4, 2.6), (sx, 3.6, cz + 14), GOLD, "Metal", group=g)
    for (a, b) in ((-1, -0.5), (-1, 0.5)):
        box((0.6, 1.6, 0.6), (cx + face * (size / 2 - 6), 1.8, cz + b * 30), DARK, "Metal", group=g)
        add("L", (0.9, 0.5, 0.9), (cx + face * (size / 2 - 6), 2.8, cz + b * 30), (255, 225, 170), "Neon", group=g)
    cyl((10, 0.6, 0.6), (sx, 5, cz - 12), DARK, "Metal", rz=90, group=g)
    sign((14, 6, 0.6), (sx, 11, cz - 12), 90 if face > 0 else -90,
         f"PLOT {pid}\nFOR SALE\n${(60000 if prem else 25000):,}", GOLD if not prem else TEAL, (25, 25, 30), group=g)
# ---------------------------------------------------------------- sea, beach, pier, yacht (east)
add("W", (700, 40, 1700), (800, -19.5, 0), (30, 175, 185), group="Lake", name="Sea")
box((70, 0.9, 1100), (442, 0.45, 0), SANDL, "Sand", group="Lake", name="Beach")
for z in range(-500, 501, 36): palm(416 + random.uniform(-6, 6), z)
for z in range(-460, 461, 48):
    cyl((0.4, 9, 9), (452, 7, z), random.choice([(240, 90, 80), (250, 250, 245), (40, 160, 200)]), "Fabric", rz=90, group="Beach")
    cyl((7, 0.4, 0.4), (452, 3.5, z), WHITE, "Metal", rz=90, group="Beach")
    for s in (-1, 1): box((2.6, 0.6, 6.5), (458, 1.4, z + s * 4), WHITE, "Fabric", group="Beach")
box((16, 1.2, 230), (560, 1.8, 0), WOOD, "WoodPlanks", ry=90, group="Lake", name="Pier")
for x in range(470, 680, 30):
    for s in (-1, 1): cyl((8, 1.4, 1.4), (x, -2, s * 7), (110, 76, 48), "Wood", rz=90, group="Lake")
for x in range(490, 680, 45):
    for s in (-1, 1): lamp(x, s * 7.5, 0, group="Lake")
box((90, 1.2, 40), (700, 1.8, 0), WOOD, "WoodPlanks", group="Lake", name="PierDeck")
def yacht(x, z, ry):
    box((14, 6, 46), (x, 1.5, z), WHITE, "SmoothPlastic", ry=ry, group="Yachts")
    bx, bz = rot(x, z, ry, 0, -4); box((11, 5, 22), (bx, 7, bz), WHITE, "SmoothPlastic", ry=ry, group="Yachts")
    bx, bz = rot(x, z, ry, 0, -4); box((11.2, 2, 22.2), (bx, 7.5, bz), (30, 40, 60), "Glass", ry=ry, group="Yachts", tr=0.2)
yacht(640, 40, 90); yacht(660, -44, 90); yacht(760, 70, 20)
# ---------------------------------------------------------------- west: show villas + park (map teleports use Park/Path)
for i, z in enumerate((-230, -150, -70, 10, 90, 170, 250)):
    villa(-345, z, -90, w=44, d=30)
    car(-300, z + 18, 0, random.choice([(250, 250, 250), (20, 20, 24), (200, 30, 40), (226, 176, 70)]))
box((140, 0.6, 560), (-520, 0.3, 0), LAWN, "Grass", group="Park", name="Park")
box((8, 0.5, 520), (-520, 0.62, 0), (232, 222, 200), "Pebble", group="Park", name="Path")
for _ in range(26): palm(random.uniform(-580, -460), random.uniform(-260, 260), random.uniform(22, 34), group="Park")
for _ in range(30): bush(random.uniform(-585, -455), random.uniform(-270, 270))
for z in range(-200, 201, 80): bench(-510, z, 90)
# ---------------------------------------------------------------- HQ campus: luxury tower, wings, 3-tier fountain, palm ring
HZ = 400
box((320, 0.6, 130), (0, 0.3, HZ), (236, 228, 210), "Limestone", group="HQ", name="Plaza")
FZ = HZ - 32
for r, h, y in ((34, 2, 1.2), (20, 4, 2.8), (9, 6, 5.5)):
    cyl((h, r, r), (0, y, FZ), (244, 240, 232), "Marble", rz=90, group="HQ")
cyl((1.2, 30, 30), (0, 2.3, FZ), TEAL, "Glass", rz=90, group="HQ", tr=0.25)
cyl((16, 2.4, 2.4), (0, 9, FZ), (244, 240, 232), "Marble", rz=90, group="HQ")
ball((5, 5, 5), (0, 18, FZ), GOLD, "Metal", group="HQ")
for a in range(0, 360, 30):
    palm(math.sin(math.radians(a)) * 44, FZ + math.cos(math.radians(a)) * 44, random.uniform(26, 32), group="HQ")
TX, TZ = 0, HZ + 34
box((96, 1, 54), (TX, 1, TZ), (240, 236, 226), "Marble", group="HQ", name="LobbyFloor")
for f in range(9):
    y = 2 + f * 14
    w = 92 - f * 1.5
    box((w, 1.2, 52), (TX, y + 13.4, TZ), WHITE, "Concrete", group="HQ")
    box((w - 2, 12.6, 0.6), (TX, y + 7, TZ - 25.5), GLASS, "Glass", group="HQ", tr=0.25 if f else 0.5)
    box((w - 2, 12.6, 0.6), (TX, y + 7, TZ + 25.5), GLASS, "Glass", group="HQ", tr=0.25)
    for s in (-1, 1): box((0.6, 12.6, 50), (TX + s * (w / 2 - 1), y + 7, TZ), GLASS, "Glass", group="HQ", tr=0.25)
    for mx in range(-40, 41, 8):
        if abs(mx) < w / 2 - 2: box((0.9, 14, 1.2), (TX + mx, y + 7, TZ - 26.2), GOLD, "Metal", group="HQ")
box((80, 6, 46), (TX, 131, TZ), GOLD, "Metal", group="HQ", name="Crown")
box((40, 10, 24), (TX, 139, TZ), GOLD, "Metal", group="HQ")
cyl((40, 1.2, 1.2), (TX, 164, TZ), GOLD, "Metal", rz=90, group="HQ", name="Spire")
for s in (-1, 1):
    box((44, 40, 40), (TX + s * 76, 20, TZ + 6), WHITE, "Plaster", group="HQ", name="Wing")
    box((42, 30, 0.6), (TX + s * 76, 22, TZ - 14.3), GLASS, "Glass", group="HQ", tr=0.3)
    box((48, 1.6, 44), (TX + s * 76, 40.8, TZ + 6), GOLD, "Metal", group="HQ")
sign((74, 10, 1), (TX, 150, TZ - 26), 180, "DREAM BUILDERS", (20, 20, 25), (255, 205, 90), group="HQ")
for name, x, rgb in (("Construction Worker", -60, (255, 150, 30)), ("Architect", 60, (80, 170, 255))):
    box((20, 1, 20), (x, 0.8, HZ - 20), rgb, "Neon", group="JobPads", name=name, extra={"job": name})
    for s in (-1, 1): box((1.5, 16, 1.5), (x + s * 10, 8, HZ - 10), GOLD, "Metal", group="JobPads")
    box((22, 1.5, 1.5), (x, 16.5, HZ - 10), GOLD, "Metal", group="JobPads")
    sign((22, 5, 0.6), (x, 13, HZ - 10), 180, name.upper(), (25, 25, 30), rgb, group="JobPads")
for i in range(10):
    x = -150 + i * 12
    box((0.6, 0.05, 18), (x, 0.62, HZ + 34), WHITE, group="HQ")
    if i < 9 and random.random() < 0.75: car(x + 6, HZ + 34, 0, random.choice([(250, 250, 250), (20, 20, 24), (200, 30, 40), (226, 176, 70), (40, 70, 140)]))
add("SPAWN", (14, 1, 14), (0, 1, HZ - 64), (255, 255, 255), "SmoothPlastic", group="HQ")
# ---------------------------------------------------------------- construction yard (south), warm tones
YZ = -400
box((360, 0.8, 120), (0, 0.4, YZ), (150, 140, 124), "Concrete", group="Yard", name="YardFloor")
for x in range(-178, 179, 6): box((0.4, 8, 0.4), (x, 4.4, YZ - 60), (170, 170, 175), "Metal", group="Yard")
box((358, 7, 0.2), (0, 4.6, YZ - 60), (170, 170, 175), "Metal", group="Yard", tr=0.6, name="Mesh")
CX, CZ = 110, YZ - 20
for sx in (-3, 3):
    for sz in (-3, 3): box((0.8, 110, 0.8), (CX + sx, 55.4, CZ + sz), (250, 190, 30), "Metal", group="Crane")
for y in range(6, 110, 8):
    for (a, b) in (((0, -3), (6, 0.5)), ((0, 3), (6, 0.5)), ((-3, 0), (0.5, 6)), ((3, 0), (0.5, 6))):
        box((b[0] + 0.01, 0.5, b[1] + 0.01), (CX + a[0], y, CZ + a[1]), (250, 190, 30), "Metal", group="Crane")
box((7, 6, 7), (CX, 113, CZ), (250, 190, 30), "Metal", group="Crane", name="Cab")
box((120, 2.4, 3), (CX - 44, 117, CZ), (250, 190, 30), "Metal", group="Crane", name="Jib")
box((14, 6, 6), (CX + 22, 114, CZ), (90, 92, 100), "Concrete", group="Crane", name="Counterweight")
box((0.3, 64, 0.3), (CX - 80, 84, CZ), (40, 40, 40), "Metal", group="Crane", name="Cable")
box((6, 3, 6), (CX - 80, 50, CZ), (170, 75, 55), "Brick", group="Crane", name="Load")
for i in range(18): box((6, 3, 4), (-150 + (i % 6) * 10.5, 2.3 + (i // 6) * 3, YZ + 30), (176, 82, 58), "Brick", group="Materials", name="BrickStack")
for i in range(8): box((16, 1.2, 2), (-60, 1.4 + i * 1.25, YZ + 20 + (i % 2) * 0.4), (200, 164, 112), "WoodPlanks", group="Materials", name="Lumber")
for i in range(5): cyl((10, 3, 3), (-20 + i * 3.2, 2.3, YZ + 34), (112, 114, 120), "Metal", ry=90, group="Materials", name="Pipe")
for i in range(3): cyl((6, 6, 6), (20 + i * 8, 3.8, YZ + 30), (160, 156, 150), "Concrete", rz=90, group="Materials", name="CementBag")
def truck(x, z, ry, rgb):
    box((10, 8, 30), (x, 6, z), (210, 210, 214), "Metal", ry=ry, group="Trucks")
    cx2, cz2 = rot(x, z, ry, 0, 20); box((10, 8, 8), (cx2, 6, cz2), rgb, "SmoothPlastic", ry=ry, group="Trucks")
    for s in (-1, 1):
        for dd in (-10, 0, 20):
            wx, wz = rot(x, z, ry, s * 5, dd); cyl((1.6, 4, 4), (wx, 2, wz), (22, 22, 25), "SmoothPlastic", ry=ry, group="Trucks")
truck(-110, YZ - 20, 90, (255, 140, 0)); truck(-40, YZ - 30, 90, (226, 176, 70))
sign((50, 8, 0.6), (0, 16, YZ + 58), 0, "SUPPLY YARD", (25, 25, 30), (255, 170, 60), group="Yard")
for s in (-1, 1): box((1.5, 18, 1.5), (s * 25, 9, YZ + 58), GOLD, "Metal", group="Yard")
for x in range(-170, 171, 20): cyl((3, 1.6, 1.6), (x, 2.3, YZ + 56), (255, 110, 20), "SmoothPlastic", rz=90, group="Yard")
# ---------------------------------------------------------------- backdrop: desert mountains + distant skyline (decoration only, no collision needed)
for i in range(70):
    a = math.radians(i * (360 / 70) + random.uniform(-2, 2))
    r = random.uniform(740, 840)
    if math.cos(a) * r > 260: continue           # keep the east (sea) open
    s = random.uniform(140, 260)
    ball((s, s * random.uniform(0.35, 0.6), s * random.uniform(0.8, 1.2)), (math.cos(a) * r, -10, math.sin(a) * r),
         random.choice([(196, 150, 110), (176, 128, 92), (210, 168, 124)]), "Sandstone", group="Mountains")
for i in range(26):
    x = random.uniform(-520, 380); z = random.uniform(640, 760); h = random.uniform(120, 380); w = random.uniform(30, 60)
    box((w, h, w), (x, h / 2, z), random.choice([(70, 110, 130), (90, 130, 150), (60, 90, 110)]), "Glass", group="Skyline", tr=0.05)
    box((w + 2, 4, w + 2), (x, h + 2, z), GOLD, "Metal", group="Skyline")
box((44, 560, 44), (-120, 280, 720), (80, 130, 150), "Glass", group="Skyline", name="MegaTower")
cyl((80, 3, 3), (-120, 600, 720), GOLD, "Metal", rz=90, group="Skyline")
