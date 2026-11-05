"""mansion.py – Dream Builders luxury mansion WITH INTERIOR (Blender 5.x). 1 Blender unit = 1 Roblox stud.
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
box("oak", X0, X1, Y0, Y1, 1.5, 1.6)                                     # ground floor finish (walk on 1.6)
box("tile", -30, -6, 6, 20, 1.6, 1.65)                                   # kitchen tiles
# exterior walls ground floor: front: front door + glass wall; back: glass sliding wall to pool
wall_x("plaster", Y0, X0, X1, G0, G1, holes=[(-24, -18, G0, G0 + 9), (-12, 28, G0 + 0.8, G1 - 0.8)])
wall_x("plaster", Y1, X0, X1, G0, G1, holes=[(-2, 26, G0, G1 - 0.8)])
wall_y("plaster", X0, Y0, Y1, G0, G1, holes=[(-6, 2, G0 + 3, G1 - 2)])
wall_y("plaster", X1, Y0, Y1, G0, G1, holes=[(8, 16, G0 + 3, G1 - 2)])
# glazing + frames (front living wall, back sliding wall, side windows)
box("glass", -12, 28, Y0 - 0.15, Y0 + 0.15, G0 + 0.8, G1 - 0.8)
for x in range(-12, 29, 8): box("frame", x - 0.2, x + 0.2, Y0 - 0.4, Y0 + 0.4, G0 + 0.8, G1 - 0.8)
box("glass", -2, 26, Y1 - 0.15, Y1 + 0.15, G0, G1 - 0.8)
for x in range(-2, 27, 7): box("frame", x - 0.2, x + 0.2, Y1 - 0.4, Y1 + 0.4, G0, G1 - 0.8)
box("glass", X0 - 0.15, X0 + 0.15, -6, 2, G0 + 3, G1 - 2); box("glass", X1 - 0.15, X1 + 0.15, 8, 16, G0 + 3, G1 - 2)
# interior partition: entrance hall | living (open), kitchen counter wall
wall_y("plaster", -14, Y0, 4, G0, G1, holes=[(-12, -4, G0, G0 + 10)])
# ---------------------------------------------------------------- stairs (entrance hall, rising toward +Y), hole in first floor
SX0, SX1 = -29, -22; RISE = 1.0; TREAD = 1.4; N = 13; SY0 = -17
for i in range(N):
    y = SY0 + i * TREAD
    box("oak", SX0, SX1, y, y + TREAD, G0, G0 + (i + 1) * RISE)
HOLE = (SX0, SX1, SY0 + 2, SY0 + N * TREAD)
# first floor slab with stair hole
for (a, b, c, d) in ((X0, HOLE[0], Y0, Y1), (HOLE[1], X1, Y0, Y1), (HOLE[0], HOLE[1], Y0, HOLE[2]), (HOLE[0], HOLE[1], HOLE[3], Y1)):
    box("slab", a, b, c, d, G1, F0 - 0.1); box("oak", a, b, c, d, F0 - 0.1, F0)
box("slab", -30, 30, Y0 - 7, Y0, G1, F0)                                  # front balcony slab (cantilever)
box("glass", -14, 30, Y0 - 7.1, Y0 - 6.8, F0, F0 + 3.2); box("frame", -14, 30, Y0 - 7.2, Y0 - 6.7, F0 + 3.2, F0 + 3.5)
for (a, b) in ((HOLE[1], HOLE[1] + 0.3), ):
    box("frame", a, b, HOLE[2], HOLE[3], F0, F0 + 3.4)                     # stair railing upstairs
box("frame", HOLE[0], HOLE[1], HOLE[2] - 0.3, HOLE[2], F0, F0 + 3.4)
# ---------------------------------------------------------------- first floor walls + rooms
wall_x("cream", Y0, X0, X1, F0, F1, holes=[(-12, 28, F0, F1 - 0.8)])                     # glass to balcony
box("glass", -12, 28, Y0 - 0.15, Y0 + 0.15, F0, F1 - 0.8)
for x in range(-12, 29, 8): box("frame", x - 0.2, x + 0.2, Y0 - 0.4, Y0 + 0.4, F0, F1 - 0.8)
wall_x("cream", Y1, X0, X1, F0, F1, holes=[(-26, -16, F0 + 3, F1 - 2), (14, 22, F0 + 4, F1 - 2)])
box("glass", -26, -16, Y1 - 0.15, Y1 + 0.15, F0 + 3, F1 - 2); box("glass", 14, 22, Y1 - 0.15, Y1 + 0.15, F0 + 4, F1 - 2)
wall_y("cream", X0, Y0, Y1, F0, F1); wall_y("cream", X1, Y0, Y1, F0, F1)
wall_y("plaster", -14, Y0, Y1, F0, F1, holes=[(-4, 2, F0, F0 + 9)])                      # landing | bedroom
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
box("wood", -24, -18, Y0 - 0.3, Y0 + 0.3, G0, G0 + 9, door="Front")
box("gold", -18.9, -18.6, Y0 - 0.7, Y0 - 0.4, G0 + 4, G0 + 6)
box("wood", -14.3, -13.7, -4, 2, F0, F0 + 9, door="Bedroom")
box("wood", -6, 0, 5.7, 6.3, F0, F0 + 9, door="Study")
box("wood", 12, 18, 5.7, 6.3, F0, F0 + 9, door="Bath")
# ---------------------------------------------------------------- garage wing (left) with roller door
box("plaster", -46, -30, -14, 14, 1.5, 12.5)
box("slab", -47, -30, -15, 15, 12.5, 13.5)
box("frame", -44, -32, -14.4, -14, 1.5, 10.5, door="Garage")
box("oak", -46, -30, -14, 14, 1.5, 1.55)
# ---------------------------------------------------------------- living room furniture
F = G0 + 0.1
box("fabric", 2, 24, -17, -5, F, F + 0.08)                                # rug
box("sofa", 2, 4.5, -16, -6, F, F + 4.2); box("sofa", 2, 11, -16, -14, F, F + 2.4); box("sofa", 4.5, 11, -16, -6, F, F + 2.0)  # L sofa
for y in (-13, -10, -7.5): box("bed", 4.6, 7.4, y, y + 2.2, F + 2.0, F + 3.2)        # cushions
box("marble", 13, 18, -14, -8, F + 1.6, F + 2.1); box("black", 13.5, 17.5, -13.5, -8.5, F, F + 1.6)  # coffee table
box("black", 28.2, 29.4, -16, -4, F, F + 2.2); box("black", 29.2, 29.45, -14, -6, F + 4, F + 8.5)    # TV unit + TV
box("light", 29.1, 29.2, -13.6, -6.4, F + 4.4, F + 8.1)
cyl("gold", 20, -3, F, F + 7, 0.25); cyl("light", 20, -3, F + 7, F + 8.2, 1.2)                     # floor lamp
# kitchen + dining
box("kitchen", -29.5, -8, 17.5, 19.5, F, F + 3.6); box("marble", -29.5, -8, 17.3, 19.5, F + 3.6, F + 4.0)   # back counters
box("kitchen", -29.5, -8, 18.5, 19.5, F + 7, F + 10.5)                                                 # upper cabinets
box("kitchen", -29.5, -27, 9, 15, F, F + 9.5)                                                          # fridge
box("black", -27.1, -26.9, 11, 13, F + 4, F + 6)
box("kitchen", -22, -12, 10, 13, F, F + 3.6); box("marble", -22.4, -11.6, 9.6, 13.4, F + 3.6, F + 4.0) # island
for x in (-20, -16.5, -13): cyl("black", x, 8.3, F, F + 2.8, 0.7); cyl("gold", x, 8.3, F + 2.8, F + 3.1, 1)  # stools
for x in (-19, -15): cyl("black", x, 11.5, G1 - 3, G1, 0.08); cyl("gold", x, 11.5, G1 - 3.6, G1 - 3, 0.9)   # pendants
box("oak", 0, 14, 9, 14, F + 2.9, F + 3.3); box("black", 1, 13, 10.5, 12.5, F, F + 2.9)                     # dining table
for x in (2, 7, 12):
    for (y0, y1) in ((7.2, 8.6), (14.4, 15.8)): box("fabric", x - 0.8, x + 0.8, y0, y1, F, F + 1.8); box("fabric", x - 0.8, x + 0.8, y0 if y0 < 10 else y1 - 0.3, (y0 + 0.3) if y0 < 10 else y1, F + 1.8, F + 4.2)
# entrance hall: console + plant + chandelier
box("oak", -21, -15, -19.4, -18, F, F + 3); cyl("leaf", -16.5, -17, F, F + 5, 1.2)
cyl("gold", -18, -8, G1 - 2.5, G1, 0.1); cyl("light", -18, -8, G1 - 3.5, G1 - 2.5, 1.6)
# ---------------------------------------------------------------- bedroom (first floor, front)
B = F0 + 0.05
box("fabric", 6, 26, -17, -6, B, B + 0.06)
box("wood", 28.6, 29.4, -16, -5, B, B + 7)                                # headboard on right wall
box("bed", 18, 28.6, -15, -6, B, B + 2.4); box("fabric", 18, 23, -15.2, -5.8, B + 2.4, B + 2.7)   # bed + throw
box("bed", 26, 28.4, -14.5, -11, B + 2.4, B + 3.4); box("bed", 26, 28.4, -10, -6.5, B + 2.4, B + 3.4)  # pillows
for y in (-17.8, -3.2): box("oak", 26, 28.6, y - 1, y + 1, B, B + 2.4); cyl("light", 27.3, y, B + 2.4, B + 3.6, 0.6)
box("wood", -12, 4, 4.4, 5.4, B, B + 9)                                   # wardrobe on partition
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
             "living": ((-11, -16, 7.5), (20, -2, 5), 18), "kitchen": ((10, -2, 8), (-22, 16, 5), 18), "bedroom": ((-10, -16, F0 + 7), (28, -6, F0 + 3), 18)}
    for n, (loc, tgt, lens) in shots.items():
        if A.get("shots") and n not in A["shots"].split(","): continue
        cam.location = loc; cam.data.lens = lens; cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(OUT, "mansion_" + n + ".png"); bpy.ops.render.render(write_still=True); print("rendered", n, flush=True)
print("DONE")
