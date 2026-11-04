"""
Bear be matcha 3D drink ad (Blender 5.2, Cycles, transparent film -> composited over 2D colour backgrounds).
24.9 s @ 30 fps on "ski slopes" (drop 4.11 s, beat 0.951 s). Concept ad by Pixel & Co., shown with the brand's permission.
  S1 f1-123     (2D intro only: text + logo reveal in the overlay; 3D is empty)
  S2 f124-266   the build: cup slams down, ice drops, milk pours, matcha pours and swirls, foam pops
  S3 f267-323   macro through the cup wall: matcha swirling into milk
  S4 f324-437   Birthdaee cake matcha: sprinkles rain onto the foam, cup spins
  S5 f438-552   Banana glaze matcha: banana slices orbit, butter foam
  S6 f553-747   cup + phone with their real ordering site
Run: python3 build_bbm.py -- dir=<folder with logo.png, bbm_screen.mp4> phone=<PixelCo_Phone.blend> [preview=1]
"""
import bpy, bmesh, math, sys, os, random
from mathutils import Vector, Euler

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
A = dict(a.split("=", 1) for a in argv)
DIR, PHONE = A["dir"], A["phone"]
PREVIEW = A.get("preview") == "1"
random.seed(11)
R = math.radians

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
FPS, N = 30, 747
scene.render.fps = FPS; scene.frame_start = 1; scene.frame_end = N
scene.unit_settings.system = "METRIC"; scene.unit_settings.scale_length = 0.01
SH = {"S2": (124, 266), "S3": (267, 323), "S4": (324, 437), "S5": (438, 552), "S6": (553, 747)}
CUTS = [124, 267, 324, 438, 553]

def coll(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in scene.collection.children: scene.collection.children.link(c)
    return c
DRINK, FX, STUDIO = coll("Drink"), coll("Toppings FX"), coll("Studio")

def fcurves(idb):
    ad = idb.animation_data
    if not ad or not ad.action: return []
    act = ad.action
    if hasattr(act, "fcurves") and len(getattr(act, "fcurves", [])): return list(act.fcurves)
    out = []
    for layer in getattr(act, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags: out += list(bag.fcurves)
    return out

def finalize(idb, linear=False):
    for fc in fcurves(idb):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR" if linear else "BEZIER"
            kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"
            if int(round(kp.co.x)) + 1 in CUTS or fc.data_path == "hide_render": kp.interpolation = "CONSTANT"

def key(ob, f, loc=None, rot=None, scl=None):
    if loc is not None: ob.location = loc; ob.keyframe_insert("location", frame=f)
    if rot is not None: ob.rotation_euler = Euler([R(v) for v in rot]); ob.keyframe_insert("rotation_euler", frame=f)
    if scl is not None: ob.scale = (scl,) * 3 if isinstance(scl, (int, float)) else scl; ob.keyframe_insert("scale", frame=f)

def kval(sock, pairs):
    for f, v in pairs: sock.default_value = v; sock.keyframe_insert("default_value", frame=f)

def vis(ob, ranges):
    ob.hide_render = True; ob.keyframe_insert("hide_render", frame=1)
    for a, b in ranges:
        ob.hide_render = False; ob.keyframe_insert("hide_render", frame=a)
        ob.hide_render = True; ob.keyframe_insert("hide_render", frame=b + 1)
    for fc in fcurves(ob):
        if fc.data_path == "hide_render":
            for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"

def link(ob, c):
    for u in list(ob.users_collection): u.objects.unlink(ob)
    c.objects.link(ob); return ob

def pmat(name, color, rough=.5, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1); p.inputs["Roughness"].default_value = rough
    for k, v in kw.items():
        n = k.replace("_", " ")
        if n in p.inputs: p.inputs[n].default_value = v
    return m

hexc = lambda h: tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5))

def lathe(name, pts, mat, seg=128):
    bm = bmesh.new()
    rings = []
    for (r, z) in pts:
        ring = [bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)]
        rings.append(ring)
    for a, b in zip(rings[:-1], rings[1:]):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if pts[0][0] > 0: bm.faces.new(list(reversed(rings[0])))
    if pts[-1][0] > 0: bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); ob.data.materials.append(mat); DRINK.objects.link(ob)
    return ob

