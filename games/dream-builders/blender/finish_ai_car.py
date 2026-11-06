"""Finish an AI-made car (.glb shape from Hunyuan3D) for Roblox.
- cuts the 4 wheels out as separate spinnable meshes (tyre + rim), adds dark wheel wells
- paints the body by region: paint, glass, black trim, head/tail lights
- decimates to Roblox limits, scales to studs, exports FBX (one mesh per material) + .blend + preview renders
Run:  python finish_ai_car.py <car.glb> <out_dir> <car.json>
car.json: {"name","length_studs","paint":[r,g,b],"wheels":{"front":[y,z,r],"rear":[y,z,r]},"x_inner":0.29,"glass":{...}}
Coordinates are the AI's normalised space (car ~2 long, front = -Y, up = +Z).
"""
import bpy, bmesh, sys, json, math, os
from mathutils import Vector
import numpy as np

glb, out, cfgp = sys.argv[-3:]
C = json.load(open(cfgp))
os.makedirs(out, exist_ok=True)
name = C["name"]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
src = [o for o in bpy.data.objects if o.type == 'MESH'][0]
bpy.context.view_layer.objects.active = src; src.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
src.name = "AI"

# 1) decimate early so the rest is fast
def decimate(o, tris):
    cur = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if cur > tris:
        m = o.modifiers.new("d", 'DECIMATE'); m.ratio = tris / cur
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=m.name)
decimate(src, C.get("work_tris", 120000))

# 2) materials
def mat(nm, col, metal=0.0, rough=0.5, emit=0.0, alpha=1.0, coat=0.0):
    m = bpy.data.materials.get(nm) or bpy.data.materials.new(nm); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if coat: b.inputs["Coat Weight"].default_value = coat
    if emit:
        b.inputs["Emission Color"].default_value = (*col, 1); b.inputs["Emission Strength"].default_value = emit
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
    return m
M = {
 "paint": mat("paint", C["paint"], 0.55, 0.22, coat=1.0),
 "glass": mat("glass", (0.015, 0.02, 0.025), 0.0, 0.04),
 "trim":  mat("trim", (0.015, 0.015, 0.017), 0.2, 0.45),
 "light": mat("light", (1.0, 0.97, 0.9), 0.0, 0.1, emit=6.0),
 "tail":  mat("tail", (0.9, 0.03, 0.02), 0.0, 0.2, emit=4.0),
 "tyre":  mat("tyre", (0.02, 0.02, 0.022), 0.0, 0.85),
 "rim":   mat("rim", tuple(C.get("rim", (0.22, 0.22, 0.23))), 1.0, 0.3),
 "well":  mat("well", (0.01, 0.01, 0.01), 0.0, 0.9),
 "caliper": mat("caliper", tuple(C.get("caliper", (0.9, 0.65, 0.05))), 0.3, 0.4),
}
for k in ("paint", "glass", "trim", "light", "tail"):
    src.data.materials.append(M[k])
IDX = {k: i for i, k in enumerate(("paint", "glass", "trim", "light", "tail"))}

# 3) cut wheels out
xin = C.get("x_inner", 0.29)
if "axles" in C:
    AX = [(a[0], a[1], a[2], a[3]) for a in C["axles"]]
else:
    AX = [("F" if k == "front" else "R", *v) for k, v in C["wheels"].items()]
wheels = {}
bm = bmesh.new(); bm.from_mesh(src.data)
for ak, yc, zc, r in AX:
    for side in (-1, 1):
        key = ak + ("L" if side < 0 else "R")
        sel = [f for f in bm.faces if all(side * v.co.x > xin and (v.co.y - yc) ** 2 + (v.co.z - zc) ** 2 < (r * 1.03) ** 2 for v in f.verts)]
        nb = bmesh.new()
        vmap = {}
        for f in sel:
            vs = []
            for v in f.verts:
                if v.index not in vmap:
                    vmap[v.index] = nb.verts.new(v.co)
                vs.append(vmap[v.index])
            try:
                nb.faces.new(vs)
            except ValueError:
                pass
        bmesh.ops.delete(bm, geom=sel, context='FACES_ONLY')
        bm.verts.ensure_lookup_table()
        wheels[key] = (nb, Vector((side * (xin + 0.06), yc, zc)), r, side)
