"""mansion.py (v2: luxury interior after the Codex references) – Dream Builders luxury mansion WITH INTERIOR (Blender 5.x). 1 Blender unit = 1 Roblox stud.
Blender axes: X right, Y back (front faces -Y), Z up.  Character ≈ 5 studs tall, doors 9 high, ceilings 12.
Run: python3 mansion.py -- out=<dir> [render=1] [spp=16]
Exports <dir>/LuxuryMansion.fbx: one mesh per material (Mansion_<mat>) + one mesh per door (Door_<name>), so the
Roblox importer keeps parts separate; colours/materials/transparency are re-applied in Studio by name."""
import bpy, math, sys, os
from mathutils import Vector
A = dict(a.split("=", 1) for a in (sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []))
OUT = A.get("out", "."); os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
PAL = {  # key: (rgb, roughness, metallic, alpha, emission)
 "plaster": ((246, 244, 238), .85, 0, 1, 0), "cream": ((236, 226, 204), .8, 0, 1, 0), "slab": ((62, 60, 58), .7, 0, 1, 0),
 "wood": ((150, 100, 60), .5, 0, 1, 0), "oak": ((196, 160, 116), .45, 0, 1, 0), "tile": ((228, 226, 222), .25, 0, 1, 0),
 "glass": ((120, 170, 190), .03, 0, .4, 0), "frame": ((32, 32, 36), .35, .7, 1, 0), "stone": ((222, 214, 196), .75, 0, 1, 0),
 "pool": ((40, 180, 205), .05, 0, .7, 0), "gold": ((226, 176, 70), .3, 1, 1, 0), "light": ((255, 228, 175), .5, 0, 1, 4),
 "sofa": ((214, 204, 186), .9, 0, 1, 0), "fabric": ((52, 54, 60), .9, 0, 1, 0), "kitchen": ((245, 245, 242), .15, 0, 1, 0),
 "marble": ((236, 232, 226), .2, 0, 1, 0), "leaf": ((60, 136, 54), .7, 0, 1, 0), "grass": ((96, 150, 66), .9, 0, 1, 0),
 "black": ((22, 22, 26), .3, 0, 1, 0), "bed": ((250, 248, 244), .9, 0, 1, 0),
 "floor": ((238, 226, 206), .12, 0, 1, 0), "walnut": ((92, 58, 36), .45, 0, 1, 0), "travertine": ((214, 198, 172), .7, 0, 1, 0),
 "boucle": ((238, 230, 214), .95, 0, 1, 0), "led": ((255, 214, 150), .5, 0, 1, 6), "curtain": ((246, 240, 230), .9, 0, .55, 0),
 "olive": ((112, 128, 70), .8, 0, 1, 0), "planter": ((226, 216, 198), .8, 0, 1, 0), "rug": ((196, 178, 152), .95, 0, 1, 0),
 "flower": ((250, 246, 236), .8, 0, 1, 0),
}
MATS = {}
for k, (rgb, r, m, a, e) in PAL.items():
    mt = bpy.data.materials.new("M_" + k); mt.use_nodes = True; p = mt.node_tree.nodes["Principled BSDF"]
    c = tuple((v / 255) ** 2.2 for v in rgb) + (1,)
    p.inputs["Base Color"].default_value = c; p.inputs["Roughness"].default_value = r; p.inputs["Metallic"].default_value = m
    if a < 1: p.inputs["Alpha"].default_value = a
    if e: p.inputs["Emission Color"].default_value = c; p.inputs["Emission Strength"].default_value = e
    MATS[k] = mt
parts = {k: [] for k in PAL}; doors = {}
def box(key, x0, x1, y0, y1, z0, z1, door=None):
    if x1 - x0 < 0.01 or y1 - y0 < 0.01 or z1 - z0 < 0.01: return None
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.active_object; o.scale = (x1 - x0, y1 - y0, z1 - z0); bpy.ops.object.transform_apply(scale=True)
    if door: doors[door] = (o, key)
    else: parts[key].append(o)
    return o
