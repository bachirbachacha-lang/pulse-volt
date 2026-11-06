"""Build configs for the AI vehicles (wheel axles from ground-contact clusters, paint from the picture)
and run finish_ai_car.py for each.  python batch_cars.py <glb_dir> <out_dir> [names...]"""
import sys, os, json, subprocess, glob
import numpy as np
from PIL import Image

GLB, OUT = sys.argv[1], sys.argv[2]
only = sys.argv[3:]
HERE = os.path.dirname(os.path.abspath(__file__))
# name: (Roblox name, length studs, wheel radius (AI units) or None, extra)
CARS = {
 "02_luxury_sedan":       ("LuxurySedan", 18.5, 0.145, {}),
 "03_luxury_offroad_suv": ("OffroadSUV", 17.4, 0.165, {}),
 "04_fullsize_pickup":    ("Pickup", 21, 0.14, {}),
 "05_muscle_car":         ("MuscleCar", 17.8, 0.16, {}),
 "06_everyday_sedan":     ("EverydaySedan", 17, 0.15, {}),
 "07_big_suv":            ("BigSUV", 20, 0.16, {}),
 "08_rusty_starter_car":  ("StarterCar", 15.3, 0.15, {}),
 "09_classic_1960s_car":  ("ClassicCar", 17.8, 0.12, {}),
 "13_flatbed_truck":      ("FlatbedTruck", 28, 0.125, {"generic": {"cabin": [-0.86, -0.5]}}),
 "14_cement_mixer_truck": ("MixerTruck", 32, 0.14, {"generic": {"cabin": [-1.0, -0.7]}}),
 "16_forklift":           ("Forklift", 12.5, 0.14, {"generic": {"glass": False}, "axles": [["F", -0.2688, -0.488, 0.14], ["R", 0.7391, -0.488, 0.14]]}),
 "17_gt63_style":         ("GTSedan", 17.8, 0.13, {}),
 "15_excavator":          ("Excavator", 34, None, {"generic": {"glass": True, "cabin": None}}),
}
import bpy  # only to read the glb quickly
from mathutils import Vector

def load_verts(f):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f)
    o = [o for o in bpy.data.objects if o.type == 'MESH'][0]
    n = len(o.data.vertices); co = np.empty(n * 3); o.data.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3); M = np.array(o.matrix_world); return co @ M[:3, :3].T + M[:3, 3]

def axles(co, r):
    zmin = co[:, 2].min(); xmax = np.abs(co[:, 0]).max()
    low = co[(co[:, 2] < zmin + 0.025) & (np.abs(co[:, 0]) > 0.55 * xmax)]
    ys = np.sort(low[:, 1]); groups = [[ys[0]]]
    for y in ys[1:]:
        (groups[-1].append(y) if y - groups[-1][-1] < 0.06 else groups.append([y]))
    groups = [g for g in groups if len(g) > 15]
    cs = sorted(float(np.mean(g)) for g in groups)
    # merge clusters closer than a wheel diameter
    m = []
    for c in cs:
        if m and c - m[-1][-1] < 1.6 * r: m[-1].append(c)
        else: m.append([c])
    cs = [float(np.mean(g)) for g in m]
    keys = ["F"] + (["S", "T", "U"][:max(0, len(cs) - 2)]) + (["R"] if len(cs) > 1 else [])
    return [[k, round(c, 4), round(float(zmin + r), 4), r] for k, c in zip(keys, cs)], float(xmax)

def paint(png):
    im = Image.open(png).convert("RGBA").resize((300, 300)); a = np.array(im).astype(float)
    m = a[..., 3] > 200; rgb = a[..., :3][m]
    lum = rgb.mean(1); sat = rgb.max(1) - rgb.min(1)
    body = rgb[(lum > 35) & (lum < 225)]
    if len(body) == 0: body = rgb
    # most common coarse colour bucket
    q = (body // 24).astype(int); keys, cnt = np.unique(q, axis=0, return_counts=True)
    top = keys[cnt.argmax()]; sel = body[(q == top).all(1)]
    c = sel.mean(0) / 255.0
    return [round(float(v) ** 2.2, 4) for v in c]  # sRGB -> linear

SRGB = {'02_luxury_sedan': (175, 160, 140), '03_luxury_offroad_suv': (25, 25, 28), '04_fullsize_pickup': (170, 80, 30), '05_muscle_car': (180, 20, 20), '06_everyday_sedan': (215, 215, 215), '07_big_suv': (225, 225, 228), '08_rusty_starter_car': (140, 170, 150), '09_classic_1960s_car': (30, 120, 120), '13_flatbed_truck': (235, 235, 235), '14_cement_mixer_truck': (235, 235, 235), '15_excavator': (230, 180, 20), '16_forklift': (235, 190, 20), '17_gt63_style': (70, 72, 78)}
os.makedirs(OUT, exist_ok=True)
manifest = {}
for stem, (nm, L, r, extra) in CARS.items():
    if only and not any(o in stem for o in only): continue
    f = os.path.join(GLB, stem + ".glb")
    co = load_verts(f)
    cfg = {"name": nm, "length_studs": L, "paint": ([round((c / 255) ** 2.2, 4) for c in SRGB[stem]] if stem in SRGB else paint(os.path.join(GLB, stem + "_cutout.png"))),
           "generic": {}, "work_tris": 120000}
    if r:
        ax, xmax = axles(co, r); cfg["axles"] = ax; cfg["x_inner"] = round(0.6 * xmax, 3)
    else:
        cfg["axles"] = []
    for k, v in extra.items():
        if k == "generic": cfg["generic"].update(v)
        else: cfg[k] = v
    manifest[nm] = {"len": L, "paint": SRGB.get(stem), "wheels": bool(r)}
    json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w"), indent=1)
    jp = os.path.join(OUT, nm + ".json"); json.dump(cfg, open(jp, "w"), indent=1)
    print("==", nm, "axles", [a[:2] for a in cfg["axles"]], "paint", cfg["paint"], flush=True)
    p = subprocess.run([sys.executable, os.path.join(HERE, "finish_ai_car.py"), f, OUT, jp],
                       capture_output=True, text=True, env={**os.environ, "SPP": os.environ.get("SPP", "16")})
    tail = [l for l in p.stdout.splitlines() if l.startswith(("PARTS", "DONE", "   (no"))]
    print("  ", tail, (p.stderr[-600:] if p.returncode else ""), flush=True)