loose = [v for v in bm.verts if not v.link_faces]
bmesh.ops.delete(bm, geom=loose, context='VERTS')

# 4) paint body by region
g = C.get("glass", {})
vz = [v.co for v in bm.verts]
ZMIN = min(v.z for v in vz); ZMAX = max(v.z for v in vz); H = ZMAX - ZMIN
YMIN = min(v.y for v in vz); YMAX = max(v.y for v in vz); XMAX = max(abs(v.x) for v in vz)
GEN = "generic" in C
if GEN:
    G = C["generic"]
    belt_z = ZMIN + G.get("belt", 0.6) * H
    cab = G.get("cabin")  # [y0, y1] or None -> auto from roof height
    if cab is None:
        ys = [v.y for v in vz if v.z > ZMIN + 0.85 * H]
        cab = [min(ys) - 0.12, max(ys) + 0.08] if ys else [0, 0]
for f in bm.faces:
    c = f.calc_center_median(); n = f.normal
    x, y, z = c.x, c.y, c.z
    k = "paint"
    if GEN:
        if cab[0] < y < cab[1] and z > belt_z and abs(x) < 0.97 * XMAX and n.z < G.get("roof_nz", 0.9) and G.get("glass", True):
            k = "glass"
        if z < ZMIN + G.get("trim", 0.12) * H:
            k = "trim"
        if (y < YMIN + 0.05 or y > YMAX - 0.04) and z < ZMIN + G.get("bumper", 0.38) * H:
            k = "trim"
        zb = (ZMIN + G.get("light_lo", 0.42) * H, ZMIN + G.get("light_hi", 0.62) * H)
        if y < YMIN + 0.07 and zb[0] < z < zb[1] and abs(x) > 0.45 * XMAX and n.y < -0.55:
            k = "light"
        if y > YMAX - 0.06 and zb[0] < z < zb[1] + 0.05 * H and abs(x) > 0.45 * XMAX and n.y > 0.55:
            k = "tail"
        f.material_index = IDX[k]
        continue
    belt = g.get("belt0", 0.03) + (y - g.get("y0", -0.47)) * g.get("slope", 0.09)
    if g.get("y0", -0.47) < y < g.get("y1", 0.2) and z > belt and abs(x) < g.get("xmax", 0.43) \
            and not (n.z > g.get("roof_nz", 0.93) and y > g.get("roof_y", -0.25)):
        k = "glass"
    if z < C.get("trim_z", -0.2):
        k = "trim"
    if y < C.get("front_y", -0.88) and z < C.get("front_trim_z", -0.06):
        k = "trim"
    if y > C.get("rear_y", 0.86) and z < C.get("rear_trim_z", 0.04):
        k = "trim"
    hl = C.get("headlight")  # [ymax, zmin, zmax, xmin]
    if hl and y < hl[0] and hl[1] < z < hl[2] and abs(x) > hl[3] and n.y < (hl[4] if len(hl) > 4 else -0.5):
        k = "light"
    tl = C.get("taillight")  # [ymin, zmin, zmax]
    if tl and y > tl[0] and tl[1] < z < tl[2] and n.y > 0.3:
        k = "tail"
    f.material_index = IDX[k]
bm.to_mesh(src.data); bm.free()

# split body by material into separate objects
bpy.ops.object.select_all(action='DESELECT'); src.select_set(True); bpy.context.view_layer.objects.active = src
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='MATERIAL'); bpy.ops.object.mode_set(mode='OBJECT')
budget = C.get("budget", {"paint": 14000, "glass": 2500, "trim": 3500, "light": 600, "tail": 600})
parts = []
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    if o.name.startswith(("Wheel_", "Well_", "Caliper_")): continue
    k = o.data.materials[o.data.polygons[0].material_index].name if o.data.polygons else None
    if not k:
        bpy.data.objects.remove(o); continue
    o.data.materials.clear(); o.data.materials.append(M[k])
    o.name = {"paint": "Body_Paint", "glass": "Glass", "trim": "Body_Trim", "light": "LightsFront", "tail": "LightsRear"}[k]
    decimate(o, budget[k]); parts.append(o)