def cyl(key, x, y, z0, z1, r, n=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=r, depth=z1 - z0, location=(x, y, (z0 + z1) / 2)); parts[key].append(bpy.context.active_object)
T = 1.0  # wall thickness
def wall_x(key, y, x0, x1, z0, z1, holes=()):
    """wall running along X at y; holes = [(xa, xb, za, zb)] cut as door/window openings"""
    xs = sorted({x0, x1, *[h[0] for h in holes], *[h[1] for h in holes]})
    for a, b in zip(xs, xs[1:]):
        hs = [h for h in holes if h[0] <= a and h[1] >= b]
        if not hs: box(key, a, b, y - T / 2, y + T / 2, z0, z1)
        else:
            h = hs[0]; box(key, a, b, y - T / 2, y + T / 2, z0, h[2]); box(key, a, b, y - T / 2, y + T / 2, h[3], z1)
def wall_y(key, x, y0, y1, z0, z1, holes=()):
    ys = sorted({y0, y1, *[h[0] for h in holes], *[h[1] for h in holes]})
    for a, b in zip(ys, ys[1:]):
        hs = [h for h in holes if h[0] <= a and h[1] >= b]
        if not hs: box(key, x - T / 2, x + T / 2, a, b, z0, z1)
        else:
            h = hs[0]; box(key, x - T / 2, x + T / 2, a, b, z0, h[2]); box(key, x - T / 2, x + T / 2, a, b, h[3], z1)
# ---------------------------------------------------------------- shell
X0, X1, Y0, Y1 = -30, 30, -20, 20
G0, G1 = 1.5, 13.5          # ground floor: floor top, ceiling
F0, F1 = 14.5, 26.5         # first floor
box("stone", -42, 42, -34, 50, 0, 1.5)                                   # plinth + terraces
box("grass", -42, 42, 46, 50, 1.5, 1.7)
box("floor", X0, X1, Y0, Y1, 1.5, 1.6)                                   # polished marble floor
# exterior walls ground floor: front: front door + glass wall; back: glass sliding wall to pool
wall_x("plaster", Y0, X0, X1, G0, G1, holes=[(-27, -15, G0, G1 - 0.6), (-12, 28, G0 + 0.3, G1 - 0.3)])
wall_x("plaster", Y1, X0, X1, G0, G1, holes=[(-2, 26, G0, G1 - 0.8)])
wall_y("plaster", X0, Y0, Y1, G0, G1, holes=[(-6, 2, G0 + 3, G1 - 2)])
wall_y("plaster", X1, Y0, Y1, G0, G1, holes=[(8, 16, G0 + 3, G1 - 2)])
# glazing + frames (front living wall, back sliding wall, side windows)
box("glass", -12, 28, Y0 - 0.15, Y0 + 0.15, G0 + 0.3, G1 - 0.3)
for x in range(-12, 29, 5): box("walnut", x - 0.15, x + 0.15, Y0 - 0.35, Y0 + 0.35, G0 + 0.3, G1 - 0.3)
box("glass", -2, 26, Y1 - 0.15, Y1 + 0.15, G0, G1 - 0.8)
for x in range(-2, 27, 7): box("frame", x - 0.2, x + 0.2, Y1 - 0.4, Y1 + 0.4, G0, G1 - 0.8)
box("glass", X0 - 0.15, X0 + 0.15, -6, 2, G0 + 3, G1 - 2); box("glass", X1 - 0.15, X1 + 0.15, 8, 16, G0 + 3, G1 - 2)
# interior partition: entrance hall | living (open), kitchen counter wall
wall_y("plaster", -14, Y0, 4, G0, G1, holes=[(-12, -4, G0, G0 + 10)])
# ---------------------------------------------------------------- stairs (entrance hall, rising toward +Y), hole in first floor
SX0, SX1 = -29, -22; RISE = 1.0; TREAD = 1.4; N = 13; SY0 = -17
for i in range(N):
    y = SY0 + i * TREAD
    box("travertine", SX0, SX1, y, y + TREAD, G0, G0 + (i + 1) * RISE)
    box("led", SX0 + 0.2, SX1 - 0.2, y - 0.08, y + 0.02, G0 + (i + 1) * RISE - 0.35, G0 + (i + 1) * RISE - 0.2)
HOLE = (X0 + 0.5, -14.5, Y0 + 0.5, SY0 + N * TREAD)   # double-height foyer over the stairs
# first floor slab with stair hole
for (a, b, c, d) in ((X0, HOLE[0], Y0, Y1), (HOLE[1], X1, Y0, Y1), (HOLE[0], HOLE[1], Y0, HOLE[2]), (HOLE[0], HOLE[1], HOLE[3], Y1)):
    box("slab", a, b, c, d, G1, F0 - 0.1); box("floor", a, b, c, d, F0 - 0.1, F0)
