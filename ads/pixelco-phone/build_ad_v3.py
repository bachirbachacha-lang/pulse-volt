"""
Pixel & Co. phone ad, Blender scene (Blender 5.2). Timed to "ski slopes" (Lex Amarni) clip: 24.9 s, 30 fps,
drop at 4.11 s, beat 0.951 s. Six shots, hard cuts via camera markers on beats:
  A  f1-123    reveal: back of the phone rises out of the dark, macro on the lenses, light sweep
  B  f124-209  DROP: phone whips round to the front, cafe site lights up, cards burst out of the screen
  C  f210-323  tilted hero, cafe site scrolling, camera arcs across
  D  f324-437  phone lying flat, overhead orbit, abaya site, cards rise off the screen, glossy floor
  E  f438-552  low hero angle, full spin, car-detailing site, teal light, cards burst
  F  f553-747  end: screen-filling push-out to the Pixel & Co. end screen (text added in compositing)
Run:  python3 build_ad.py -- base=<PixelCo_Phone.blend> dir=<folder with screen_track.mp4 + cards/> [preview=1]
"""
import bpy, math, sys, os, random
from mathutils import Vector, Euler

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
A = dict(a.split("=", 1) for a in argv)
BASE, DIR = A["base"], A["dir"]
PREVIEW = A.get("preview") == "1"

bpy.ops.wm.open_mainfile(filepath=BASE)
scene = bpy.context.scene
R = math.radians
random.seed(7)

# ------------------------------------------------------------------ clean the old studio
for o in list(bpy.data.objects):
    if o.type in {"LIGHT", "CAMERA"}:
        bpy.data.objects.remove(o, do_unlink=True)
old = bpy.data.collections.get("Studio")
if old: bpy.data.collections.remove(old)
ctrl = bpy.data.objects["PHONE_CONTROL"]
ctrl.animation_data_clear()
T = 0.825  # phone thickness (cm)

