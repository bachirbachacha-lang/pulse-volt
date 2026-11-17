"""Pixel & Co. ad 6: "Portfolio Wall". White studio, 3D wall of the owner's real website screens.
Ski-slopes beat grid: first beat 0.30 s, period 0.9513 s, drop 4.11 s (frame 124). 15 s, 30 fps, 1080x1920."""
import bpy, bmesh, math, os, random
from mathutils import Vector
D = r"C:\Users\PC\Downloads\PixelCo_Ad5\ad6"
random.seed(4)
sc = bpy.data.scenes.get("Ad6") or bpy.data.scenes.new("Ad6")
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
# ---------------- world + studio
w = bpy.data.worlds.get("Ad6W") or bpy.data.worlds.new("Ad6W"); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (0.86, 0.855, 0.84, 1); bg.inputs["Strength"].default_value = 0.55
me = bpy.data.meshes.new("Floor"); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60); bm.to_mesh(me); bm.free()
floor = link(bpy.data.objects.new("Floor", me)); floor.location = (0, 0, -6.2); me.materials.append(mat("Ad6 Floor", (0.9, 0.89, 0.87), 0.55))
def area(n, loc, e, size, col=(1, 1, 1), aim=(0, 0, 0)):
    ld = bpy.data.lights.new(n, "AREA"); ld.energy = e; ld.size = size; ld.color = col
    o = link(bpy.data.objects.new(n, ld)); o.location = loc
    o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); return o
area("Key", (-8, -10, 12), 9000, 10); area("Fill", (10, -8, 2), 3000, 12, (1, .95, .9)); area("Rim", (0, 10, 8), 5000, 10, (.85, .82, 1))
# ---------------- cards
def card(i, name):
    img = bpy.data.images.load(os.path.join(D, "tex", f"c{i:02d}.png"), check_existing=True)
    w_, h_ = 1.8, 1.8 * 1688 / 780
    me = bpy.data.meshes.new(name); me.from_pydata([(-w_/2, 0, -h_/2), (w_/2, 0, -h_/2), (w_/2, 0, h_/2), (-w_/2, 0, h_/2)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name="UVMap")
    for k, co in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv.data[k].uv = co
    m = bpy.data.materials.get(f"Ad6 card {i}")
    if m is None:
        m = bpy.data.materials.new(f"Ad6 card {i}"); m.use_nodes = True
        nt = m.node_tree; p = nt.nodes["Principled BSDF"]; t = nt.nodes.new("ShaderNodeTexImage"); t.image = img; t.interpolation = "Cubic"
        nt.links.new(t.outputs["Color"], p.inputs["Base Color"]); nt.links.new(t.outputs["Alpha"], p.inputs["Alpha"])
        nt.links.new(t.outputs["Color"], p.inputs["Emission Color"]); p.inputs["Emission Strength"].default_value = 0.85
        p.inputs["Roughness"].default_value = 0.18; p.inputs["Coat Weight"].default_value = 0.6
    me.materials.append(m)
    o = link(bpy.data.objects.new(name, me)); o.rotation_mode = "XYZ"; return o
DROP = 124
hero = card(1, "Hero")
K(hero, 1, (0, 0, -9), (8, 0, -50), 1); K(hero, 30, (0, 0, 0), (4, 0, -28), 1); K(hero, 110, (0, 0, .2), (0, 0, 14), 1)
K(hero, DROP, (0, 1.5, 0), (0, 0, 0), 1)
# wall: 3 rows x 5, slight arc
cards = []
for r in range(3):
    for c in range(5):
        i = (r * 5 + c) % 10 + 1
        o = card(i, f"W{r}{c}"); x = (c - 2) * 2.25; z = (1 - r) * 4.25; y = 2.0 + 0.35 * (c - 2) ** 2
        st = DROP + 1 + int(abs(c - 2) * 2 + r * 1.5)
        K(o, 1, (0, 1.6, 0), (0, 0, 0), .05); K(o, st, (0, 1.6, 0), (0, 0, 0), .05)
        K(o, st + 14, (x, y, z), (0, 0, -6 * (c - 2)), 1)
        for f in range(st + 30, 268, 28):  # wave on the beat
            ph = (c * .7 + r * .5); K(o, f, (x, y - .25 * math.sin(f * .21 + ph), z + .12 * math.sin(f * .17 + ph)), (6 * math.sin(f * .19 + ph), 0, -6 * (c - 2) + 8 * math.sin(f * .23 + ph)))
        fo = 272 + int(random.random() * 26)  # fly away
        K(o, fo, (x, y, z), (0, 0, -6 * (c - 2)), 1); K(o, fo + 22, (x * 1.6 + random.uniform(-3, 3), y + 8, z + 14 + random.uniform(0, 6)), (random.uniform(-90, 90), random.uniform(-60, 60), random.uniform(-120, 120)), .6)
        vis(o, st, 320); ease(o); cards.append(o)
K(hero, 272, (0, 1.5, 0), (0, 0, 0), 1); K(hero, 300, (0, 9, 18), (60, 20, 140), .6); vis(hero, 1, 305); ease(hero)
# ---------------- logo tiles
cols = [(0.42, 0.36, 1.0), (0.93, 0.92, 1.0), (0.13, 0.09, 0.6), (0.25, 0.17, 0.95)]
for k, (dx, dz) in enumerate([(-.62, .62), (.62, .62), (-.62, -.62), (.62, -.62)]):
    me = bpy.data.meshes.new(f"Tile{k}"); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.05); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(f"Tile{k}", me)); b = o.modifiers.new("b", "BEVEL"); b.width = .26; b.segments = 8
    me.materials.append(mat(f"Ad6 tile {k}", cols[k], .25, coat=.8))
    for p in me.polygons: p.use_smooth = True
    st = 318 + k * 4; fx, fz = dx * 9, dz * 9
    K(o, 1, (fx, -2, fz + 3), (180, 90, 45), .3); K(o, st, (fx, -2, fz + 3), (180, 90, 45), .3); K(o, st + 18, (dx, 0, dz + 1.6), (0, 0, 0), 1)
    K(o, 450, (dx, 0, dz + 1.6), (0, 0, 8), 1); vis(o, st, 450); ease(o)
