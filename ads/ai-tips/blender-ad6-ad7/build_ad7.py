"""Pixel & Co. ad 7: "The Ring". Dark room, glowing ring, website screens swirl through it.
Ski-slopes beat grid: first beat 0.30 s, period 0.9513 s, drop 4.11 s (frame 124). 15 s, 30 fps, 1080x1920."""
import bpy, bmesh, math, os, random
from mathutils import Vector
D = r"C:\Users\PC\Downloads\PixelCo_Ad5\ad6"
random.seed(4)
sc = bpy.data.scenes.get("Ad7") or bpy.data.scenes.new("Ad7")
for o in list(sc.collection.objects): bpy.data.objects.remove(o, do_unlink=True)
FPS, N = 30, 450
sc.render.fps = FPS; sc.frame_start, sc.frame_end = 1, N
R = math.radians
def link(o): sc.collection.objects.link(o); return o
def ease(fc_owner):
    ad = fc_owner.animation_data
    if not ad or not ad.action: return
    act = ad.action
    curves = list(getattr(act, "fcurves", []) or [])
    if not curves:
        for layer in getattr(act, "layers", []):
            for strip in layer.strips:
                for bag in strip.channelbags: curves += list(bag.fcurves)
    for fc in curves:
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"; kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"
        if fc.data_path == "hide_render":
            for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
def K(o, f, loc=None, rot=None, scl=None):
    if loc is not None: o.location = loc; o.keyframe_insert("location", frame=f)
    if rot is not None: o.rotation_euler = [R(v) for v in rot]; o.keyframe_insert("rotation_euler", frame=f)
    if scl is not None: o.scale = (scl,) * 3 if isinstance(scl, (int, float)) else scl; o.keyframe_insert("scale", frame=f)
def vis(o, a, b):
    o.hide_render = True; o.keyframe_insert("hide_render", frame=1)
    o.hide_render = False; o.keyframe_insert("hide_render", frame=a)
    o.hide_render = True; o.keyframe_insert("hide_render", frame=b + 1)
def mat(name, col, rough=.4, emit=0, metal=0, coat=0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*col, 1); p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal; p.inputs["Coat Weight"].default_value = coat
    p.inputs["Emission Color"].default_value = (*col, 1); p.inputs["Emission Strength"].default_value = emit
    return m
def area(n, loc, e, size, col=(1, 1, 1), aim=(0, 0, 0)):
    ld = bpy.data.lights.new(n, "AREA"); ld.energy = e; ld.size = size; ld.color = col
    o = link(bpy.data.objects.new(n, ld)); o.location = loc
    o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); return o
# ---------------- cards
def card(i, name):
    img = bpy.data.images.load(os.path.join(D, "tex", f"c{i:02d}.png"), check_existing=True)
    w_, h_ = 1.8, 1.8 * 1688 / 780
    me = bpy.data.meshes.new(name); me.from_pydata([(-w_/2, 0, -h_/2), (w_/2, 0, -h_/2), (w_/2, 0, h_/2), (-w_/2, 0, h_/2)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name="UVMap")
    for k, co in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv.data[k].uv = co
    m = bpy.data.materials.get(f"Ad7 card {i}")
    if m is None:
        m = bpy.data.materials.new(f"Ad7 card {i}"); m.use_nodes = True
        nt = m.node_tree; p = nt.nodes["Principled BSDF"]; t = nt.nodes.new("ShaderNodeTexImage"); t.image = img; t.interpolation = "Cubic"
        nt.links.new(t.outputs["Color"], p.inputs["Base Color"]); nt.links.new(t.outputs["Alpha"], p.inputs["Alpha"])
        nt.links.new(t.outputs["Color"], p.inputs["Emission Color"]); p.inputs["Emission Strength"].default_value = 0.85
        p.inputs["Roughness"].default_value = 0.18; p.inputs["Coat Weight"].default_value = 0.6
    me.materials.append(m)
    o = link(bpy.data.objects.new(name, me)); o.rotation_mode = "XYZ"; return o
DROP = 124

# ---------------- dark world
w = bpy.data.worlds.get("Ad7W") or bpy.data.worlds.new("Ad7W"); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (0.004, 0.003, 0.008, 1); bg.inputs["Strength"].default_value = 1
me = bpy.data.meshes.new("Floor7"); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=80); bm.to_mesh(me); bm.free()
floor = link(bpy.data.objects.new("Floor7", me)); floor.location = (0, 0, -5); me.materials.append(mat("Ad7 Floor", (0.01, 0.01, 0.015), 0.12, coat=1))
# ---------------- the ring (emissive torus, hue shifts from orange to violet)
me = bpy.data.meshes.new("Ring"); bm = bmesh.new()
import mathutils
bmesh.ops.create_circle(bm, cap_ends=False, segments=128, radius=4.2); bm.to_mesh(me); bm.free()
ring = link(bpy.data.objects.new("Ring", me)); ring.rotation_euler = (R(90), 0, 0)
sk = ring.modifiers.new("skin", "SKIN")
for v in me.skin_vertices[0].data: v.radius = (0.09, 0.09)
ring.modifiers.new("sub", "SUBSURF").levels = 2
rm = bpy.data.materials.get("Ad7 ring") or bpy.data.materials.new("Ad7 ring"); rm.use_nodes = True
p = rm.node_tree.nodes["Principled BSDF"]; p.inputs["Base Color"].default_value = (1, .35, .12, 1)
p.inputs["Emission Color"].default_value = (1, .38, .12, 1)
es = p.inputs["Emission Strength"]
for f, e in [(1, 0), (20, 0), (40, 40), (DROP - 2, 25), (DROP, 140), (DROP + 10, 45), (300, 45), (330, 0), (450, 0)]:
    es.default_value = e; es.keyframe_insert("default_value", frame=f)