def coll(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in scene.collection.children: scene.collection.children.link(c)
    return c
STUDIO, CARDS, FX = coll("Ad Studio"), coll("Ad Cards"), coll("Ad FX")

# ------------------------------------------------------------------ timing
FPS, N = 30, 747
scene.render.fps = FPS; scene.frame_start = 1; scene.frame_end = N
SHOTS = {"A": (1, 123), "B1": (124, 152), "B2": (153, 180), "B3": (181, 238), "B4": (239, 323), "D1": (324, 380), "D2": (381, 437), "E1": (438, 494), "E2": (495, 552), "F": (553, 747)}
SHOTS["D"] = SHOTS["D1"]

def key(ob, f, loc=None, rot=None, scl=None):
    if loc is not None: ob.location = loc; ob.keyframe_insert("location", frame=f)
    if rot is not None: ob.rotation_euler = Euler([R(v) for v in rot]); ob.keyframe_insert("rotation_euler", frame=f)
    if scl is not None:
        ob.scale = (scl, scl, scl) if isinstance(scl, (int, float)) else scl; ob.keyframe_insert("scale", frame=f)

def fcurves(ob):
    ad = ob.animation_data
    if not ad or not ad.action: return []
    act = ad.action
    if hasattr(act, "fcurves") and len(getattr(act, "fcurves", [])):
        return list(act.fcurves)
    out = []  # Blender 4.4+/5.x layered actions
    for layer in getattr(act, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                out += list(bag.fcurves)
    return out

def finalize(ob, cut_frames=(), ease="SINE"):
    """Smooth eases inside shots; CONSTANT on the last key before every cut so motion blur never smears across a cut."""
    for fc in fcurves(ob):
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"
            kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"
            if int(round(kp.co.x)) + 1 in cut_frames:
                kp.interpolation = "CONSTANT"

def vis(ob, frames_on):
    """frames_on: list of (start, end) ranges where the object renders."""
    ob.hide_render = True; ob.keyframe_insert("hide_render", frame=1)
    ob.hide_viewport = False
    for a, b in frames_on:
        ob.hide_render = False; ob.keyframe_insert("hide_render", frame=a)
        ob.hide_render = True; ob.keyframe_insert("hide_render", frame=b + 1)
    for fc in fcurves(ob):
        if fc.data_path == "hide_render":
            for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"

CUTS = [s[0] for s in SHOTS.values()][1:]

# ------------------------------------------------------------------ screen: the recorded site track
scr = bpy.data.objects["Screen"]
smat = scr.active_material
nt = smat.node_tree
tex = nt.nodes["YOUR DESIGN HERE"]
mov = bpy.data.images.load(os.path.join(DIR, "screen_track.mp4"))
mov.source = "MOVIE"; mov.colorspace_settings.name = "sRGB"
tex.image = mov
iu = tex.image_user
iu.frame_duration = N; iu.frame_start = 1; iu.frame_offset = 0; iu.use_auto_refresh = True; iu.use_cyclic = False
p = nt.nodes["Principled BSDF"]
p.inputs["Coat Weight"].default_value = 0.12
p.inputs["Roughness"].default_value = 0.08
es = p.inputs["Emission Strength"]
for f, v in [(1, 0.0), (122, 0.0), (124, 5.0), (127, 1.35), (N, 1.35)]:
    es.default_value = v; es.keyframe_insert("default_value", frame=f)

# ------------------------------------------------------------------ world + lights
world = scene.world
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = (0.0045, 0.0038, 0.012, 1)
bg.inputs["Strength"].default_value = 1.0

def area(name, loc, size, power, color=(1, 1, 1), size_y=None, aim=(0, 0, 0)):
    ld = bpy.data.lights.new(name, "AREA"); ld.energy = power; ld.color = color
    if size_y: ld.shape = "RECTANGLE"; ld.size = size; ld.size_y = size_y
    else: ld.size = size
    ob = bpy.data.objects.new(name, ld); ob.location = loc; STUDIO.objects.link(ob)
    ob.visible_camera = False
    ob.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob

hexc = lambda h: tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
area("Key Softbox", (-34, -38, 26), 30, 22000)
area("Violet Rim", (34, 22, 6), 12, 34000, hexc("#7C6CFF"))
area("Hot Rim", (-30, 18, -4), 10, 24000, hexc("#FF5A36"))
area("Top Strip", (6, -10, 42), 44, 10000, size_y=5)
area("Glass Sheen", (-26, -30, 20), 10, 1100, size_y=40)
sweep = area("Light Sweep", (-40, -26, 6), 3, 0, size_y=50, aim=(0, 0, 5))
for f, x, e in [(1, -40, 0), (14, -34, 9000), (104, 38, 9000), (118, 44, 0), (N, 44, 0)]:
    sweep.location.x = x; sweep.keyframe_insert("location", frame=f)
    sweep.data.energy = e; sweep.data.keyframe_insert("energy", frame=f)
teal = area("Warm Kick", (24, -12, -10), 14, 0, hexc("#F5DD91"))
for f, e in [(1, 0), (437, 0), (438, 9000), (552, 9000), (553, 0)]:
    teal.data.energy = e; teal.data.keyframe_insert("energy", frame=f)

# ------------------------------------------------------------------ floor for the flat shot
fm = bpy.data.materials.new("Ad Floor"); fm.use_nodes = True
fp = fm.node_tree.nodes["Principled BSDF"]
fp.inputs["Base Color"].default_value = (0.012, 0.010, 0.03, 1); fp.inputs["Roughness"].default_value = 0.22
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -T / 2 - 0.03))
floor = bpy.context.active_object; floor.name = "Ad Floor"; floor.data.materials.append(fm)
for c in floor.users_collection: c.objects.unlink(floor)
FX.objects.link(floor)
vis(floor, [SHOTS["D"]])

# ------------------------------------------------------------------ floating pixels (bokeh squares, brand colours)
pix_cols = [hexc("#7C6CFF"), hexc("#FF5A36"), hexc("#3CF2C0"), hexc("#B3A8FF")]
pmats = []
for i, c in enumerate(pix_cols):
    m = bpy.data.materials.new(f"Pixel {i}"); m.use_nodes = True
    pp = m.node_tree.nodes["Principled BSDF"]
    pp.inputs["Base Color"].default_value = (*c, 1); pp.inputs["Emission Color"].default_value = (*c, 1)
    pp.inputs["Emission Strength"].default_value = 6.0
    pmats.append(m)
