"""cars.py – Dream Builders vehicles (Blender 5.x). 1 unit = 1 Roblox stud (≈0.28 m). X = forward, Y = left, Z = up.
Bodies are lofted from cross-sections (superellipses) + subdivision, wheel arches cut with booleans, real wheels
(tyre, rim + spokes, disc, caliper), lights, mirrors and a visible interior (seats, dash, wheel, console).
Run in the owner's Blender:  exec(open(r"C:\\Users\\PC\\Downloads\\DreamBuilders_models\\cars.py").read())   (builds CAR = "hypercar")
or headless:                python3 cars.py -- car=hypercar out=<dir> [render=1]
Exports <out>/<car>.fbx: one mesh per material (Car_<mat>) + each wheel as Wheel_<pos>_tyre / _rim so Roblox can spin them."""
import bpy, bmesh, math, sys, os
from mathutils import Vector
ARGS = dict(a.split("=", 1) for a in (sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []))
CAR = globals().get("CAR") or ARGS.get("car", "hypercar")
OUT = globals().get("OUT") or ARGS.get("out", os.path.join(os.path.expanduser("~"), "Downloads", "DreamBuilders_models"))
SPECS = {
 "hypercar": dict(
    paint=(18, 40, 140), leather=(176, 104, 54), caliper=(250, 200, 20), rim=(78, 80, 90),
    body=[(-8.1, 2.9, 1.2, 2.6, 6), (-7.6, 3.4, 0.9, 3.0, 6), (-6.4, 3.75, 0.7, 3.2, 6), (-5.0, 3.85, 0.65, 3.25, 6), (-3.6, 3.7, 0.6, 3.15, 6),
          (-2.0, 3.45, 0.55, 3.0, 6), (0.0, 3.45, 0.55, 2.8, 6), (2.0, 3.5, 0.55, 2.55, 6), (3.6, 3.7, 0.6, 2.35, 6), (5.0, 3.8, 0.6, 2.25, 6),
          (6.3, 3.6, 0.65, 1.95, 6), (7.4, 3.2, 0.75, 1.6, 5), (8.1, 2.6, 0.9, 1.3, 4)],
    cabin=[(-4.2, 1.9, 2.9, 3.2, 4), (-3.0, 2.4, 2.8, 3.9, 4), (-1.0, 2.55, 2.7, 4.05, 4), (1.0, 2.45, 2.6, 3.85, 4), (2.6, 2.15, 2.45, 3.2, 4), (3.4, 1.8, 2.35, 2.6, 4)],
    wheels=[(5.0, 3.15), (-5.0, 3.2)], wheel_r=1.38, tyre_w=1.15, arch_r=1.75, ground=0.0, spokes=5,
    seats=[(-1.2, 1.2), (-1.2, -1.2)], wheel_x=0.6, dash_x=1.8, low=True),
}
S = SPECS[CAR]
def rgb(c): return tuple((v / 255) ** 2.2 for v in c) + (1,)
MATDEF = {"paint": (S["paint"], .18, .6, 1, 0, .9), "glass": ((10, 12, 16), .02, 0, .82, 0, 0), "black": ((18, 18, 20), .5, 0, 1, 0, 0),
          "tyre": ((22, 22, 24), .9, 0, 1, 0, 0), "rim": (S["rim"], .25, 1, 1, 0, 0), "chrome": ((200, 200, 205), .1, 1, 1, 0, 0),
          "caliper": (S["caliper"], .4, 0, 1, 0, 0), "light": ((255, 252, 240), .2, 0, 1, 8, 0), "tail": ((255, 30, 30), .3, 0, 1, 6, 0),
          "leather": (S["leather"], .55, 0, 1, 0, 0), "carbon": ((32, 32, 36), .3, .2, 1, 0, .5)}
MATS = {}
def mats():
    for k, (c, r, m, a, e, coat) in MATDEF.items():
        mt = bpy.data.materials.get("Car_" + k) or bpy.data.materials.new("Car_" + k); mt.use_nodes = True
        p = mt.node_tree.nodes["Principled BSDF"]; p.inputs["Base Color"].default_value = rgb(c)
        p.inputs["Roughness"].default_value = r; p.inputs["Metallic"].default_value = m
        if a < 1: p.inputs["Alpha"].default_value = a
        if e: p.inputs["Emission Color"].default_value = rgb(c); p.inputs["Emission Strength"].default_value = e
        if coat: p.inputs["Coat Weight"].default_value = coat
        MATS[k] = mt