ec = p.inputs["Emission Color"]
for f, c in [(1, (1, .38, .12, 1)), (DROP, (1, .38, .12, 1)), (220, (.55, .35, 1, 1)), (330, (.55, .35, 1, 1))]:
    ec.default_value = c; ec.keyframe_insert("default_value", frame=f)
me.materials.append(rm)
K(ring, 1, (0, 4, 0), (90, 0, 0), .6); K(ring, 60, (0, 3, 0), (90, 0, 0), 1); K(ring, DROP, (0, 2, 0), (90, 0, 20), 1.05); K(ring, 300, (0, 2, 0), (90, 0, 200), 1.1)
K(ring, 330, (0, 2, 0), (90, 0, 230), .01); vis(ring, 1, 332); ease(ring)
glow = area("Ring Glow", (0, 1, 0), 0, 7, (1, .45, .2), (0, -5, 0))
for f, e in [(1, 0), (40, 1500), (DROP, 6000), (DROP + 10, 2000), (300, 2000), (330, 0)]:
    glow.data.energy = e; glow.data.keyframe_insert("energy", frame=f)
area("Top", (0, -6, 14), 1200, 8, (.8, .8, 1))
# ---------------- cards: vortex through the ring
cards = []
for k in range(18):
    i = k % 10 + 1; o = card(i, f"V{k}")
    a0 = k / 18 * 2 * math.pi; rad = 2.4 + (k % 3) * 0.9
    st = DROP + (k % 6) * 2
    K(o, 1, (0, 14, 0), (0, 0, 0), .3); K(o, st, (0, 14, 0), (0, 0, 0), .3)
    for j, f in enumerate(range(st, 300, 12)):
        u = (f - st) / 160; a = a0 + u * 2.6 * math.pi; y = 14 - u * 22
        K(o, f, (rad * math.cos(a), y, rad * math.sin(a) * 1.15), (math.degrees(math.sin(a)) * .4, 0, math.degrees(a) % 360 - 180), .9)
    vis(o, st, 300); ease(o); cards.append(o)
hero = card(1, "Hero7")
K(hero, 1, (0, 1, -7), (0, 0, -40), 1); K(hero, 36, (0, 1, 0), (0, 0, -20), 1); K(hero, DROP - 4, (0, 1.2, 0), (0, 0, 10), 1); K(hero, DROP + 8, (0, 18, 0), (0, 0, 180), .4)
vis(hero, 1, DROP + 9); ease(hero)
# ---------------- logo tiles
cols = [(0.42, 0.36, 1.0), (0.93, 0.92, 1.0), (0.13, 0.09, 0.6), (0.25, 0.17, 0.95)]
for k, (dx, dz) in enumerate([(-.62, .62), (.62, .62), (-.62, -.62), (.62, -.62)]):
    me = bpy.data.meshes.new(f"Tile{k}"); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.05); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(f"Tile{k}", me)); b = o.modifiers.new("b", "BEVEL"); b.width = .26; b.segments = 8
    me.materials.append(mat(f"Ad7 tile {k}", cols[k], .25, coat=.8))
    for p in me.polygons: p.use_smooth = True
    st = 318 + k * 4; fx, fz = dx * 9, dz * 9
    K(o, 1, (fx, -2, fz + 3), (180, 90, 45), .3); K(o, st, (fx, -2, fz + 3), (180, 90, 45), .3); K(o, st + 18, (dx, 0, dz + 1.6), (0, 0, 0), 1)
    K(o, 450, (dx, 0, dz + 1.6), (0, 0, 8), 1); vis(o, st, 450); ease(o)
