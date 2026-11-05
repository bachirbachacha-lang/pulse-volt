"""render_preview.py <out_dir>: render map_v2.json in Blender (bpy) for preview pictures. Roblox (x,y,z) -> Blender (x,-z,y)."""
import bpy, json, math, os, sys
from mathutils import Vector, Euler, Matrix
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[-1]
D = json.load(open(os.path.join(HERE, "map_v2.json")))
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
cache = {}
def mat(ci, mname, tr=0, emit=False):
    k = (ci, mname, tr, emit)
    if k in cache: return cache[k]
    r, g, b = D["pal"][ci]; m = bpy.data.materials.new(f"m{len(cache)}"); m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]; c = ((r / 255) ** 2.2, (g / 255) ** 2.2, (b / 255) ** 2.2, 1)
    p.inputs["Base Color"].default_value = c
    p.inputs["Roughness"].default_value = {"Glass": 0.05, "Metal": 0.35, "Marble": 0.2, "Neon": 0.5}.get(mname, 0.8)
    p.inputs["Metallic"].default_value = 0.8 if mname in ("Metal", "DiamondPlate", "Foil") else 0
    if mname == "Neon" or emit: p.inputs["Emission Color"].default_value = c; p.inputs["Emission Strength"].default_value = 3
    if tr: p.inputs["Alpha"].default_value = 1 - tr
    cache[k] = m; return m
mesh_cache = {}
def base_mesh(kind):
    if kind in mesh_cache: return mesh_cache[kind]
    if kind == "C": bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.5, depth=1, rotation=(0, math.radians(90), 0))
    elif kind == "S": bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.5)
    else: bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object; bpy.ops.object.transform_apply(rotation=True); me = o.data; bpy.data.objects.remove(o)
    me.materials.append(bpy.data.materials.new("slot")); mesh_cache[kind] = me; return me
R2B = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))  # roblox->blender basis
for d in D["prims"]:
    k = d["k"]; sx, sy, sz = d["s"]; x, y, z = d["p"]; rx, ry, rz = d["r"]
    if k == "W": me = base_mesh("B"); mname = "Glass"
    else: me = base_mesh("C" if k == "C" else "S" if k == "S" else "B"); mname = d.get("m") is not None and D["mats"][d["m"]]
    o = bpy.data.objects.new("p", me); sc.collection.objects.link(o)
    Rr = Matrix.Rotation(math.radians(ry), 3, "Y") @ Matrix.Rotation(math.radians(rx), 3, "X") @ Matrix.Rotation(math.radians(rz), 3, "Z")
    Rb = R2B @ Rr @ R2B.inverted()
    M = (Rb @ R2B @ Matrix.Diagonal((sx, sy, sz)) @ R2B.inverted()).to_4x4()
    M.translation = Vector((x, -z, y)); o.matrix_world = M
    mm = mat(d["c"], "Glass", 0.15) if k == "W" else mat(d["c"], D["mats"][d["m"]], d.get("t", 0), k == "L")
    o.material_slots[0].link = "OBJECT"; o.material_slots[0].material = mm
    if k == "T":
        x2 = d["x"]; t = bpy.data.curves.new("t", "FONT"); t.body = x2["text"]; t.size = min(sy * 0.28, sx * 0.13); t.align_x = "CENTER"; t.align_y = "CENTER"
        fr, fg, fb = x2["fg"]; tm = bpy.data.materials.new("tx"); tm.use_nodes = True; pp = tm.node_tree.nodes["Principled BSDF"]
        pp.inputs["Base Color"].default_value = ((fr/255)**2.2, (fg/255)**2.2, (fb/255)**2.2, 1); pp.inputs["Emission Color"].default_value = pp.inputs["Base Color"].default_value; pp.inputs["Emission Strength"].default_value = 1.5
        t.materials.append(tm)
        for side in (1, -1):
            to = bpy.data.objects.new("txt", t); sc.collection.objects.link(to)
            # front face of a roblox part = -Z local; text faces viewer on that side
            Rt = Rb @ R2B @ Matrix.Rotation(math.radians(180 if side > 0 else 0), 3, "Y") @ R2B.inverted() @ Matrix.Rotation(math.radians(90), 3, "X")
            Mt = Rt.to_4x4(); off = Rb @ Vector((0, side * (sz / 2 + 0.05), 0)); Mt.translation = Vector((x, -z, y)) + off; to.matrix_world = Mt
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.55, 0.72, 0.95, 1); bg.inputs[1].default_value = 0.9
bpy.ops.object.light_add(type="SUN", rotation=(math.radians(48), math.radians(12), math.radians(30))); bpy.context.active_object.data.energy = 4.2
sc.render.engine = "CYCLES"; sc.cycles.samples = int(os.environ.get("SPP", "20")); sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1280, 720; sc.view_settings.view_transform = "AgX"
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.clip_end = 5000
V = {"01_city_overview": ((520, -620, 420), (0, -20, 0), 28), "02_hq_campus": ((150, -250, 70), (0, -420, 30), 30),
     "03_boulevard_plots": ((-60, 150, 26), (-60, -150, 6), 26), "04_lakeside": ((250, -260, 45), (420, 30, 4), 28),
     "05_construction_yard": ((-150, 330, 80), (60, 400, 30), 30), "06_top_down": ((0, 0, 1350), (0, 0.01, 0), 40)}
os.makedirs(OUT, exist_ok=True)
if os.environ.get("VIEWS"): V = {k: v for k, v in V.items() if k in os.environ["VIEWS"].split(",")}
for n, (loc, tgt, lens) in V.items():
    cam.location = loc; cam.data.lens = lens; cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(OUT, n + ".png"); bpy.ops.render.render(write_still=True); print("rendered", n, flush=True)