# 5) wheel objects: tyre / rim split by distance from axle, plus a dark well disc and caliper
def new_obj(nm, bmx, m):
    me = bpy.data.meshes.new(nm); bmx.to_mesh(me); o = bpy.data.objects.new(nm, me)
    bpy.context.scene.collection.objects.link(o); me.materials.append(m); return o
for key, (nb, ctr, r, side) in wheels.items():
    yc, zc = ctr.y, ctr.z
    if not nb.faces:
        print("   (no wheel faces for", key, ")"); continue
    tb = nb.copy(); rb = nb
    for b_, keep_tyre in ((tb, True), (rb, False)):
        dels = [f for f in b_.faces if ((((f.calc_center_median().y - yc) ** 2 + (f.calc_center_median().z - zc) ** 2) ** .5 > 0.74 * r) != keep_tyre)]
        bmesh.ops.delete(b_, geom=dels, context='FACES')
    t = new_obj(f"Wheel_{key}_tyre", tb, M["tyre"]); rm = new_obj(f"Wheel_{key}_rim", rb, M["rim"])
    for o in (t, rm):
        decimate(o, 1500); parts.append(o)
    # wheel well (dark disc inside the arch, stays on the body)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r * 1.12, depth=0.01,
                                        location=(side * (xin - 0.005), yc, zc), rotation=(0, math.pi / 2, 0))
    wl = bpy.context.active_object; wl.name = f"Well_{key}"; wl.data.materials.append(M["well"]); parts.append(wl)
    # caliper
    bpy.ops.mesh.primitive_cube_add(size=1, location=(side * (xin + 0.03), yc + (0.35 * r if key[0] == "F" else -0.35 * r), zc + 0.25 * r))
    cp = bpy.context.active_object; cp.scale = (0.03, 0.22 * r, 0.42 * r); cp.name = f"Caliper_{key}"
    cp.data.materials.append(M["caliper"]); parts.append(cp)

# 6) scale to studs, ground at 0, origin at centre
objs = [o for o in bpy.data.objects if o.type == 'MESH']
pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
s = C.get("length_studs", 16) / (mx.y - mn.y)
for o in objs:
    o.location = (o.location - Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))) * s
    o.scale = o.scale * s
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
gz = min(p.z for p in pts)
for o in objs:  # sit on the ground
    o.location.z -= gz
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
for o in objs:  # wheel origins at their axle so they can spin in Roblox
    bpy.context.view_layer.objects.active = o
    if o.name.startswith("Wheel_"):
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
        bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
for o in objs:
    for p in o.data.polygons:
        p.use_smooth = True
tris = sum(len(p.vertices) - 2 for o in objs for p in o.data.polygons)
print("PARTS", len(objs), "TRIS", tris, "SIZE", (mx - mn) * s)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, name + ".blend"))
bpy.ops.export_scene.fbx(filepath=os.path.join(out, name + ".fbx"), axis_forward="-Z", axis_up="Y",
                         apply_unit_scale=True, use_mesh_modifiers=True, mesh_smooth_type='FACE')

# 7) preview renders
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = int(os.environ.get("SPP", 48)); sc.cycles.device = 'CPU'
sc.render.resolution_x = 1200; sc.render.resolution_y = 720; sc.view_settings.view_transform = 'AgX'
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.9, 0.75, 0.6, 1); bg.inputs[1].default_value = 0.5
bpy.ops.mesh.primitive_plane_add(size=200); fl = bpy.context.active_object
fl.data.materials.append(mat("floor", (0.35, 0.33, 0.31), 0.0, 0.35))
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 4; sun.rotation_euler = (math.radians(60), 0, math.radians(-140)); sun.data.angle = 0.05
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 50
L = C.get("length_studs", 16)
for nm, v in {"front": (0.9, -1.1, 0.42), "side": (1.6, 0.0, 0.25), "rear": (-0.9, 1.1, 0.45)}.items():
    cam.location = Vector(v) * L * 1.05
    tgt = Vector((0, 0, L * 0.08)); cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(out, f"{name}_{nm}.png"); bpy.ops.render.render(write_still=True)
print("DONE")