box("slab", -30, 30, Y0 - 7, Y0, G1, F0)                                  # front balcony slab (cantilever)
box("glass", -14, 30, Y0 - 7.1, Y0 - 6.8, F0, F0 + 3.2); box("frame", -14, 30, Y0 - 7.2, Y0 - 6.7, F0 + 3.2, F0 + 3.5)
box("glass", SX1, HOLE[1], HOLE[3] - 0.15, HOLE[3] + 0.15, F0, F0 + 3.4)   # glass + gold railing round the void
box("gold", SX1, HOLE[1], HOLE[3] - 0.2, HOLE[3] + 0.2, F0 + 3.4, F0 + 3.7)
box("glass", SX1 - 0.15, SX1 + 0.15, SY0, HOLE[3], G0 + 1, G0 + 4.4)                # stair side glass
box("gold", SX1 - 0.2, SX1 + 0.2, SY0, HOLE[3], G0 + 4.4, G0 + 4.7)
# ---------------------------------------------------------------- first floor walls + rooms
wall_x("cream", Y0, X0, X1, F0, F1, holes=[(-12, 28, F0, F1 - 0.8)])                     # glass to balcony
box("glass", -12, 28, Y0 - 0.15, Y0 + 0.15, F0, F1 - 0.8)
for x in range(-12, 29, 8): box("frame", x - 0.2, x + 0.2, Y0 - 0.4, Y0 + 0.4, F0, F1 - 0.8)
wall_x("cream", Y1, X0, X1, F0, F1, holes=[(-26, -16, F0 + 3, F1 - 2), (14, 22, F0 + 4, F1 - 2)])
box("glass", -26, -16, Y1 - 0.15, Y1 + 0.15, F0 + 3, F1 - 2); box("glass", 14, 22, Y1 - 0.15, Y1 + 0.15, F0 + 4, F1 - 2)
wall_y("cream", X0, Y0, Y1, F0, F1); wall_y("cream", X1, Y0, Y1, F0, F1)
wall_y("plaster", -14, Y0, Y1, F0, F1, holes=[(3, 9, F0, F0 + 9)])                       # landing | bedroom
wall_x("plaster", 6, -14, X1, F0, F1, holes=[(-6, 0, F0, F0 + 9), (12, 18, F0, F0 + 9)])  # bedroom | study + bath
wall_y("plaster", 10, 6, Y1, F0, F1)                                                     # study | bath
box("tile", 10, 30, 6, 20, F0, F0 + 0.05)
# white ceilings (so rooms look bright from inside)
for (a, b, c, d) in ((X0, HOLE[0], Y0, Y1), (HOLE[1], X1, Y0, Y1), (HOLE[0], HOLE[1], Y0, HOLE[2]), (HOLE[0], HOLE[1], HOLE[3], Y1)):
    box("plaster", a + 0.5, b - 0.5 if b == X1 else b, c + 0.5 if c == Y0 else c, d - 0.5 if d == Y1 else d, G1 - 0.15, G1)
box("plaster", X0 + 0.5, X1 - 0.5, Y0 + 0.5, Y1 - 0.5, F1 - 0.15, F1)
for x in (-8, 6, 20):
    for y in (-12, 0, 12): box("light", x - 0.6, x + 0.6, y - 0.6, y + 0.6, G1 - 0.25, G1 - 0.15); box("light", x - 0.6, x + 0.6, y - 0.6, y + 0.6, F1 - 0.25, F1 - 0.15)