# ------------------------------------------------------------------ the drink rig
H, R0, R1 = 12.0, 3.1, 4.3
rad = lambda z: R0 + (R1 - R0) * z / H
rig = bpy.data.objects.new("DRINK", None); rig.empty_display_size = 6; DRINK.objects.link(rig)

def thin_plastic(name, tint=(1, 1, 1), base=0.06, edge=0.85, rough=0.03):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; n = nt.nodes; L = nt.links
    for x in list(n): n.remove(x)
    out = n.new("ShaderNodeOutputMaterial"); mix = n.new("ShaderNodeMixShader")
    tr = n.new("ShaderNodeBsdfTransparent"); tr.inputs["Color"].default_value = (*tint, 1)
    gl = n.new("ShaderNodeBsdfGlossy"); gl.inputs["Roughness"].default_value = rough
    lw = n.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.12
    mul = n.new("ShaderNodeMath"); mul.operation = "MULTIPLY_ADD"; mul.inputs[1].default_value = edge; mul.inputs[2].default_value = base
    L.new(lw.outputs["Fresnel"], mul.inputs[0]); L.new(mul.outputs[0], mix.inputs["Fac"])
    L.new(tr.outputs[0], mix.inputs[1]); L.new(gl.outputs[0], mix.inputs[2]); L.new(mix.outputs[0], out.inputs["Surface"])
    return m
M_CUP = thin_plastic("Clear cup", base=0.0, edge=0.55)
cup = lathe("Cup", [(rad(z), z) for z in [0.0, 0.15] + [H * k / 12 for k in range(1, 13)]], M_CUP)
cup.data.polygons[-1].select = False
# open top: delete cap face
bm = bmesh.new(); bm.from_mesh(cup.data)
top = [f for f in bm.faces if all(abs(v.co.z - H) < 1e-4 for v in f.verts)]
bmesh.ops.delete(bm, geom=top, context="FACES"); bm.to_mesh(cup.data); bm.free()
cup.parent = rig
rim = bpy.data.objects.new("Rim", bpy.data.meshes.new("Rim")); DRINK.objects.link(rim)
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=128, radius1=R1 + 0.05, radius2=R1 + 0.05, depth=0.16)
bm.to_mesh(rim.data); bm.free(); rim.location = (0, 0, H - 0.05); rim.data.materials.append(M_CUP); rim.parent = rig
for p in rim.data.polygons: p.use_smooth = True

# sticker with their real logo
logo = bpy.data.images.load(os.path.join(DIR, "logo.png"))
lw, lh = logo.size
M_ST = bpy.data.materials.new("Bear sticker"); M_ST.use_nodes = True
nt = M_ST.node_tree; pr = nt.nodes["Principled BSDF"]; ti = nt.nodes.new("ShaderNodeTexImage"); ti.image = logo
nt.links.new(ti.outputs["Color"], pr.inputs["Base Color"]); nt.links.new(ti.outputs["Alpha"], pr.inputs["Alpha"])
pr.inputs["Roughness"].default_value = 0.42; pr.inputs["Coat Weight"].default_value = 0.5
half = 0.62; zc = 5.2; arc = 2 * half * rad(zc); zh = arc * lh / lw
z0, z1 = zc - zh / 2, zc + zh / 2
bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
NU, NV = 32, 10; grid = {}
for i in range(NU + 1):
    for j in range(NV + 1):
        a = -half + 2 * half * i / NU; z = z0 + (z1 - z0) * j / NV; r = rad(z) + 0.012
        grid[i, j] = bm.verts.new((r * math.sin(a), -r * math.cos(a), z))
for i in range(NU):
    for j in range(NV):
        f = bm.faces.new((grid[i, j], grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]))
        for lp, (u, v) in zip(f.loops, [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]): lp[uvl].uv = (u / NU, v / NV)
st = bpy.data.objects.new("Sticker", bpy.data.meshes.new("Sticker")); bm.to_mesh(st.data); bm.free()
for p in st.data.polygons: p.use_smooth = True
st.data.materials.append(M_ST); DRINK.objects.link(st); st.parent = rig