for i in range(70):
    bpy.ops.mesh.primitive_cube_add(size=0.5)
    cube = bpy.context.active_object; cube.name = f"Pixel {i:02d}"
    for c in cube.users_collection: c.objects.unlink(cube)
    FX.objects.link(cube)
    cube.data.materials.append(pmats[i % 4])
    r = random.uniform(26, 70); th = random.uniform(0, 2 * math.pi); z = random.uniform(-30, 30)
    cube.location = (r * math.cos(th), r * math.sin(th), z)
    cube.rotation_euler = (random.random() * 6, random.random() * 6, random.random() * 6)
    cube.scale = [random.uniform(.5, 1.6)] * 3
    cube.keyframe_insert("location", frame=1); cube.keyframe_insert("rotation_euler", frame=1)
    for fc in fcurves(cube):
        mod = fc.modifiers.new("NOISE"); mod.scale = random.uniform(80, 160); mod.strength = 6 if fc.data_path == "location" else 2
        mod.phase = random.uniform(0, 100)


# ------------------------------------------------------------------ phone choreography v2 (faster: a cut every 1-2 beats, the camera never rests)
P = [
 (1, (0, 0, -6), (90, 0, 214)), (123, (0, 0, 0), (90, 0, 176)),
 (124, (0, 0, 0), (90, 0, 150)), (140, (0, 0, 0), (90, 0, -18)), (152, (0, 0, 0.3), (90, 0, -12)),
 (153, (0, 0, 0), (90, 0, -10)), (180, (0, 0, 0.6), (90, 0, 6)),
 (181, (0, 0, 0), (80, 0, -34)), (238, (0, 0, 0.4), (80, 0, 14)),
 (239, (0, 0, 0), (72, 0, -44)), (323, (0, 0, 0.5), (72, 0, -4)),
 (324, (0, 0, 0), (0, 0, -34)), (380, (0, 0, 0), (0, 0, 4)),
 (381, (0, 0, 0), (90, 0, -40)), (437, (0, 0, 0.5), (90, 0, -24)),
 (438, (0, 0, 0), (90, 0, -384)), (456, (0, 0, 0), (90, 0, -30)), (494, (0, 0, 0.2), (90, 0, -18)),
 (495, (0, 0, 0), (90, 0, -24)), (552, (0, 0, 0.4), (90, 0, -6)),
 (553, (0, 0, 0), (90, 0, -8)), (747, (0, 0, 0), (90, 0, 8)),
]
for f, l, r in P: key(ctrl, f, l, r)
finalize(ctrl, CUTS)
# E1 whip: the full spin fires on the cut and settles facing the camera before the first word (15.06 s)
for fc in fcurves(ctrl):
    if fc.data_path == "rotation_euler" and fc.array_index == 2:
        for kp in fc.keyframe_points:
            if int(round(kp.co.x)) == 438: kp.interpolation = "CUBIC"; kp.easing = "EASE_OUT"

# ------------------------------------------------------------------ cameras v2
def camera(name, lens, fstop, target):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.sensor_fit = "AUTO"; cd.sensor_width = 36
    cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop; cd.dof.focus_object = target
    cd.clip_start = 0.5; cd.clip_end = 2000
    ob = bpy.data.objects.new(name, cd); STUDIO.objects.link(ob)
    tc = ob.constraints.new("TRACK_TO"); tc.target = target; tc.track_axis = "TRACK_NEGATIVE_Z"; tc.up_axis = "UP_Y"
    return ob
def empty(name, loc, parent=None):
    e = bpy.data.objects.new(name, None); e.empty_display_size = 1; e.location = loc; STUDIO.objects.link(e)
    if parent: e.parent = parent
    return e