# roof
box("slab", X0 - 3, X1 + 3, Y0 - 3, Y1 + 3, F1, F1 + 1.4)
box("frame", -10, 10, -8, 8, F1 + 1.4, F1 + 1.8)
# ---------------------------------------------------------------- doors (separate meshes; hinge = min corner, opened by script)
box("walnut", -24, -21, Y0 - 0.3, Y0 + 0.3, G0, G0 + 11, door="FrontL")
box("walnut", -21, -18, Y0 - 0.3, Y0 + 0.3, G0, G0 + 11, door="FrontR")
box("gold", -21.6, -21.3, Y0 - 0.8, Y0 - 0.45, G0 + 3, G0 + 8); box("gold", -20.7, -20.4, Y0 - 0.8, Y0 - 0.45, G0 + 3, G0 + 8)
box("glass", -27, -24, Y0 - 0.15, Y0 + 0.15, G0, G1 - 0.6); box("glass", -18, -15, Y0 - 0.15, Y0 + 0.15, G0, G1 - 0.6)
box("walnut", -14.3, -13.7, 3, 9, F0, F0 + 9, door="Bedroom")
box("wood", -6, 0, 5.7, 6.3, F0, F0 + 9, door="Study")
box("wood", 12, 18, 5.7, 6.3, F0, F0 + 9, door="Bath")
# ---------------------------------------------------------------- garage wing (left) with roller door
box("plaster", -46, -30, -14, 14, 1.5, 12.5)
box("slab", -47, -30, -15, 15, 12.5, 13.5)
box("frame", -44, -32, -14.4, -14, 1.5, 10.5, door="Garage")
box("oak", -46, -30, -14, 14, 1.5, 1.55)
# ---------------------------------------------------------------- living room (after Codex "villa living room")
F = G0 + 0.1
def bevbox(key, x0, x1, y0, y1, z0, z1, w=0.35):
    o = box(key, x0, x1, y0, y1, z0, z1)
    if o:
        m = o.modifiers.new("b", "BEVEL"); m.width = w; m.segments = 3
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="b")
    return o
def torus(key, x, y, z, R, r):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=40, minor_segments=8, location=(x, y, z)); parts[key].append(bpy.context.active_object)
def plant(x, y, h=7):
    cyl("planter", x, y, F, F + 3.2, 1.3); cyl("walnut", x, y, F + 3.2, F + h - 2, 0.15, 8)
    for i, (dx, dy, dz) in enumerate(((0, 0, 0), (0.9, 0.3, -0.8), (-0.8, 0.5, -0.5), (0.2, -0.9, -0.9), (-0.4, -0.5, 0.4))):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.4 - i * 0.08, location=(x + dx, y + dy, F + h - 1 + dz)); parts["olive"].append(bpy.context.active_object)
box("rug", 3, 25, -17.5, -3.5, F, F + 0.08)
# curved boucle sofa: long run + chaise + rounded back, cushions
bevbox("boucle", 4, 7.5, -17, -5, F, F + 4.0, 0.9); bevbox("boucle", 7.5, 16, -17, -14.2, F, F + 2.6, 0.9); bevbox("boucle", 4, 13, -8, -5, F, F + 2.6, 0.9)
bevbox("boucle", 7.5, 13, -14.2, -8, F, F + 2.1, 0.7)
for (x0, y0) in ((4.6, -15.6), (4.6, -11.8), (4.6, -8.2)): bevbox("rug", x0, x0 + 1.4, y0, y0 + 3, F + 2.4, F + 4.8, 0.5)
bevbox("fabric", 4.6, 6, -13.5, -11.5, F + 2.4, F + 4.4, 0.4)
# marble coffee table, gold side tables, flowers
bevbox("marble", 14, 20, -13.5, -7.5, F, F + 1.9, 0.25)
cyl("gold", 21.5, -15.5, F, F + 2.4, 0.9); cyl("gold", 21.5, -4.8, F, F + 2.4, 0.9)
cyl("gold", 17, -10.5, F + 1.9, F + 2.8, 0.6); 
for (dx, dy) in ((0, 0), (0.6, 0.4), (-0.5, 0.5), (0.3, -0.6)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.6, location=(17 + dx, -10.5 + dy, F + 3.2)); parts["flower"].append(bpy.context.active_object)
# round accent chairs facing the sofa
for y in (-15, -5.5): bevbox("boucle", 23, 26, y - 1.5, y + 1.5, F, F + 2.2, 0.8); bevbox("boucle", 25.2, 26.4, y - 1.6, y + 1.6, F, F + 3.8, 0.6)
# stone TV wall with floating walnut console + LED underglow
box("travertine", 28.6, 29.5, -19.4, 3.5, F, G1 - 0.2)
box("black", 28.3, 28.6, -14.5, -5.5, F + 4.5, F + 9.5); box("walnut", 26.6, 28.6, -17, -3, F + 1.4, F + 2.6); box("led", 26.8, 28.4, -16.8, -3.2, F + 1.2, F + 1.4)
# walnut slatted feature wall on the hall partition
for y in [i * 0.9 - 19 for i in range(17)]: box("walnut", -13.6, -13.3, y, y + 0.55, F, G1 - 0.2)
for x in (-11, 1): box("gold", x - 0.2, x + 0.2, -19.3, -19.0, G0 + 6, G0 + 9.5); box("led", x - 0.15, x + 0.15, -19.0, -18.95, G0 + 6.3, G0 + 9.2)
# ring chandelier + cove LED ceiling over the living room
torus("gold", 14, -10, G1 - 3.2, 3.6, 0.18); torus("gold", 14, -10, G1 - 3.9, 2.6, 0.16); torus("led", 14, -10, G1 - 3.2, 3.6, 0.1)
for (a2, b2) in ((-1, 1), ):
    pass