# liquid: one volume, milk below matcha, swirl boundary animated in the shader
M_LIQ = bpy.data.materials.new("Milk & matcha"); M_LIQ.use_nodes = True
nt = M_LIQ.node_tree; n = nt.nodes; L = nt.links; pr = n["Principled BSDF"]
pr.inputs["Roughness"].default_value = 0.18; pr.inputs["Subsurface Weight"].default_value = 0.35
pr.inputs["Subsurface Radius"].default_value = (0.6, 0.5, 0.4); pr.inputs["Coat Weight"].default_value = 0.2
tc = n.new("ShaderNodeTexCoord"); sx = n.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sx.inputs[0])
noi = n.new("ShaderNodeTexNoise"); noi.noise_dimensions = "4D"; noi.inputs["Scale"].default_value = 0.8; noi.inputs["Detail"].default_value = 6
L.new(tc.outputs["Object"], noi.inputs["Vector"])
kval(noi.inputs["W"], [(1, 0.0), (N, 7.0)])
sub = n.new("ShaderNodeMath"); sub.operation = "SUBTRACT"; sub.inputs[1].default_value = 0.5; L.new(noi.outputs["Fac"], sub.inputs[0])
amp = n.new("ShaderNodeMath"); amp.operation = "MULTIPLY"; L.new(sub.outputs[0], amp.inputs[0])
kval(amp.inputs[1], [(1, 0.6), (196, 0.8), (238, 2.0), (330, 1.8)])
add = n.new("ShaderNodeMath"); add.operation = "ADD"; L.new(sx.outputs["Z"], add.inputs[0]); L.new(amp.outputs[0], add.inputs[1])
mr = n.new("ShaderNodeMapRange"); L.new(add.outputs[0], mr.inputs["Value"])
kval(mr.inputs["From Min"], [(1, 40), (195, 40), (196, 6.5), (238, 5.4), (330, 4.6)])
kval(mr.inputs["From Max"], [(1, 41), (195, 41), (196, 7.1), (238, 7.4), (330, 7.6)])
ramp = n.new("ShaderNodeValToRGB"); L.new(mr.outputs["Result"], ramp.inputs["Fac"])
ramp.color_ramp.elements[0].color = (*hexc("#F7F2E8"), 1); ramp.color_ramp.elements[1].color = (*hexc("#4A7D24"), 1)
mid = ramp.color_ramp.elements.new(0.4); mid.color = (*hexc("#A9C46F"), 1)
L.new(ramp.outputs["Color"], pr.inputs["Base Color"])
liq = lathe("Liquid", [(rad(z) - 0.1, z) for z in [0.18, 1, 3, 5, 7, 9, 11, 11.6]], M_LIQ, 96)
liq.parent = rig
cut = bpy.data.objects.new("Liquid level", bpy.data.meshes.new("cutter")); DRINK.objects.link(cut)
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, 0.5)); bmesh.ops.scale(bm, verts=bm.verts, vec=(12, 12, 1)); bm.to_mesh(cut.data); bm.free()
cut.parent = rig; cut.display_type = "WIRE"; cut.hide_render = True
bo = liq.modifiers.new("Level", "BOOLEAN"); bo.operation = "INTERSECT"; bo.object = cut; bo.solver = "EXACT"
LEVEL = [(1, 0.2), (151, 0.2), (196, 6.6), (238, 9.9), (N, 9.9)]
for f, v in LEVEL: cut.scale = (1, 1, v); cut.keyframe_insert("scale", frame=f)
finalize(cut)

# pour streams
def stream(name, color, a, b, lvl0, lvl1):
    m = pmat(name, color, 0.15, Subsurface_Weight=0.3)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.24, radius2=0.3, depth=1.0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, -0.5))
    ob = bpy.data.objects.new(name, bpy.data.meshes.new(name)); bm.to_mesh(ob.data); bm.free()
    for p in ob.data.polygons: p.use_smooth = True
    ob.data.materials.append(m); DRINK.objects.link(ob); ob.parent = rig
    top = 30.0; ob.location = (0.6, 0.2, top)
    for f, s in [(a, 0.01), (a + 4, top - lvl0 - 0.5), (b - 3, top - lvl1 - 0.3), (b, 0.01)]:
        ob.scale = (1, 1, s); ob.keyframe_insert("scale", frame=f)
    for f, y in [(b - 3, top), (b, top)]:
        pass
    finalize(ob); vis(ob, [(a, b)])
    return ob