parts = {}
def add(key, o): parts.setdefault(key, []).append(o); return o
def link(me, name):
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); return o
def loft(name, sections, n=32, cap=True):
    """sections: (x, halfwidth, zbottom, ztop, squareness)"""
    bm = bmesh.new(); rings = []
    for (x, w, zb, zt, p) in sections:
        zc, h = (zb + zt) / 2, (zt - zb) / 2; ring = []
        for i in range(n):
            t = 2 * math.pi * i / n; c, s = math.cos(t), math.sin(t)
            y = w * math.copysign(abs(c) ** (2 / p), c); z = zc + h * math.copysign(abs(s) ** (2 / p), s)
            ring.append(bm.verts.new((x, y, z)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(n): bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    if cap:
        bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = link(me, name)
    sd = o.modifiers.new("sub", "SUBSURF"); sd.levels = 1; sd.render_levels = 1
    for f in me.polygons: f.use_smooth = True
    return o
def cube(key, x0, x1, y0, y1, z0, z1, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.active_object; o.scale = (x1 - x0, y1 - y0, z1 - z0); bpy.ops.object.transform_apply(scale=True)
    if bevel: b = o.modifiers.new("b", "BEVEL"); b.width = bevel; b.segments = 3
    return add(key, o)
def cyl(key, loc, r, depth, axis="Y", verts=32):
    rot = {"X": (0, math.pi / 2, 0), "Y": (math.pi / 2, 0, 0), "Z": (0, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object; return add(key, o)
def apply_all(o):
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
def build():
    for o in list(bpy.data.objects):
        if o.name.startswith(("Car_", "Wheel_", "CarTmp")): bpy.data.objects.remove(o, do_unlink=True)
    parts.clear(); mats()
    R, TW = S["wheel_r"], S["tyre_w"]
    # ---- body shell with wheel arches cut out
    body = loft("CarTmp_body", S["body"]); apply_all(body)
    for (wx, wy) in S["wheels"]:
        for side in (1, -1):
            bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=S["arch_r"], depth=3.0, location=(wx, side * (wy + 0.9), R + 0.05), rotation=(math.pi / 2, 0, 0))
            cut = bpy.context.active_object; bo = body.modifiers.new("arch", "BOOLEAN"); bo.object = cut; bo.operation = "DIFFERENCE"
            apply_all(body); bpy.data.objects.remove(cut, do_unlink=True)
    add("paint", body)
    # ---- glass cabin + painted roof spine
    cab = loft("CarTmp_cabin", S["cabin"]); apply_all(cab); add("glass", cab)
    spine = [(x, w * 0.78, max(zb, zt - 0.32), zt + 0.05, p) for (x, w, zb, zt, p) in S["cabin"][1:-1]]
    sp = loft("CarTmp_roof", spine); apply_all(sp); add("paint", sp)
    # ---- lights, grille, diffuser, intakes, mirrors
    nose = S["body"][-1][0]; tail = S["body"][0][0]
    for side in (1, -1):
        y0, y1 = sorted((side * 1.5, side * 2.9)); cube("light", nose - 1.9, nose - 0.9, y0, y1, 1.62, 1.74, 0.04)  # slim LED headlights
        y0, y1 = sorted((side * 3.62, side * 3.9)); cube("black", -3.6, -1.6, y0, y1, 1.3, 2.4, 0.15)            # side intake
        y0, y1 = sorted((side * 2.6, side * 3.45)); cube("paint", 2.3, 3.0, y0, y1, 2.8, 3.25, 0.1)                # mirrors
    cube("tail", tail - 0.05, tail + 0.25, -2.6, 2.6, 2.2, 2.45, 0.05)
    cube("black", nose - 0.6, nose + 0.05, -1.8, 1.8, 0.9, 1.45, 0.1)                                              # front grille
    cube("carbon", tail - 0.1, tail + 1.6, -2.6, 2.6, 0.65, 1.15, 0.1)                                            # rear diffuser
    for i in range(4): cube("chrome", tail - 0.15, tail + 0.2, -0.9 + i * 0.6 - 0.18, -0.9 + i * 0.6 + 0.18, 1.0, 1.35, 0.05)  # exhausts
    cube("carbon", -1.0, 6.2, -2.9, 2.9, 0.35, 0.6)                                                               # underbody / splitter
    # ---- interior (seen through the glass)
    for (sx, sy) in S["seats"]:
        cube("leather", sx - 0.9, sx + 0.6, sy - 0.75, sy + 0.75, 1.1, 1.6, 0.2)
        cube("leather", sx - 1.15, sx - 0.75, sy - 0.75, sy + 0.75, 1.5, 3.4, 0.2)
    cube("leather", S["dash_x"] - 0.4, S["dash_x"] + 1.0, -2.4, 2.4, 2.1, 2.7, 0.2)
    cube("carbon", S["seats"][0][0] - 0.6, S["dash_x"] + 0.2, -0.35, 0.35, 1.0, 2.2, 0.15)                    # console
    bpy.ops.mesh.primitive_torus_add(major_radius=0.55, minor_radius=0.08, location=(S["wheel_x"], 1.2, 2.55), rotation=(0, math.radians(65), 0))
    add("black", bpy.context.active_object)
    # ---- wheels (separate so Roblox can spin them)
    wheels = []
    for i, (wx, wy) in enumerate(S["wheels"]):
        for side in (1, -1):
            tag = ("F" if i == 0 else "R") + ("L" if side > 0 else "R")
            y = side * wy
            bpy.ops.mesh.primitive_torus_add(major_radius=R - 0.3, minor_radius=0.34, major_segments=48, minor_segments=12, location=(wx, y, R), rotation=(math.pi / 2, 0, 0))
            t = bpy.context.active_object; t.scale = (1, 1, TW / 0.68); bpy.ops.object.transform_apply(scale=True)
            for f in t.data.polygons: f.use_smooth = True
            t.name = "Wheel_%s_tyre" % tag; t.data.materials.append(MATS["tyre"]); wheels.append(t)
            rimparts = [cyl("rim", (wx, y + side * 0.15, R), R - 0.48, 0.55, "Y", 40)]
            for k in range(S["spokes"] * 2):
                a = k * math.pi / S["spokes"]
                bpy.ops.mesh.primitive_cube_add(size=1, location=(wx + math.cos(a) * (R - 0.75) / 2, y + side * 0.42, R + math.sin(a) * (R - 0.75) / 2), rotation=(0, -a, 0))
                sp = bpy.context.active_object; sp.scale = (R - 0.7, 0.16, 0.2 if k % 2 else 0.3); bpy.ops.object.transform_apply(scale=True, rotation=True); rimparts.append(sp)
            hub = cyl("rim", (wx, y + side * 0.45, R), 0.25, 0.2, "Y", 24); rimparts.append(hub)
            for p in rimparts:
                if p in parts.get("rim", []): parts["rim"].remove(p)
            bpy.ops.object.select_all(action="DESELECT")
            for p in rimparts: p.select_set(True)
            bpy.context.view_layer.objects.active = rimparts[0]; bpy.ops.object.join(); rim = bpy.context.active_object
            rim.name = "Wheel_%s_rim" % tag; rim.data.materials.clear(); rim.data.materials.append(MATS["rim"]); wheels.append(rim)
            cyl("chrome", (wx, y - side * 0.1, R), R - 0.62, 0.12, "Y", 32)                                       # brake disc
            bpy.ops.mesh.primitive_cube_add(size=1, location=(wx + 0.55, y - side * 0.05, R + 0.45)); c = bpy.context.active_object
            c.scale = (0.6, 0.35, 0.75); bpy.ops.object.transform_apply(scale=True); add("caliper", c)
    # ---- join per material, apply bevels, name, smooth
    out = []
    for k, lst in parts.items():
        lst = [o for o in lst if o.name in bpy.data.objects]
        if not lst: continue
        for o in lst: apply_all(o)
        bpy.ops.object.select_all(action="DESELECT")
        for o in lst: o.select_set(True)
        bpy.context.view_layer.objects.active = lst[0]; bpy.ops.object.join(); o = bpy.context.active_object
        o.name = "Car_" + k; o.data.materials.clear(); o.data.materials.append(MATS[k]); out.append(o)
    out += wheels
    tris = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in out}
    print("CAR", CAR, "meshes", len(out), "max tris", max(tris.values()), "total", sum(tris.values()))
    return out
objs = build()
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
for o in objs: o.select_set(True)
bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, CAR + ".fbx"), use_selection=True, object_types={"MESH"}, axis_forward="-Z", axis_up="Y", mesh_smooth_type="FACE")
print("EXPORTED", os.path.join(OUT, CAR + ".fbx"))
if ARGS.get("render") == "1":
    sc = bpy.context.scene
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.62, 0.42, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.7
    bpy.ops.mesh.primitive_plane_add(size=200); g = bpy.context.active_object; gm = bpy.data.materials.new("floor"); gm.use_nodes = True
    gp = gm.node_tree.nodes["Principled BSDF"]; gp.inputs["Base Color"].default_value = (0.5, 0.42, 0.36, 1); gp.inputs["Roughness"].default_value = 0.25; g.data.materials.append(gm)
    bpy.ops.object.light_add(type="AREA", location=(0, 0, 18)); L = bpy.context.active_object; L.data.size = 20; L.data.energy = 9000
    bpy.ops.object.light_add(type="SUN", rotation=(math.radians(55), 0, math.radians(-30))); bpy.context.active_object.data.energy = 3
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 50
    sc.render.engine = "CYCLES"; sc.cycles.samples = int(ARGS.get("spp", "24")); sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 1280, 720; sc.view_settings.view_transform = "AgX"
    for n, loc, tgt in (("front", (22, -17, 7), (0, 0, 1.8)), ("rear", (-21, 15, 8), (0, 0, 1.8)), ("side", (0, -30, 3.5), (0, 0, 2))):
        cam.location = loc; cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(OUT, "%s_%s.png" % (CAR, n)); bpy.ops.render.render(write_still=True); print("rendered", n, flush=True)