for (x, y) in ((14, -10), ):
    for dx in (-2.6, 2.6): cyl("gold", x + dx, y, G1 - 3.9, G1 - 0.2, 0.04, 6)
box("plaster", -13, 29, -19.5, 3, G1 - 0.9, G1 - 0.2)                       # dropped ceiling tray
box("led", -12.6, 28.6, -19.2, -18.9, G1 - 1.0, G1 - 0.9); box("led", -12.6, 28.6, 2.6, 2.9, G1 - 1.0, G1 - 0.9)
# sheer curtains at the window ends
for x in (-12.6, 27.4): box("curtain", x, x + 1.2, -19.3, -18.6, G0 + 0.4, G1 - 0.4)
plant(-11.5, -16.5); plant(26.5, 1.0)
# ---------------------------------------------------------------- kitchen (after Codex "foyer and kitchen")
box("walnut", -29.5, -6, 18.2, 19.6, F, G1 - 0.2)                              # tall walnut wall cabinets
box("marble", -27, -9, 17.4, 18.2, F + 3.6, F + 7.2)                           # marble backsplash
box("travertine", -27, -9, 16.6, 18.2, F, F + 3.6); box("marble", -27.2, -8.8, 16.4, 18.2, F + 3.6, F + 4.0)   # base run
box("led", -27, -9, 17.3, 17.4, F + 7.0, F + 7.2)
box("gold", -21, -15, 16.4, 18.2, F + 8, F + 11); box("gold", -19.5, -16.5, 16.8, 18.2, F + 11, G1 - 0.2)        # brass hood
box("black", -27.2, -24.5, 18.0, 18.3, F + 4.5, F + 8)                                                          # ovens
# waterfall marble island with walnut back and gold-leg stools
box("marble", -23, -11, 9.5, 13, F + 3.6, F + 4.1); box("marble", -23, -22.5, 9.5, 13, F, F + 3.6); box("marble", -11.5, -11, 9.5, 13, F, F + 3.6)
box("walnut", -22.5, -11.5, 9.7, 10.2, F, F + 3.6)
for x in (-20.5, -17, -13.5):
    for (dx, dy) in ((-0.6, -0.6), (0.6, -0.6), (-0.6, 0.6), (0.6, 0.6)): box("gold", x + dx - 0.07, x + dx + 0.07, 7.8 + dy - 0.07, 7.8 + dy + 0.07, F, F + 2.6)
    bevbox("boucle", x - 0.9, x + 0.9, 6.9, 8.7, F + 2.6, F + 3.1, 0.2); bevbox("boucle", x - 0.9, x + 0.9, 6.6, 7.0, F + 3.1, F + 4.6, 0.15)
for x in (-20, -17, -14): cyl("gold", x, 11.2, G1 - 0.2 - 4.5, G1 - 0.2, 0.04, 6); cyl("gold", x, 11.2, G1 - 5.6, G1 - 4.6, 0.55); cyl("led", x, 11.2, G1 - 5.7, G1 - 5.6, 0.45)
box("kitchen", -29.5, -27, 9, 15, F, F + 9.5); box("walnut", -29.5, -27, 9, 15, F + 9.5, G1 - 0.2)           # fridge column
# round dining table with 6 chairs + drum pendant
cyl("walnut", 7, 11.5, F, F + 2.8, 0.8); cyl("marble", 7, 11.5, F + 2.8, F + 3.2, 3.6)
for k in range(6):
    import math as _m; ang = k * _m.pi / 3; cx2, cy2 = 7 + _m.cos(ang) * 4.6, 11.5 + _m.sin(ang) * 4.6
    bevbox("boucle", cx2 - 0.9, cx2 + 0.9, cy2 - 0.9, cy2 + 0.9, F, F + 2.0, 0.3)
    bevbox("boucle", cx2 + _m.cos(ang) * 0.7 - 0.7, cx2 + _m.cos(ang) * 0.7 + 0.7, cy2 + _m.sin(ang) * 0.7 - 0.7, cy2 + _m.sin(ang) * 0.7 + 0.7, F + 2.0, F + 4.6, 0.3)