stream("Milk pour", hexc("#F7F2E8"), 152, 196, 0.2, 6.6)
stream("Matcha pour", hexc("#5E8A33"), 197, 238, 6.6, 9.9)

# ice
M_ICE = pmat("Ice", (0.95, 0.98, 1.0), 0.06, Transmission_Weight=1.0, IOR=1.31)
ice_final = [(-1.1, 0.4, 1.0), (1.0, -0.6, 1.6), (-0.3, -1.2, 2.9), (0.9, 1.0, 3.6), (-1.0, 0.6, 5.0), (0.4, -0.5, 6.4), (-0.5, 1.1, 7.8)]
for i, (x, y, z) in enumerate(ice_final):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.55)
    ob = bpy.data.objects.new(f"Ice {i}", bpy.data.meshes.new(f"Ice {i}")); bm.to_mesh(ob.data); bm.free()
    bv = ob.modifiers.new("Round", "BEVEL"); bv.width = 0.28; bv.segments = 3
    for p in ob.data.polygons: p.use_smooth = True
    ob.data.materials.append(M_ICE); DRINK.objects.link(ob); ob.parent = rig
    f0 = 134 + i * 2
    rr = [random.uniform(-40, 40) for _ in range(3)]
    key(ob, 1, (x, y, 40), rr)
    key(ob, f0, (x * 0.6, y * 0.6, 26), rr)
    key(ob, f0 + 7, (x, y, z), [v * 0.3 + 15 for v in rr])
    key(ob, f0 + 10, (x, y, z + 0.25), [v * 0.3 + 18 for v in rr])
    key(ob, 266, (x, y, z + 0.1), [v * 0.3 + 22 for v in rr])
    finalize(ob)

# foam cap
M_FOAM = pmat("Foam", hexc("#FBF7EE"), 0.65, Subsurface_Weight=0.6)
kval(M_FOAM.node_tree.nodes["Principled BSDF"].inputs["Base Color"], [(1, (*hexc("#FBF7EE"), 1)), (437, (*hexc("#FBF7EE"), 1)), (438, (*hexc("#F6DF8E"), 1)), (552, (*hexc("#F6DF8E"), 1)), (553, (*hexc("#FBF7EE"), 1))])
for fc in fcurves(M_FOAM.node_tree):
    for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=48, radius=1.0)
for v in bm.verts:
    if v.co.z < 0: v.co.z *= 0.15
foam = bpy.data.objects.new("Foam", bpy.data.meshes.new("Foam")); bm.to_mesh(foam.data); bm.free()
for p in foam.data.polygons: p.use_smooth = True
foam.data.materials.append(M_FOAM); DRINK.objects.link(foam); foam.parent = rig
tx = bpy.data.textures.new("Foam bumps", "CLOUDS"); tx.noise_scale = 0.35
dp = foam.modifiers.new("Bumps", "DISPLACE"); dp.texture = tx; dp.strength = 0.12
sd = foam.modifiers.new("Smooth", "SUBSURF"); sd.levels = 1; sd.render_levels = 1
FR = rad(9.9) - 0.12
foam.location = (0, 0, 9.85)
for f, s in [(1, (0.01, 0.01, 0.01)), (237, (0.01, 0.01, 0.01)), (243, (FR * 1.06, FR * 1.06, 1.9)), (247, (FR, FR, 1.6)), (N, (FR, FR, 1.6))]:
    foam.scale = s; foam.keyframe_insert("scale", frame=f)
finalize(foam)

