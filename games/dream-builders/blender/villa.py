"""villa.py: modern luxury villa for Dream Builders (Blender 5.x, bpy). Units: 1 Blender unit = 1 Roblox stud.
Run: python3 villa.py -- out=<dir> [render=1]   -> <dir>/LuxuryVilla.fbx (+ villa_preview.png)
Low-ish poly (Roblox MeshPart limit 20k tris per mesh), one mesh per material so Studio's 3D importer keeps colours."""
import bpy, bmesh, math, sys, os
from mathutils import Vector
A = dict(a.split("=", 1) for a in (sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []))
OUT = A.get("out", "."); os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
MATS = {}
def mat(name, rgb, rough=0.6, metal=0.0, alpha=1.0, emit=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; p = m.node_tree.nodes["Principled BSDF"]
    c = tuple((v / 255) ** 2.2 for v in rgb) + (1,)
    p.inputs["Base Color"].default_value = c; p.inputs["Roughness"].default_value = rough; p.inputs["Metallic"].default_value = metal
    if alpha < 1: p.inputs["Alpha"].default_value = alpha; m.surface_render_method = "BLENDED"
    if emit: p.inputs["Emission Color"].default_value = c; p.inputs["Emission Strength"].default_value = emit
    MATS[name] = m; return m
M = {"plaster": mat("Plaster", (246, 244, 238), 0.85), "cream": mat("Cream", (236, 226, 204), 0.8), "slab": mat("RoofSlab", (64, 62, 60), 0.7),
     "wood": mat("Wood", (150, 100, 60), 0.55), "glass": mat("Glass", (110, 165, 185), 0.05, 0.2, 0.45), "frame": mat("Frame", (34, 34, 38), 0.4, 0.6),
     "stone": mat("Stone", (222, 214, 196), 0.75), "pool": mat("PoolWater", (40, 180, 200), 0.05, 0, 0.75), "gold": mat("Gold", (226, 176, 70), 0.3, 1.0),
     "light": mat("WarmLight", (255, 226, 170), 0.5, 0, 1, 4.0), "grass": mat("Lawn", (96, 150, 66), 0.9), "leaf": mat("Leaf", (60, 136, 54), 0.7)}
parts = {k: [] for k in M}
def box(key, size, loc, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.active_object; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        b = o.modifiers.new("b", "BEVEL"); b.width = bevel; b.segments = 2; b.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier="b")
    parts[key].append(o); return o
def cyl(key, r, h, loc, verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc); o = bpy.context.active_object; parts[key].append(o); return o
# Blender Z up; villa front faces -Y. Footprint ~46 x 30 studs like the in-game villa.
W, D = 46, 30
box("stone", (W + 14, D + 30, 1.2), (0, 4, 0.6))                          # stone plinth / terrace
box("grass", (W + 14, 12, 0.2), (0, D / 2 + 13, 1.3))
# ground floor
box("plaster", (W, D, 12), (0, 0, 7.2), 0.15)
box("glass", (W - 8, 0.3, 8.6), (2, -D / 2 - 0.05, 6.4))
for x in range(-17, 24, 6): box("frame", (0.35, 0.5, 8.8), (x, -D / 2 - 0.15, 6.4))
box("frame", (W - 7.6, 0.5, 0.4), (2, -D / 2 - 0.15, 10.8))
box("wood", (6, 0.6, 10), (-W / 2 + 4.5, -D / 2 - 0.2, 6.2))               # front door
box("gold", (0.3, 0.3, 2.2), (-W / 2 + 6.8, -D / 2 - 0.6, 6.4))
# cantilevered upper floor
box("cream", (W * 0.74, D * 0.92, 11), (W * 0.12, -2, 19.1), 0.15)
box("glass", (W * 0.62, 0.3, 7.4), (W * 0.12, -2 - D * 0.46 - 0.05, 18.8))
for i in range(10): box("wood", (0.55, 0.55, 11), (-W * 0.25 + i * 1.5, -2 - D * 0.46 - 0.6, 19.1))
box("glass", (W * 0.7, 0.25, 2.8), (W * 0.12, -D / 2 - 3.4, 14.9))         # balcony glass rail
box("slab", (W + 6, D + 8, 1.2), (0, -2, 13.7), 0.1)                       # ground-floor roof / balcony slab
box("slab", (W * 0.82, D * 1.02, 1.2), (W * 0.12, -3, 25.2), 0.1)          # top roof slab with overhang
# garage wing
box("plaster", (13, D * 0.72, 10), (-W / 2 - 6.5, -2, 6.2), 0.12)
box("frame", (10.5, 0.4, 7.6), (-W / 2 - 6.5, -2 - D * 0.36 - 0.1, 5))
for z in (2.4, 4.2, 6.0, 7.8): box("slab", (10.5, 0.5, 0.15), (-W / 2 - 6.5, -2 - D * 0.36 - 0.35, z))
box("slab", (15, D * 0.78, 1), (-W / 2 - 6.5, -2, 11.6))
# pool + deck at the back
box("stone", (W * 0.72, 13, 0.9), (2, D / 2 + 9, 1.65))
box("pool", (W * 0.64, 10, 0.4), (2, D / 2 + 9, 2.15))
for x in (-12, -4, 12):
    box("plaster", (2.4, 6.2, 0.5), (x, D / 2 + 17.5, 1.75)); box("plaster", (2.4, 1.6, 1.6), (x, D / 2 + 15.2, 2.5))
# lights: wall uplights + step lights
for x in (-W / 2 + 1, W / 2 - 1): box("light", (0.8, 0.4, 1.6), (x, -D / 2 - 0.3, 10.2))
for x in range(-20, 21, 8): box("light", (1.2, 0.6, 0.3), (x, -D / 2 - 8, 1.25))
# palms (simple but readable)
def palm(x, y, h):
    for i in range(6):
        cyl("wood", 1.1 - i * 0.08, h / 6 + 0.2, (x + i * 0.25, y, 1.2 + (i + 0.5) * h / 6), 10)
    for j in range(8):
        a = j * math.pi / 4
        o = box("leaf", (1.6, 7.5, 0.25), (x + 1.5 + math.cos(a) * 3.6, y + math.sin(a) * 3.6, 1.2 + h - 0.6))
        o.rotation_euler = (math.radians(-22) * 0 + math.radians(18), 0, a - math.pi / 2)
for (x, y) in ((-W / 2 - 3, -D / 2 - 10), (W / 2 + 3, -D / 2 - 10), (W / 2 + 4, D / 2 + 14)): palm(x, y, 24)
# join per material -> one mesh each, origin at ground centre
objs = []
for k, lst in parts.items():
    if not lst: continue
    bpy.ops.object.select_all(action="DESELECT")
    for o in lst: o.select_set(True)
    bpy.context.view_layer.objects.active = lst[0]; bpy.ops.object.join(); o = bpy.context.active_object
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    o.name = "Villa_" + k; o.data.materials.clear(); o.data.materials.append(M[k]); objs.append(o)
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
print("VILLA meshes", len(objs), "tris", tris)
bpy.ops.object.select_all(action="DESELECT")
for o in objs: o.select_set(True)
bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, "LuxuryVilla.fbx"), use_selection=True, apply_unit_scale=True, global_scale=1.0,
                         axis_forward="-Z", axis_up="Y", object_types={"MESH"}, mesh_smooth_type="FACE", path_mode="COPY")
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "LuxuryVilla.blend"))
if A.get("render") == "1":
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.95, 0.66, 0.42, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0)); g = bpy.context.active_object; g.data.materials.append(mat("Sand", (214, 188, 146), 0.9))
    bpy.ops.object.light_add(type="SUN", rotation=(math.radians(66), 0, math.radians(-40))); s = bpy.context.active_object; s.data.energy = 5; s.data.color = (1, 0.8, 0.6)
    cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 32
    cam.location = (58, -88, 34); cam.rotation_euler = (Vector((0, 0, 9)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.engine = "CYCLES"; sc.cycles.samples = int(A.get("spp", "24")); sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 1280, 800; sc.view_settings.view_transform = "AgX"
    sc.render.filepath = os.path.join(OUT, "villa_preview.png"); bpy.ops.render.render(write_still=True)
print("DONE")
