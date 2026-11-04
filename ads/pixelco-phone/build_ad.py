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
SHOTS = {"A": (1, 123), "B": (124, 209), "C": (210, 323), "D": (324, 437), "E": (438, 552), "F": (553, 747)}

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
teal = area("Teal Kick", (24, -12, -10), 14, 0, hexc("#29E0FF"))
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

# ------------------------------------------------------------------ phone choreography (PHONE_CONTROL)
A_, B_, C_, D_, E_, F_ = [SHOTS[k] for k in "ABCDEF"]
key(ctrl, 1, (0, 0, -4.5), (90, 0, 202))
key(ctrl, 123, (0, 0, 0), (90, 0, 186))
key(ctrl, 124, (0, 0, 0), (90, 0, 150))
key(ctrl, 148, (0, 0, 0), (90, 0, -16))
key(ctrl, 209, (0, 0, 0.4), (90, 0, -8))
key(ctrl, 210, (0, 0, 0), (74, 0, -40))
key(ctrl, 323, (0, 0, 0.5), (74, 0, -16))
key(ctrl, 324, (0, 0, 0), (0, 0, -26))
key(ctrl, 437, (0, 0, 0), (0, 0, 8))
key(ctrl, 438, (0, 0, 0), (90, 0, -384))
key(ctrl, 492, (0, 0, 0), (90, 0, -22))
key(ctrl, 552, (0, 0, 0.3), (90, 0, -14))
key(ctrl, 553, (0, 0, 0), (90, 0, -5))
key(ctrl, 747, (0, 0, 0), (90, 0, 7))
finalize(ctrl, CUTS)

# ------------------------------------------------------------------ cameras
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

lens_t = empty("Target Lenses", (1.305, 5.0, -0.7), ctrl)          # rear camera cluster, phone-local
center = empty("Target Center", (0, 0, 0))
low_t = empty("Target Hero", (0, 0, 2.5))
end_t = empty("Target End", (0, 0, 0))
key(end_t, 553, (0, 0, 0.8)); key(end_t, 747, (0, 0, -3.2))

camA = camera("Cam A Reveal", 85, 1.6, lens_t)
key(camA, 1, (-7, -12, 7.5)); key(camA, 123, (2.5, -19, 4.5))
camB = camera("Cam B Drop", 58, 3.2, center)
key(camB, 124, (7, -31, 5)); key(camB, 209, (2.5, -25.5, 2))
camC = camera("Cam C Tilt", 50, 3.5, center)
key(camC, 210, (-17, -21, 12)); key(camC, 323, (15, -23, 9.5))
camD = camera("Cam D Overhead", 48, 3.0, center)
key(camD, 324, (-13, -17, 27)); key(camD, 437, (11, -18, 24))
camE = camera("Cam E Hero", 38, 4.0, low_t)
key(camE, 438, (5, -23, -7)); key(camE, 552, (-3, -21.5, -5))
camF = camera("Cam F End", 50, 4.5, end_t)
key(camF, 553, (0, -12.5, 0.8)); key(camF, 747, (0, -37, -0.4))
for c in (camA, camB, camC, camD, camE, camF, end_t): finalize(c)
scene.timeline_markers.clear()
for k, cam in zip("ABCDEF", (camA, camB, camC, camD, camE, camF)):
    m = scene.timeline_markers.new(f"Shot {k}", frame=SHOTS[k][0]); m.camera = cam
scene.camera = camA