# matcha powder burst on the slam
M_POW = pmat("Matcha powder", hexc("#7FA65A"), 0.9)
for i in range(80):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=random.uniform(.08, .2))
    ob = bpy.data.objects.new(f"Powder {i}", bpy.data.meshes.new(f"Powder {i}")); bm.to_mesh(ob.data); bm.free()
    ob.data.materials.append(M_POW); FX.objects.link(ob); ob.parent = rig
    a = random.uniform(0, 2 * math.pi); sp = random.uniform(5, 13); up = random.uniform(4, 11)
    p0 = Vector((random.uniform(-2, 2), random.uniform(-2, 2), random.uniform(0.2, 1.5)))
    d = Vector((math.cos(a) * sp, math.sin(a) * sp, up))
    key(ob, 134, tuple(p0), None, 0.01); key(ob, 136, tuple(p0 + d * .25), None, 1)
    key(ob, 146, tuple(p0 + d * .8 + Vector((0, 0, -1))), None, 1); key(ob, 160, tuple(p0 + d * 1.05 + Vector((0, 0, -5))), None, 0.01)
    finalize(ob); vis(ob, [(134, 160)])

# sprinkles (Birthdaee cake)
spc = [hexc(h) for h in ("#EE9DAA", "#F5DD91", "#7E93B2", "#8FD3B6", "#FFFFFF", "#F28B6B")]
smats = [pmat(f"Sprinkle {i}", c, 0.35, Coat_Weight=0.6) for i, c in enumerate(spc)]
for i in range(70):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=.09, radius2=.09, depth=.5)
    ob = bpy.data.objects.new(f"Sprinkle {i}", bpy.data.meshes.new(f"Sprinkle {i}")); bm.to_mesh(ob.data); bm.free()
    bv = ob.modifiers.new("Round", "BEVEL"); bv.width = .04; bv.segments = 2
    ob.data.materials.append(smats[i % 6]); FX.objects.link(ob); ob.parent = rig
    a = random.uniform(0, 2 * math.pi); rr = math.sqrt(random.random()) * (FR - .4)
    land = Vector((rr * math.cos(a), rr * math.sin(a), 9.85 + 1.6 * math.sqrt(max(0, 1 - (rr / FR) ** 2)) + .05))
    f0 = 326 + int(random.uniform(0, 22)); rot = [random.uniform(0, 360) for _ in range(3)]
    key(ob, 1, tuple(land + Vector((random.uniform(-4, 4), random.uniform(-4, 4), 22))), rot)
    key(ob, f0, tuple(land + Vector((random.uniform(-3, 3), random.uniform(-3, 3), 18))), rot)
    key(ob, f0 + 9, tuple(land), [90, 0, rot[2]])
    key(ob, 437, tuple(land), [90, 0, rot[2]])
    finalize(ob); vis(ob, [SH["S4"]])

# banana slices (Banana glaze)
M_BAN = pmat("Banana", hexc("#F3DA74"), 0.42, Subsurface_Weight=0.5)
M_PEEL = pmat("Banana edge", hexc("#E9C750"), 0.4)
for i in range(11):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=40, radius1=1.15, radius2=1.15, depth=.36)
    ob = bpy.data.objects.new(f"Banana {i}", bpy.data.meshes.new(f"Banana {i}")); bm.to_mesh(ob.data); bm.free()
    bv = ob.modifiers.new("Round", "BEVEL"); bv.width = .12; bv.segments = 3
    for p in ob.data.polygons: p.use_smooth = True
    ob.data.materials.append(M_BAN); FX.objects.link(ob); ob.parent = rig
    a0 = 2 * math.pi * i / 11; zr = random.uniform(1.5, 13); rr = random.uniform(7.5, 10.5); spd = random.uniform(.9, 1.3)
    for k, f in enumerate(range(438, 553, 8)):
        a = a0 + spd * (f - 438) / 115 * 2.4
        ob.location = (rr * math.cos(a), rr * math.sin(a), zr + math.sin(a * 2) * 0.8)
        ob.rotation_euler = (R(60 + 40 * math.sin(a)), R(f * 3 % 360), a)
        ob.keyframe_insert("location", frame=f); ob.keyframe_insert("rotation_euler", frame=f)
    finalize(ob); vis(ob, [SH["S5"]])