# ---------------- 3D text
fnt = bpy.data.fonts.load(os.path.join(D, "Inter-Black.otf"), check_existing=True)
fnt2 = bpy.data.fonts.load(os.path.join(D, "Inter-SemiBold.otf"), check_existing=True)
ink = mat("Ad7 ink", (0.95, 0.94, 1.0), .3, emit=1.2); vio = mat("Ad7 violet", (0.3, 0.22, 1.0), .3, coat=.6)
def text(name, s, f0, f1, loc, size, m, font=fnt, ext=.06):
    cu = bpy.data.curves.new(name, "FONT"); cu.body = s; cu.font = font; cu.size = size; cu.extrude = ext; cu.bevel_depth = .006
    cu.align_x = "CENTER"; cu.align_y = "CENTER"; cu.space_character = .95
    o = link(bpy.data.objects.new(name, cu)); o.data.materials.append(m)
    K(o, 1, (loc[0], loc[1], loc[2] - .6), (90, 0, 0), .001); K(o, f0, (loc[0], loc[1], loc[2] - .6), (90, 0, 0), .001)
    K(o, f0 + 9, loc, (90, 0, 0), 1); K(o, f1 - 6, loc, (90, 0, 0), 1); K(o, f1, (loc[0], loc[1], loc[2] + .5), (90, 0, 0), .001)
    vis(o, f0, f1); ease(o); return o
text("T1", "One link.", 18, 70, (0, -2.2, 2.75), .7, ink)
text("T2", "needs a website.", 66, 122, (0, -2.2, 2.75), .5, vio)
text("T3", "Menu. Orders. Bookings.", DROP + 6, 268, (0, -6, 6.0), .82, ink)
text("T4", "Pixel & Co.", 352, 451, (0, -.6, -1.55), .78, ink)
text("T5", "Ready in days.", 372, 451, (0, -.6, -2.55), .4, vio, fnt2, .02)
# ---------------- camera
cd = bpy.data.cameras.new("Ad7Cam"); cd.lens = 50; cd.dof.use_dof = True; cd.dof.aperture_fstop = 2.8
cam = link(bpy.data.objects.new("Ad7Cam", cd)); sc.camera = cam
tgt = link(bpy.data.objects.new("Ad7Target", None)); cd.dof.focus_object = tgt
tc = cam.constraints.new("TRACK_TO"); tc.target = tgt; tc.track_axis = "TRACK_NEGATIVE_Z"; tc.up_axis = "UP_Y"
for f, c, t in [(1, (2, -14, .5), (0, 1, 0)), (110, (-1, -10, .8), (0, 1, .6)), (DROP, (0, -9, .5), (0, 2, .5)),
                (DROP + 30, (0, -4, .3), (0, 6, .3)), (200, (0, 2, .2), (0, 14, .2)), (268, (2, -20, 2), (0, 2, 1.5)),
                (300, (0, -20, 1), (0, 0, 1)), (330, (0, -15, 1.2), (0, 0, .5)), (450, (0, -13.5, 1.0), (0, 0, .5))]:
    K(cam, f, c); K(tgt, f, t)
ease(cam); ease(tgt)
# ---------------- render
sc.render.engine = "CYCLES"; cy = sc.cycles; cy.device = "GPU"; cy.samples = 48; cy.use_adaptive_sampling = True
cy.use_denoising = True; cy.max_bounces = 6; cy.transparent_max_bounces = 16
sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = .5
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, 100
sc.view_settings.view_transform = "Standard"
try: sc.view_settings.look = "Medium High Contrast"
except Exception: pass
ims = sc.render.image_settings; ims.file_format = "PNG"; ims.color_mode = "RGB"
sc.render.use_overwrite = False; sc.render.use_placeholder = False
sc.render.filepath = os.path.join(D, "frames7", "f_")