cyl("gold", 7, 11.5, G1 - 3, G1 - 0.2, 0.04, 6); cyl("flower", 7, 11.5, G1 - 4.6, G1 - 3, 2.4, 24); cyl("led", 7, 11.5, G1 - 4.7, G1 - 4.6, 2.2, 24)
plant(-3, 18); plant(26, 18.5)
# ---------------------------------------------------------------- foyer (double height)
box("rug", -27.5, -15.5, -15, -6, F, F + 0.07)
box("travertine", -29.5, -29, -19.5, 0, F, F0 + 12)                              # stone feature wall, full height
for z in (G0 + 7, F0 + 7): box("gold", -29, -28.7, -10.5, -10, z, z + 4); box("led", -28.7, -28.65, -10.4, -10.1, z + 0.3, z + 3.7)
torus("gold", -21, -9, F0 + 6, 3.2, 0.2); torus("led", -21, -9, F0 + 6, 3.2, 0.1); torus("gold", -21, -9, F0 + 5, 2.2, 0.16)
for dx in (-3.2, 3.2): cyl("gold", -21 + dx, -9, F0 + 6, F1 - 0.2, 0.04, 6)
plant(-16.5, -17.5, 8); plant(-27, -17.5, 8)
# ---------------------------------------------------------------- bedroom (first floor, front)
B = F0 + 0.05
box("rug", 6, 26, -17, -4, B, B + 0.06)
box("walnut", 28.4, 29.4, -18, -3, B, F1 - 0.2); box("led", 28.3, 28.4, -17.8, -3.2, B + 7.5, B + 7.8)                # walnut headboard wall
box("bed", 18, 28.6, -15, -6, B, B + 2.4); box("fabric", 18, 23, -15.2, -5.8, B + 2.4, B + 2.7)   # bed + throw
box("bed", 26, 28.4, -14.5, -11, B + 2.4, B + 3.4); box("bed", 26, 28.4, -10, -6.5, B + 2.4, B + 3.4)  # pillows
for y in (-17.8, -3.2): box("oak", 26, 28.6, y - 1, y + 1, B, B + 2.4); cyl("light", 27.3, y, B + 2.4, B + 3.6, 0.6)
box("walnut", -12, 4, 4.4, 5.4, B, F1 - 0.2); box("gold", -4.2, -3.9, 4.2, 4.4, B + 3, B + 7)              # walnut wardrobe
box("light", -12, -2, -19.4, -19.3, B + 10, B + 10.4)
# study (back-left of first floor)
box("oak", -12, -2, 16, 19, B + 2.8, B + 3.1); box("black", -11.5, -2.5, 16.5, 18.5, B, B + 2.8)
box("black", -8, -6, 18, 18.6, B + 3.1, B + 6); box("light", -7.9, -6.1, 17.9, 18, B + 3.4, B + 5.7)
box("fabric", -8.5, -5.5, 13, 15.5, B, B + 3)
# bathroom (first floor, back-right)
box("marble", 22, 29.4, 13, 19.4, B, B + 2.2); box("pool", 22.5, 29, 13.5, 19, B + 1.6, B + 2.0)    # bathtub
box("marble", 11, 17, 18, 19.6, B + 3, B + 3.5); box("kitchen", 11, 17, 18, 19.6, B, B + 3)          # vanity
box("glass", 11.5, 16.5, 19.5, 19.6, B + 5, B + 9)                                                  # mirror
box("kitchen", 11, 13, 8, 10.5, B, B + 2.4)                                                         # toilet
# ---------------------------------------------------------------- outside: pool, deck, loungers, palms, lights
box("stone", -28, 34, 21, 46, 1.5, 2.2)
box("pool", -16, 26, 26, 40, 1.9, 2.25)
box("marble", -17, 27, 25, 26, 2.2, 2.5); box("marble", -17, 27, 40, 41, 2.2, 2.5)
box("marble", -17, -16, 26, 40, 2.2, 2.5); box("marble", 26, 27, 26, 40, 2.2, 2.5)
for x in (-24, -20): box("bed", x - 1.2, x + 1.2, 29, 36, 2.2, 3.0); box("bed", x - 1.2, x + 1.2, 35, 37, 3.0, 4.6)
for x in (30, 33): box("bed", x - 1.2, x + 1.2, 28, 35, 2.2, 3.0)
for x in (-14, 0, 14, 28): box("light", x - 0.6, x + 0.6, Y0 - 9, Y0 - 8, 1.5, 2.0)
for x in (-28.5, -13.5): box("gold", x - 0.25, x + 0.25, Y0 - 0.9, Y0 - 0.5, G0 + 6, G0 + 9.5); box("led", x - 0.2, x + 0.2, Y0 - 0.95, Y0 - 0.85, G0 + 6.4, G0 + 9.1)
def palm(x, y, h):
    for i in range(6): cyl("wood", x + i * 0.3, y, 1.5 + i * h / 6, 1.5 + (i + 1) * h / 6, 1.1 - i * 0.09, 10)
    for j in range(8):
        a = j * math.pi / 4; bpy.ops.mesh.primitive_cube_add(size=1, location=(x + 1.8 + math.cos(a) * 3.6, y + math.sin(a) * 3.6, 1.5 + h - 0.4))
        o = bpy.context.active_object; o.scale = (7.5, 1.6, 0.25); o.rotation_euler = (math.radians(15), 0, a)
        bpy.ops.object.transform_apply(scale=True, rotation=True); parts["leaf"].append(o)