# drink choreography
key(rig, 1, (0, 0, 400), (0, 0, 0), 1)
key(rig, 123, (0, 0, 400), (0, 0, 0), 1)
key(rig, 124, (0, 0, 32), (0, 0, -8), 1)
key(rig, 132, (0, 0, 0), (0, 0, -4), 1)
key(rig, 134, (0, 0, 0), (0, 0, -2), (1.09, 1.09, 0.88))
key(rig, 138, (0, 0, 0), (0, 0, 0), 1)
key(rig, 250, (0, 0, 0), (0, 0, 4), 1)
key(rig, 266, (0, 0, 0), (0, 0, 24), 1)
key(rig, 267, (0, 0, 0), (0, 0, -22), 1)
key(rig, 323, (0, 0, 0), (0, 0, -6), 1)
key(rig, 324, (0, 0, 0), (0, 0, -30), 1)
key(rig, 400, (0, 0, 0), (0, 0, 330), 1)
key(rig, 437, (0, 0, 0), (0, 0, 345), 1)
key(rig, 438, (0, 0, 0), (7, 0, -24), 1)
key(rig, 552, (0, 0, 0.8), (7, 0, 18), 1)
key(rig, 553, (-4.6, 3.6, 0), (0, 0, 12), 1)
key(rig, 747, (-4.6, 3.6, 0), (0, 0, 26), 1)
finalize(rig)

# ------------------------------------------------------------------ phone with their real site (S6)
with bpy.data.libraries.load(PHONE, link=False) as (src, dst):
    dst.collections = [c for c in src.collections if c == "Phone"]
phc = dst.collections[0]; scene.collection.children.link(phc)
ctrl = bpy.data.objects["PHONE_CONTROL"]
scrn = bpy.data.objects["Screen"]; snt = scrn.active_material.node_tree
stex = snt.nodes["YOUR DESIGN HERE"]
mov = bpy.data.images.load(os.path.join(DIR, "bbm_screen.mp4")); mov.source = "MOVIE"
stex.image = mov; iu = stex.image_user; iu.frame_duration = 198; iu.frame_start = 553; iu.use_auto_refresh = True
key(ctrl, 1, (6, -2, 500), (90, 0, -18), 1)
key(ctrl, 552, (6, -2, 500), (90, 0, -18), 1)
key(ctrl, 553, (5.2, -3.5, 7.4), (90, 0, -20), 1)
key(ctrl, 747, (4.6, -3.8, 7.6), (90, 0, -8), 1)
finalize(ctrl)

# ------------------------------------------------------------------ light, shadow catcher, world
world = bpy.data.worlds.new("World"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.9, 0.88, 0.85, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.55
def area(name, loc, size, power, color=(1, 1, 1), size_y=None, aim=(0, 0, 6)):
    ld = bpy.data.lights.new(name, "AREA"); ld.energy = power; ld.color = color
    if size_y: ld.shape = "RECTANGLE"; ld.size = size; ld.size_y = size_y
    else: ld.size = size
    ob = bpy.data.objects.new(name, ld); ob.location = loc; STUDIO.objects.link(ob); ob.visible_camera = False
    ob.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); return ob
area("Key", (-30, -34, 30), 30, 26000)
area("Fill", (32, -28, 12), 26, 9000)
area("Back glow", (0, 30, 10), 22, 26000)
area("Rim L", (-26, 18, 16), 4, 9000, size_y=30)
area("Rim R", (26, 18, 16), 4, 9000, size_y=30)
area("Top", (0, -6, 44), 30, 9000, size_y=8)
bpy.ops.mesh.primitive_plane_add(size=300, location=(0, 0, 0)); sc = bpy.context.active_object; sc.name = "Shadow catcher"
link(sc, STUDIO); sc.is_shadow_catcher = True
vis(sc, [(124, N)])

# ------------------------------------------------------------------ cameras
def empty(name, loc, parent=None):
    e = bpy.data.objects.new(name, None); e.location = loc; STUDIO.objects.link(e)
    if parent: e.parent = parent
    return e