# ------------------------------------------------------------------ cards that burst out of the screen
def card(name, width, frames_on, path_keys):
    img = bpy.data.images.load(os.path.join(DIR, "cards", name + ".png"))
    w, h = img.size; hgt = width * h / w
    me = bpy.data.meshes.new(name)
    me.from_pydata([(-width / 2, -hgt / 2, 0), (width / 2, -hgt / 2, 0), (width / 2, hgt / 2, 0), (-width / 2, hgt / 2, 0)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name="UVMap")
    for i, co in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv.data[i].uv = co
    m = bpy.data.materials.new(name); m.use_nodes = True
    n = m.node_tree.nodes; pr = n["Principled BSDF"]
    ti = n.new("ShaderNodeTexImage"); ti.image = img; ti.interpolation = "Cubic"
    l = m.node_tree.links
    l.new(ti.outputs["Color"], pr.inputs["Base Color"]); l.new(ti.outputs["Alpha"], pr.inputs["Alpha"])
    l.new(ti.outputs["Color"], pr.inputs["Emission Color"]); pr.inputs["Emission Strength"].default_value = 0.45
    pr.inputs["Roughness"].default_value = 0.3; pr.inputs["Coat Weight"].default_value = 0.4
    me.materials.append(m)
    ob = bpy.data.objects.new(name, me); CARDS.objects.link(ob); ob.parent = ctrl
    for f, loc, rot, s in path_keys: key(ob, f, loc, rot, s)
    finalize(ob)
    vis(ob, frames_on)
    return ob

zs = T / 2 + 0.02
# Shot B: cafe
card("c_menu", 3.6, [B_], [(125, (-1.2, 1.6, zs), (0, 0, 0), .3), (141, (-4.4, 2.6, 4.6), (-8, 14, 6), 1), (209, (-4.8, 2.9, 5.2), (-4, 18, 9), 1)])
card("c_order", 4.4, [B_], [(127, (0, -3.8, zs), (0, 0, 0), .3), (143, (2.6, -5.0, 5.6), (10, -12, -4), 1), (209, (2.9, -5.3, 6.1), (8, -16, -6), 1)])
card("c_time", 3.3, [B_], [(129, (1.2, 4.6, zs), (0, 0, 0), .3), (145, (3.9, 6.1, 3.6), (-12, -10, -8), 1), (209, (4.2, 6.4, 4.0), (-10, -14, -11), 1)])
# Shot D: abaya (phone lying flat, cards rise up)
card("c_abaya", 3.4, [D_], [(326, (-1.0, 1.5, zs), (0, 0, 0), .3), (344, (-3.5, 2.7, 4.2), (14, -10, 8), 1), (437, (-3.8, 3.0, 4.8), (18, -14, 12), 1)])
card("c_size", 4.2, [D_], [(329, (0.8, -1.2, zs), (0, 0, 0), .3), (347, (3.8, -1.6, 4.0), (-10, 12, -6), 1), (437, (4.2, -1.8, 4.6), (-14, 16, -9), 1)])
card("c_fit", 4.6, [D_], [(332, (0, -4.6, zs), (0, 0, 0), .3), (350, (-0.6, -7.2, 3.0), (16, 4, 3), 1), (437, (-0.8, -7.6, 3.5), (20, 6, 5), 1)])
# Shot E: car detailing
card("c_pkg", 4.6, [(492, 552)], [(492, (0, 0.5, zs), (0, 0, 0), .3), (508, (-3.6, 3.0, 5.0), (-8, 14, 5), 1), (552, (-3.9, 3.2, 5.5), (-6, 17, 8), 1)])
card("c_day", 1.7, [(494, 552)], [(494, (1.6, 2.4, zs), (0, 0, 0), .3), (510, (4.4, 4.6, 3.6), (-14, -12, -9), 1), (552, (4.7, 4.9, 4.0), (-12, -16, -12), 1)])
card("c_book", 4.2, [(496, 552)], [(496, (0, -3.6, zs), (0, 0, 0), .3), (512, (2.2, -5.4, 5.4), (12, -10, -3), 1), (552, (2.5, -5.7, 6.0), (10, -14, -5), 1)])

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
try:
    scene.render.image_settings.media_type = "VIDEO"
except Exception: pass
scene.render.image_settings.file_format = "FFMPEG"
ff = scene.render.ffmpeg
ff.format = "MPEG4"; ff.codec = "H264"; ff.constant_rate_factor = "HIGH"; ff.ffmpeg_preset = "GOOD"; ff.gopsize = 15
ff.audio_codec = "NONE"
scene.render.filepath = "//render/pixelco_ad_3d.mp4"
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