# ---------------- 3D text
fnt = bpy.data.fonts.load(os.path.join(D, "Inter-Black.otf"), check_existing=True)
fnt2 = bpy.data.fonts.load(os.path.join(D, "Inter-SemiBold.otf"), check_existing=True)
ink = mat("Ad6 ink", (0.004, 0.004, 0.006), .8); vio = mat("Ad6 violet", (0.3, 0.22, 1.0), .3, coat=.6)
def text(name, s, f0, f1, loc, size, m, font=fnt, ext=.06):
    cu = bpy.data.curves.new(name, "FONT"); cu.body = s; cu.font = font; cu.size = size; cu.extrude = ext; cu.bevel_depth = .006
    cu.align_x = "CENTER"; cu.align_y = "CENTER"; cu.space_character = .95
    o = link(bpy.data.objects.new(name, cu)); o.data.materials.append(m)
    K(o, 1, (loc[0], loc[1], loc[2] - .6), (90, 0, 0), .001); K(o, f0, (loc[0], loc[1], loc[2] - .6), (90, 0, 0), .001)
    K(o, f0 + 9, loc, (90, 0, 0), 1); K(o, f1 - 6, loc, (90, 0, 0), 1); K(o, f1, (loc[0], loc[1], loc[2] + .5), (90, 0, 0), .001)
    vis(o, f0, f1); ease(o); return o
text("T1", "Your business", 18, 70, (0, -2.2, 2.75), .62, ink)
text("T2", "needs a website.", 66, 122, (0, -2.2, 2.75), .5, vio)
text("T3", "Websites that sell.", DROP + 6, 268, (0, -6, 6.0), 1.05, ink)
text("T4", "Pixel & Co.", 352, 451, (0, -.6, -1.55), .78, ink)
text("T5", "Ready in days.", 372, 451, (0, -.6, -2.55), .4, vio, fnt2, .02)
# ---------------- camera
cd = bpy.data.cameras.new("Ad6Cam"); cd.lens = 50; cd.dof.use_dof = True; cd.dof.aperture_fstop = 2.8
cam = link(bpy.data.objects.new("Ad6Cam", cd)); sc.camera = cam
tgt = link(bpy.data.objects.new("Ad6Target", None)); cd.dof.focus_object = tgt
tc = cam.constraints.new("TRACK_TO"); tc.target = tgt; tc.track_axis = "TRACK_NEGATIVE_Z"; tc.up_axis = "UP_Y"
for f, c, t in [(1, (3, -13, 1), (0, 0, 0)), (110, (-1.5, -9.5, 1.2), (0, 0, .6)), (DROP, (0, -10, 1), (0, 0, 1)),
                (DROP + 18, (0, -26, 2), (0, 0, 1.5)), (200, (-5, -25, 1), (0, 2, 1)), (268, (5, -24, 2), (0, 2, 1.5)),
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
sc.render.filepath = os.path.join(D, "frames", "f_")