def camera(name, lens, fstop, target, keys):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.sensor_width = 36; cd.sensor_fit = "AUTO"
    cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop; cd.dof.focus_object = target; cd.clip_start = 0.3; cd.clip_end = 3000
    ob = bpy.data.objects.new(name, cd); STUDIO.objects.link(ob)
    t = ob.constraints.new("TRACK_TO"); t.target = target; t.track_axis = "TRACK_NEGATIVE_Z"; t.up_axis = "UP_Y"
    for f, l in keys: key(ob, f, l)
    finalize(ob); return ob
t_mid = empty("T mid", (0, 0, 6.2)); t_mac = empty("T macro", (3.0, -1.3, 7.0)); t_top = empty("T top", (0, 0, 8.2))
t_end = empty("T end", (0.6, 0, 7.4))
cams = {
 "S2": camera("Cam build", 46, 4.5, t_mid, [(124, (0, -40, 10)), (180, (0, -33, 9)), (266, (-6, -29, 8.4))]),
 "S3": camera("Cam macro", 55, 8.0, t_mac, [(267, (15.5, -4.0, 8.6)), (323, (13.0, -9.6, 6.2))]),
 "S4": camera("Cam birthday", 50, 4.0, t_top, [(324, (15, -25, 17)), (437, (9, -27, 12.5))]),
 "S5": camera("Cam banana", 40, 4.0, t_mid, [(438, (-8, -29, 2.2)), (552, (7, -28, 3.4))]),
 "S6": camera("Cam end", 46, 5.0, t_end, [(553, (9, -52, 15)), (640, (2.5, -41, 10.5)), (747, (0.4, -36, 9.2))]),
}
scene.timeline_markers.clear()
m = scene.timeline_markers.new("S1", frame=1); m.camera = cams["S2"]
for k, c in cams.items():
    m = scene.timeline_markers.new(k, frame=SH[k][0]); m.camera = c
scene.camera = cams["S2"]

# ------------------------------------------------------------------ render settings (owner's RTX 4060)
scene.render.engine = "CYCLES"; cy = scene.cycles
cy.samples = 72; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03
cy.use_denoising = True; cy.denoiser = "OPENIMAGEDENOISE"
cy.max_bounces = 12; cy.transmission_bounces = 12; cy.transparent_max_bounces = 16; cy.glossy_bounces = 6
scene.render.film_transparent = True; cy.film_transparent_glass = True
scene.render.use_motion_blur = True; scene.render.motion_blur_shutter = 0.5; scene.render.motion_blur_position = "START"
scene.render.resolution_x, scene.render.resolution_y = 1080, 1920
try: scene.view_settings.view_transform = "AgX"; scene.view_settings.look = "AgX - Base Contrast"
except Exception: pass
try: scene.render.image_settings.media_type = "VIDEO"
except Exception: pass
scene.render.image_settings.file_format = "FFMPEG"
ff = scene.render.ffmpeg; ff.format = "WEBM"; ff.codec = "WEBM"; ff.constant_rate_factor = "HIGH"; ff.ffmpeg_preset = "GOOD"; ff.audio_codec = "NONE"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = "//render/bbm_3d.webm"
try: cy.device = "GPU"
except Exception: pass

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(DIR, "BearbeMatcha_Ad.blend"), compress=True)
bpy.ops.file.make_paths_relative(); bpy.ops.wm.save_mainfile(compress=True)
print("SAVED")

if PREVIEW:
    cy.device = "CPU"; cy.samples = int(os.environ.get("PSAMPLES", "6")); cy.use_adaptive_sampling = False
    scene.render.resolution_percentage = int(os.environ.get("PPCT", "25"))
    try: scene.render.image_settings.media_type = "IMAGE"
    except Exception: pass
    scene.render.image_settings.file_format = "PNG"; scene.render.image_settings.color_mode = "RGBA"
    scene.render.use_motion_blur = False
    fr = os.environ.get("PFRAMES"); step = int(os.environ.get("PSTEP", "2"))
    frames = [int(x) for x in fr.split(",")] if fr else list(range(124, N + 1, step))
    for f in frames:
        scene.frame_set(f); scene.render.filepath = os.path.join(DIR, "preview", f"p{f:04d}.png"); bpy.ops.render.render(write_still=True)
    print("PREVIEW DONE", len(frames))