lens_t = empty("Target Lenses", (1.305, 5.0, -0.7), ctrl)
center = empty("Target Center", (0, 0, 0))
top_t = empty("Target Screen Top", (0, 0, 3.2))
corner_t = empty("Target Corner", (2.0, 4.6, 0.42), ctrl)
low_t = empty("Target Hero", (0, 0, 2.5))
end_t = empty("Target End", (0, 0, 0)); key(end_t, 553, (0, 0, 0.8)); key(end_t, 747, (0, 0, -3.2))
CAMS = {
 "A":  ("Cam A Reveal", 85, 5.0, lens_t, [(1, (-8, -10, 8)), (123, (4, -21, 3.5))]),
 "B1": ("Cam B1 Whip", 52, 4.0, center, [(124, (8, -31, 6)), (152, (3, -25, 2.5))]),
 "B2": ("Cam B2 Push", 50, 5.6, top_t, [(153, (1.5, -21, 5)), (180, (0, -13, 3.6))]),
 "B3": ("Cam B3 Low orbit", 40, 4.0, center, [(181, (-20, -18, -7)), (238, (19, -20, -4))]),
 "B4": ("Cam B4 Tilt", 50, 4.0, center, [(239, (-17, -21, 13)), (323, (16, -23, 9))]),
 "D1": ("Cam D1 Overhead", 46, 3.5, center, [(324, (-12, -15, 26)), (380, (10, -17, 21))]),
 "D2": ("Cam D2 Corner", 60, 8.0, corner_t, [(381, (-4.6, -9.6, 7.4)), (437, (-1.8, -10.6, 4.4))]),
 "E1": ("Cam E1 Hero", 36, 4.0, low_t, [(438, (6, -22, -7)), (494, (-3, -20, -5))]),
 "E2": ("Cam E2 Push", 50, 4.0, center, [(495, (9, -31, 5)), (552, (2, -24, 2))]),
 "F":  ("Cam F End", 50, 4.5, end_t, [(553, (0, -11, 0.8)), (600, (0, -27, 0.2)), (747, (0, -37, -0.4))]),
}
scene.timeline_markers.clear()
cams = {}
for k, (nm, lens, fs, tg, keys) in CAMS.items():
    c = camera(nm, lens, fs, tg)
    for f, l in keys: key(c, f, l)
    finalize(c); cams[k] = c
    m = scene.timeline_markers.new(f"Shot {k}", frame=SHOTS[k][0]); m.camera = c
finalize(end_t)
scene.camera = cams["A"]

