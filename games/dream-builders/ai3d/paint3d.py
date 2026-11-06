"""Paint every AI car shape (ai3d/cars/*.glb) with real colours from its picture (Hunyuan3D-Paint, local GPU).
Output: ai3d/textured/<name>.glb (mesh reduced to 40k faces, 1024 px texture). Skips finished ones."""
import os, sys, glob, time, traceback
HOME = os.path.expanduser("~")
BASE = os.path.join(HOME, "Downloads", "DreamBuilders_models", "ai3d")
LOG = os.path.join(BASE, "paint3d_log.txt")
class Tee:
    def __init__(self, *f): self.f = f
    def write(self, s):
        for x in self.f:
            try: x.write(s); x.flush()
            except Exception: pass
    def flush(self):
        for x in self.f:
            try: x.flush()
            except Exception: pass
_logf = open(LOG, "w", encoding="utf-8")
sys.stdout = Tee(sys.__stdout__, _logf); sys.stderr = Tee(sys.__stderr__, _logf)
import faulthandler; faulthandler.enable(file=_logf, all_threads=True)
try:
    import torch, trimesh
    from PIL import Image
    SRC = os.path.join(BASE, "cars"); OUT = os.path.join(BASE, "textured"); os.makedirs(OUT, exist_ok=True)
    only = [a.lower() for a in sys.argv[1:]]
    shapes = sorted(glob.glob(os.path.join(SRC, "*.glb")))
    if only: shapes = [s for s in shapes if any(o in os.path.basename(s).lower() for o in only)]
    todo = [s for s in shapes if not os.path.exists(os.path.join(OUT, os.path.basename(s)))]
    print(f"{len(todo)} cars to paint -> {OUT}")
    import hy3dgen.texgen.pipelines as tp
    _init = tp.Hunyuan3DTexGenConfig.__init__
    def _small(self, *a, **k):
        _init(self, *a, **k); self.render_size = 1024; self.texture_size = 1024
    tp.Hunyuan3DTexGenConfig.__init__ = _small
    from hy3dgen.shapegen import FaceReducer
    print("Loading the paint AI (first time downloads a few GB)...")
    paint = tp.Hunyuan3DPaintPipeline.from_pretrained("tencent/Hunyuan3D-2", subfolder="hunyuan3d-paint-v2-0-turbo")
    try:
        paint.enable_model_cpu_offload()   # fits an 8 GB card
    except Exception as e:
        print("(offload off:", e, ")")
    reduce = FaceReducer()
    for i, s in enumerate(todo, 1):
        name = os.path.basename(s)[:-4]; t = time.time()
        print(f"\n[{i}/{len(todo)}] {name}")
        try:
            mesh = trimesh.load(s, force="mesh")
            mesh = reduce(mesh, max_facenum=40000)
            img = Image.open(os.path.join(SRC, name + "_cutout.png")).convert("RGBA")
            out = paint(mesh, image=img)
            out.export(os.path.join(OUT, name + ".glb"))
            print(f"   painted {name}.glb ({time.time() - t:.0f}s)")
        except Exception:
            traceback.print_exc(); print(f"   [X] {name} failed, moving on")
        torch.cuda.empty_cache()
    print("\nAll done. Tell Claude 'painted'.")
except SystemExit:
    pass
except BaseException:
    traceback.print_exc(); print("\n[X] paint3d crashed - Claude can read paint3d_log.txt")