for (x, y) in ((-40, -28), (38, -28), (38, 44), (-36, 42)): palm(x, y, 26)
# ---------------------------------------------------------------- join per material, keep doors separate, export
objs = []
for k, lst in parts.items():
    if not lst: continue
    bpy.ops.object.select_all(action="DESELECT")
    for o in lst: o.select_set(True)
    bpy.context.view_layer.objects.active = lst[0]; bpy.ops.object.join(); o = bpy.context.active_object
    o.name = "Mansion_" + k; o.data.name = o.name; o.data.materials.clear(); o.data.materials.append(MATS[k]); objs.append(o)
for name, (o, k) in doors.items():
    o.name = "Door_" + name; o.data.name = o.name; o.data.materials.clear(); o.data.materials.append(MATS[k]); objs.append(o)
tris = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs}
print("MESHES", len(objs), "max tris", max(tris.values()), "total", sum(tris.values()))
bpy.ops.object.select_all(action="DESELECT")
for o in objs: o.select_set(True)
bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, "LuxuryMansion.fbx"), use_selection=True, object_types={"MESH"},
                         axis_forward="-Z", axis_up="Y", apply_unit_scale=True, mesh_smooth_type="FACE")
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "LuxuryMansion.blend"))
if A.get("render") == "1":
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.95, 0.68, 0.45, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
    bpy.ops.mesh.primitive_plane_add(size=600); g = bpy.context.active_object
    gm = bpy.data.materials.new("sand"); gm.use_nodes = True; gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.67, 0.5, 0.29, 1); g.data.materials.append(gm)
    bpy.ops.object.light_add(type="SUN", rotation=(math.radians(62), 0, math.radians(-35))); s = bpy.context.active_object; s.data.energy = 4.5; s.data.color = (1, .82, .62)
    cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
    sc.render.engine = "CYCLES"; sc.cycles.samples = int(A.get("spp", "16")); sc.cycles.use_denoising = True; sc.cycles.max_bounces = 6
    sc.render.resolution_x, sc.render.resolution_y = 1280, 760; sc.view_settings.view_transform = "AgX"
    shots = {"exterior": ((70, -95, 42), (-2, 0, 10), 30), "back_pool": ((-60, 105, 34), (5, 20, 8), 30),
             "living": ((-11, -1, 8), (24, -12, 5), 16), "foyer": ((-15.5, 2, 9), (-25, -18, 9), 16), "kitchen": ((12, -3, 8), (-20, 14, 6), 16), "bedroom": ((-10, -16, F0 + 7), (28, -6, F0 + 3), 18)}
    for n, (loc, tgt, lens) in shots.items():
        if A.get("shots") and n not in A["shots"].split(","): continue
        cam.location = loc; cam.data.lens = lens; cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(OUT, "mansion_" + n + ".png"); bpy.ops.render.render(write_still=True); print("rendered", n, flush=True)
print("DONE")