# ------------------------------------------------------------------ cards v2 (several bursts)
def card(name, img_name, width, frames_on, path_keys):
    img = bpy.data.images.get(img_name + ".png") or bpy.data.images.load(os.path.join(DIR, "cards", img_name + ".png"))
    w, h = img.size; hgt = width * h / w
    me = bpy.data.meshes.new(name)
    me.from_pydata([(-width / 2, -hgt / 2, 0), (width / 2, -hgt / 2, 0), (width / 2, hgt / 2, 0), (-width / 2, hgt / 2, 0)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name="UVMap")
    for i, co in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv.data[i].uv = co
    m = bpy.data.materials.get("card " + img_name)
    if m is None:
        m = bpy.data.materials.new("card " + img_name); m.use_nodes = True
        n = m.node_tree.nodes; pr = n["Principled BSDF"]
        ti = n.new("ShaderNodeTexImage"); ti.image = img; ti.interpolation = "Cubic"
        l = m.node_tree.links
        l.new(ti.outputs["Color"], pr.inputs["Base Color"]); l.new(ti.outputs["Alpha"], pr.inputs["Alpha"])
        l.new(ti.outputs["Color"], pr.inputs["Emission Color"]); pr.inputs["Emission Strength"].default_value = 0.45
        pr.inputs["Roughness"].default_value = 0.3; pr.inputs["Coat Weight"].default_value = 0.4
    me.materials.append(m)
    ob = bpy.data.objects.new(name, me); CARDS.objects.link(ob); ob.parent = ctrl
    for f, loc, rot, s in path_keys: key(ob, f, loc, rot, s)
    finalize(ob); vis(ob, frames_on)
    return ob
zs = T / 2 + 0.02
def burst(tag, f0, f1, items):
    for k, (img, width, start, end, rot) in enumerate(items):
        a = f0 + 2 * k
        drift = tuple(e * 1.08 for e in end)
        card(f"{tag} {img}", img, width, [(a, f1)], [(a, (start[0], start[1], zs), (0, 0, 0), .3), (a + 12, end, rot, 1), (f1, drift, tuple(r * 1.3 for r in rot), 1)])
burst("B1", 125, 180, [("c_bbm_foam", 3.4, (-1.2, 1.6), (-4.3, 2.8, 4.8), (-8, 14, 6)), ("c_bbm_order", 4.6, (0, -3.8), (2.6, -5.0, 5.6), (10, -12, -4)), ("c_bbm_bday", 3.2, (1.2, 4.4), (4.1, 6.0, 3.6), (-12, -10, -8))])
burst("B3", 183, 238, [("c_bbm_autumn", 3.3, (-1.0, 2.0), (-4.6, 3.2, 4.4), (6, 16, 4)), ("c_bbm_whim", 3.3, (1.0, -1.0), (4.4, -2.2, 4.8), (-6, -14, -3))])
burst("D1", 326, 380, [("c_bbm_whim", 3.3, (-1.0, 1.5), (-3.5, 2.7, 4.2), (14, -10, 8)), ("c_bbm_pickup", 4.4, (0.8, -1.2), (3.8, -1.6, 4.0), (-10, 12, -6)), ("c_bbm_autumn", 3.3, (0, -4.6), (-0.6, -7.2, 3.6), (16, 4, 3))])
burst("E2", 496, 552, [("c_bbm_foam", 3.4, (0, 0.5), (-3.8, 3.0, 5.0), (-8, 14, 5)), ("c_bbm_bday", 3.2, (1.6, 2.4), (4.2, 4.4, 3.8), (-14, -12, -9)), ("c_bbm_order", 4.6, (0, -3.6), (2.2, -5.4, 5.4), (12, -10, -3))])

# ------------------------------------------------------------------ render settings (tuned for the owner's NVIDIA GPU)
scene.render.engine = "CYCLES"
cy = scene.cycles
cy.samples = 96; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03
cy.use_denoising = True; cy.denoiser = "OPENIMAGEDENOISE"
cy.max_bounces = 8; cy.transparent_max_bounces = 16
scene.render.use_motion_blur = True; scene.render.motion_blur_shutter = 0.5; scene.render.motion_blur_position = "START"
scene.render.resolution_x, scene.render.resolution_y = 1080, 1920; scene.render.resolution_percentage = 100
scene.render.film_transparent = False
try:
    scene.view_settings.view_transform = "AgX"; scene.view_settings.look = "AgX - Medium High Contrast"
except Exception: pass
# Output: a PNG frame sequence, not one video file, so a long render can be stopped and resumed:
# with overwrite off, pressing Render Animation again skips every frame already on disk (a frame is only
# written once it is finished, so an interrupted frame is simply rendered again). No placeholders: an empty
# placeholder left by a stopped render would be skipped on resume.
# pc_encode.py then joins the frames into //render/pixelco_ad_3d.mp4 inside Blender.
try:
    scene.render.image_settings.media_type = "IMAGE"
except Exception: pass
ims = scene.render.image_settings
ims.file_format = "PNG"; ims.color_mode = "RGB"; ims.color_depth = "8"; ims.compression = 15
scene.render.use_file_extension = True
scene.render.use_overwrite = False; scene.render.use_placeholder = False
scene.render.filepath = "//render/frames/pc_"
try:
    cy.device = "GPU"
except Exception: pass

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(DIR, "PixelCo_Ad.blend"), compress=True, relative_remap=True)
bpy.ops.file.make_paths_relative()
bpy.ops.wm.save_mainfile(compress=True)
print("SAVED", os.path.join(DIR, "PixelCo_Ad.blend"))

if PREVIEW:
    cy.device = "CPU"
    cy.samples = int(os.environ.get("PSAMPLES", "6")); cy.use_adaptive_sampling = False
    scene.render.resolution_percentage = int(os.environ.get("PPCT", "28"))
    try:
        scene.render.image_settings.media_type = "IMAGE"
    except Exception: pass
    scene.render.image_settings.file_format = "JPEG"; scene.render.image_settings.quality = 88
    scene.render.use_motion_blur = os.environ.get("PBLUR", "0") == "1"
    step = int(os.environ.get("PSTEP", "3"))
    frames = os.environ.get("PFRAMES")
    frames = [int(x) for x in frames.split(",")] if frames else list(range(1, N + 1, step))
    for f in frames:
        scene.frame_set(f)
        scene.render.filepath = os.path.join(DIR, "preview", f"p{f:04d}.jpg")
        bpy.ops.render.render(write_still=True)
    print("PREVIEW DONE", len(frames))
