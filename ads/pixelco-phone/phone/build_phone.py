"""
Pixel & Co. studio phone — procedural, realistic smartphone for motion edits.
Run inside Blender (Scripting tab > Open > Run Script), or headless:
    blender --background --python build_phone.py
Works on Blender 4.0 and newer.

Everything is parented to the empty "PHONE_CONTROL": move / rotate / animate that one object.
Your design goes on the screen: select "Screen", open the Shading tab, and in the node
"YOUR DESIGN HERE" click the folder icon to load any image (or a video / image sequence).
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

# ------------------------------------------------------------------ settings
W, H, T = 7.15, 14.7, 0.825          # phone size in cm (1 Blender unit = 1 cm)
R = 1.1                              # corner radius of the body
FRAME_COLOR = (0.46, 0.42, 0.38)     # natural titanium; try (0.09,0.09,0.10) for black
BACK_COLOR = (0.19, 0.178, 0.168)     # frosted back glass tint
SCREEN_IMAGE = None                  # set by argv or left as generated wallpaper
RENDER = "--render" in sys.argv
OUT_DIR = None
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
for a in argv:
    if a.startswith("image="): SCREEN_IMAGE = a[6:]
    if a.startswith("out="): OUT_DIR = a[4:]

# ------------------------------------------------------------------ reset scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.images):
    for d in list(coll):
        if d.users == 0:
            coll.remove(d)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 0.01
scene.unit_settings.length_unit = "CENTIMETERS"

phone_coll = bpy.data.collections.get("Phone") or bpy.data.collections.new("Phone")
if phone_coll.name not in scene.collection.children:
    scene.collection.children.link(phone_coll)

ctrl = bpy.data.objects.new("PHONE_CONTROL", None)
ctrl.empty_display_type = "ARROWS"
ctrl.empty_display_size = 5
phone_coll.objects.link(ctrl)

# ------------------------------------------------------------------ materials
def setin(node, name, val):
    if name in node.inputs:
        node.inputs[name].default_value = val

def principled(name, color=(0.8, 0.8, 0.8), metal=0.0, rough=0.5, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    setin(p, "Base Color", (*color, 1))
    setin(p, "Metallic", metal)
    setin(p, "Roughness", rough)
    for k, v in kw.items():
        setin(p, k.replace("_", " "), v)
    return m

M_FRAME = principled("Titanium Frame", FRAME_COLOR, 1.0, 0.27, Anisotropic=0.45)
M_BUTTON = principled("Titanium Buttons", FRAME_COLOR, 1.0, 0.22, Anisotropic=0.3)
M_POLISH = principled("Polished Lens Rings", tuple(c * 1.15 for c in FRAME_COLOR), 1.0, 0.1)
M_BACK = principled("Frosted Back Glass", BACK_COLOR, 0.0, 0.42, Coat_Weight=0.35, Coat_Roughness=0.38)
M_BUMP = principled("Camera Plateau Glass", BACK_COLOR, 0.0, 0.07, Coat_Weight=1.0, Coat_Roughness=0.02)
M_GLASS_BLACK = principled("Front Glass", (0.004, 0.004, 0.005), 0.0, 0.03, Coat_Weight=1.0, Coat_Roughness=0.0)
M_ISLAND = principled("Camera Island", (0.002, 0.002, 0.002), 0.0, 0.08, Coat_Weight=1.0)
M_BARREL = principled("Lens Barrel", (0.012, 0.012, 0.014), 1.0, 0.35)
M_LENS = principled("Lens Glass", (0.55, 0.6, 0.7), 0.0, 0.0, Transmission_Weight=1.0, Coat_Weight=1.0, Coat_Roughness=0.0,
                    Thin_Film_Thickness=420.0, Thin_Film_IOR=1.38)
M_LENS_IN = principled("Lens Elements", (0.02, 0.03, 0.05), 0.6, 0.15, Thin_Film_Thickness=600.0)
M_FLASH = principled("Flash", (0.95, 0.9, 0.75), 0.0, 0.35, Coat_Weight=1.0)
M_HOLE = principled("Ports & Grilles", (0.01, 0.01, 0.01), 0.0, 0.7)
M_ANT = principled("Antenna Bands", tuple(c * 0.55 for c in FRAME_COLOR), 0.0, 0.45)

# screen: emission from an image + glossy glass on top
M_SCREEN = bpy.data.materials.new("Screen")
M_SCREEN.use_nodes = True
nt = M_SCREEN.node_tree
p = nt.nodes.get("Principled BSDF")
setin(p, "Base Color", (0, 0, 0, 1)); setin(p, "Roughness", 0.04)
setin(p, "Coat Weight", 1.0); setin(p, "Coat Roughness", 0.0)
setin(p, "Emission Strength", 1.35)
tex = nt.nodes.new("ShaderNodeTexImage")
tex.name = tex.label = "YOUR DESIGN HERE"
tex.location = (-420, 120)
nt.links.new(tex.outputs["Color"], p.inputs["Emission Color"])
img = None
if SCREEN_IMAGE and os.path.exists(SCREEN_IMAGE):
    img = bpy.data.images.load(SCREEN_IMAGE)
    img.name = "Screen Design"
if img is None:
    img = bpy.data.images.new("Screen Design", 1179, 2556)
    img.generated_type = "COLOR_GRID"
tex.image = img
tex.extension = "CLIP"

# ------------------------------------------------------------------ geometry helpers
def rrect(w, h, r, seg=18, cx=0.0, cy=0.0):
    pts = []
    corners = [(w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)]
    for x, y, a0 in corners:
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + x + r * math.cos(a), cy + y + r * math.sin(a)))
    return pts

def finish(name, bm, mat, bevel=0.0, bseg=6, smooth=True, angle=35):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for poly in me.polygons:
        poly.use_smooth = smooth
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(mat)
    phone_coll.objects.link(ob)
    ob.parent = ctrl
    if bevel > 0:
        b = ob.modifiers.new("Rounded edges", "BEVEL")
        b.width = bevel; b.segments = bseg; b.limit_method = "ANGLE"
        b.angle_limit = math.radians(angle); b.profile = 0.6
        b.harden_normals = True
        b.miter_outer = "MITER_ARC"
    return ob

def slab(name, pts, z0, z1, mat, bevel=0.0, bseg=6):
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z0)) for x, y in pts]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]:
        v.co.z = z1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(name, bm, mat, bevel, bseg)

def flat(name, pts, z, mat, uv=True):
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z)) for x, y in pts]
    f = bm.faces.new(vs)
    if uv:
        lay = bm.loops.layers.uv.new("UVMap")
        xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        for loop in f.loops:
            loop[lay].uv = ((loop.vert.co.x - x0) / (x1 - x0), (loop.vert.co.y - y0) / (y1 - y0))
    return finish(name, bm, mat, smooth=False)

def cyl(name, r, z0, z1, x, y, mat, seg=72, bevel=0.0, r2=None, bseg=4):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r2 if r2 is not None else r, depth=abs(z1 - z0))
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, y, (z0 + z1) / 2))
    return finish(name, bm, mat, bevel, bseg, angle=40)

def dome(name, r, zbase, height, x, y, mat):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=r)
    for v in bm.verts:
        v.co.z = v.co.z / r * height
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, y, zbase))
    return finish(name, bm, mat)

def box(name, size, loc, mat, bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + Vector(loc)
    return finish(name, bm, mat, bevel, 4, angle=40)

def capsule_pts(w, h, cx=0, cy=0, seg=16):
    return rrect(w, h, min(w, h) / 2 - 1e-4, seg, cx, cy)

# ------------------------------------------------------------------ body
GT = 0.07                      # glass thickness
INSET = 0.055                  # glass inset from frame edge
zf0, zf1 = -T / 2 + 0.035, T / 2 - 0.035
slab("Frame", rrect(W, H, R, 24), zf0, zf1, M_FRAME, bevel=0.11, bseg=8)
slab("Front Glass", rrect(W - 2 * INSET, H - 2 * INSET, R - INSET, 24), T / 2 - GT, T / 2, M_GLASS_BLACK, bevel=0.035, bseg=5)
slab("Back Glass", rrect(W - 2 * INSET, H - 2 * INSET, R - INSET, 24), -T / 2, -T / 2 + GT, M_BACK, bevel=0.03, bseg=4)

# screen
BZ = 0.17
sw, sh = W - 2 * (INSET + BZ), H - 2 * (INSET + BZ)
screen = flat("Screen", rrect(sw, sh, R - INSET - BZ + 0.02, 24), T / 2 + 0.0015, M_SCREEN)
slab("Camera Island", capsule_pts(1.25, 0.37, 0, sh / 2 - 0.55), T / 2 + 0.001, T / 2 + 0.004, M_ISLAND, bevel=0.0012, bseg=2)
cyl("Front Camera", 0.09, T / 2 + 0.004, T / 2 + 0.0045, 0.34, sh / 2 - 0.55, M_LENS, 32)

# antenna bands on the frame
for sx in (-1, 1):
    for sy in (-1, 1):
        box("Antenna Band", (0.006, 0.085, 0.42), (sx * (W / 2 - 0.002), sy * (H / 2 - 2.3), 0), M_ANT)
for sx in (-1, 1):
    box("Antenna Band", (0.085, 0.006, 0.42), (sx * (W / 2 - 1.9), -(H / 2 - 0.002), 0), M_ANT)

# side buttons (rounded pills sticking out of the frame)
def side_button(name, side, yc, length, prot=0.07, thick=0.32):
    x = side * (W / 2 + prot / 2 - 0.01)
    bm_pts = capsule_pts(thick, length)
    bm = bmesh.new()
    vs = [bm.verts.new((0, py, pz)) for pz, py in [(q[0], q[1]) for q in bm_pts]]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]:
        v.co.x = prot
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x - prot / 2, yc, 0))
    return finish(name, bm, M_BUTTON, bevel=0.025, bseg=4)

side_button("Power Button", 1, 2.25, 1.7)
side_button("Action Button", -1, 4.35, 0.55)
side_button("Volume Up", -1, 2.85, 1.05)
side_button("Volume Down", -1, 1.45, 1.05)

# bottom: USB-C port + speaker / mic grilles
port = slab("USB-C Port", capsule_pts(0.86, 0.26), -0.13, 0.13, M_HOLE, bevel=0.01, bseg=2)
port.rotation_euler = (math.radians(90), 0, 0)
port.location = (0, -H / 2 + 0.12, 0)
for side in (-1, 1):
    for i in range(6 if side > 0 else 4):
        h = cyl("Grille Hole", 0.042, -0.06, 0.06, 0, 0, M_HOLE, 16)
        h.rotation_euler = (math.radians(90), 0, 0)
        h.location = (side * (1.0 + i * 0.19), -H / 2 + 0.05, 0)

# ------------------------------------------------------------------ rear camera system
zb = -T / 2                     # back surface
BW, BH, BR = 3.7, 3.85, 0.95
bx, by = W / 2 - 0.42 - BW / 2, H / 2 - 0.42 - BH / 2
PLAT = 0.13
slab("Camera Plateau", rrect(BW, BH, BR, 20, bx, by), zb - PLAT, zb + 0.01, M_BUMP, bevel=0.05, bseg=6)
zp = zb - PLAT                  # plateau surface

def lens(tag, x, y, r=0.74):
    cyl(f"{tag} Ring", r, zp - 0.16, zp + 0.01, x, y, M_POLISH, 96, bevel=0.03)
    cyl(f"{tag} Barrel", r * 0.86, zp - 0.17, zp - 0.15, x, y, M_BARREL, 96)
    cyl(f"{tag} Element Ring", r * 0.62, zp - 0.175, zp - 0.165, x, y, M_LENS_IN, 96)
    cyl(f"{tag} Element Core", r * 0.30, zp - 0.18, zp - 0.17, x, y, M_BARREL, 64)
    dome(f"{tag} Glass", r * 0.8, zp - 0.165, 0.07, x, y, M_LENS)

lens("Main Lens", bx + 0.88, by + 0.9)
lens("Ultra Wide Lens", bx + 0.88, by - 0.9)
lens("Telephoto Lens", bx - 0.88, by)
cyl("Flash", 0.24, zp - 0.012, zp + 0.01, bx - 0.95, by + 1.2, M_FLASH, 48, bevel=0.008)
cyl("LiDAR", 0.22, zp - 0.012, zp + 0.01, bx - 0.95, by - 1.2, M_ISLAND, 48, bevel=0.008)
cyl("Mic", 0.045, zp - 0.003, zp + 0.01, bx + 0.0, by + 1.55, M_HOLE, 16)

# subtle engraved mark in the middle of the back

# ------------------------------------------------------------------ stand the phone up, facing the camera
ctrl.rotation_euler = (math.radians(90), 0, math.radians(-24))

# ------------------------------------------------------------------ studio: lights, world, camera
studio = bpy.data.collections.get("Studio") or bpy.data.collections.new("Studio")
if studio.name not in scene.collection.children:
    scene.collection.children.link(studio)

def area(name, loc, size, power, color=(1, 1, 1), size_y=None):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = power; ld.color = color
    if size_y:
        ld.shape = "RECTANGLE"; ld.size = size; ld.size_y = size_y
    else:
        ld.size = size
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    studio.objects.link(ob)
    d = Vector((0, 0, 0)) - Vector(loc)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return ob

area("Key Softbox", (-34, -38, 26), 30, 25000)
area("Orange Rim", (34, 22, 6), 12, 32000, (1.0, 0.42, 0.14))
area("Top Strip", (6, -10, 42), 44, 16000, size_y=5)
area("Cool Fill", (30, -36, -8), 24, 7000, (0.65, 0.75, 1.0))
area("Glass Sheen", (-26, -30, 20), 10, 1300, size_y=40)
area("Edge Kicker", (-30, 14, 4), 8, 14000)

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = (0.006, 0.006, 0.008, 1)
bg.inputs["Strength"].default_value = 1.0

camd = bpy.data.cameras.new("Camera")
camd.lens = 85
camd.dof.use_dof = True
camd.dof.aperture_fstop = 5.6
cam = bpy.data.objects.new("Camera", camd)
studio.objects.link(cam)
cam.location = (-8.2, -45, 4.8)
cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
camd.dof.focus_object = ctrl
scene.camera = cam

# ------------------------------------------------------------------ render settings
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 128
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 1080, 1350
scene.render.film_transparent = False
try:
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
except Exception:
    pass

# pack the screen image so the .blend is self-contained
try:
    if img.filepath:
        img.pack()
except Exception:
    pass

if OUT_DIR:
    os.makedirs(OUT_DIR, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT_DIR, "PixelCo_Phone.blend"), compress=True)

if RENDER and OUT_DIR:
    pct = int(os.environ.get("PCT", "100")); scene.render.resolution_percentage = pct
    scene.cycles.samples = int(os.environ.get("SAMPLES", "128"))
    shots = os.environ.get("SHOTS", "front,back").split(",")
    for s in shots:
        if s == "front": ctrl.rotation_euler = (math.radians(90), 0, math.radians(-24))
        if s == "back": ctrl.rotation_euler = (math.radians(90), 0, math.radians(180 + 28))
        if s == "side": ctrl.rotation_euler = (math.radians(90), math.radians(0), math.radians(-72))
        scene.render.filepath = os.path.join(OUT_DIR, f"phone_{s}.png")
        bpy.ops.render.render(write_still=True)
    ctrl.rotation_euler = (math.radians(90), 0, math.radians(-24))
