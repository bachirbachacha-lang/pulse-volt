"""Dream Builders: turn every *_exterior.png vehicle picture into a 3D model (.glb).
Runs Hunyuan3D-2 shape generation on the local NVIDIA GPU. Skips cars that are already done.
Usage: make3d.cmd            -> all vehicles
       make3d.cmd hypercar   -> only names containing 'hypercar'
"""
import os, sys, glob, time, traceback
import torch
from PIL import Image

HOME = os.path.expanduser("~")
SRC = os.path.join(HOME, "Downloads", "DreamBuilders_concepts", "vehicles")
OUT = os.path.join(HOME, "Downloads", "DreamBuilders_models", "ai3d")
os.makedirs(OUT, exist_ok=True)
only = [a.lower() for a in sys.argv[1:]]

from hy3dgen.rembg import BackgroundRemover
from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline, FloaterRemover, DegenerateFaceRemover

pics = sorted(glob.glob(os.path.join(SRC, "*_exterior.png")))
if only:
    pics = [p for p in pics if any(o in os.path.basename(p).lower() for o in only)]
todo = [p for p in pics if not os.path.exists(os.path.join(OUT, os.path.basename(p).replace("_exterior.png", ".glb")))]
print(f"{len(pics)} vehicle pictures, {len(todo)} still to make -> {OUT}")
if not todo:
    sys.exit(0)

print("Loading the AI (first time downloads the model, a few GB)...")
pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained("tencent/Hunyuan3D-2", subfolder="hunyuan3d-dit-v2-0")
try:
    pipe.enable_flashvdm()
except Exception as e:
    print("(flashvdm off:", e, ")")
rembg = BackgroundRemover()

for i, p in enumerate(todo, 1):
    name = os.path.basename(p).replace("_exterior.png", "")
    t = time.time()
    print(f"\n[{i}/{len(todo)}] {name}")
    try:
        img = Image.open(p).convert("RGB")
        cut = rembg(img)                       # remove the city background
        bbox = cut.getchannel("A").point(lambda a: 255 if a > 20 else 0).getbbox()
        if bbox:
            cut = cut.crop(bbox)
        w, h = cut.size; s = int(max(w, h) * 1.15)
        sq = Image.new("RGBA", (s, s), (255, 255, 255, 0)); sq.paste(cut, ((s - w) // 2, (s - h) // 2))
        sq.save(os.path.join(OUT, name + "_cutout.png"))
        mesh = pipe(image=sq, num_inference_steps=50, octree_resolution=380, num_chunks=20000,
                    generator=torch.manual_seed(1234), output_type="trimesh")[0]
        mesh = FloaterRemover()(mesh)
        mesh = DegenerateFaceRemover()(mesh)
        mesh.export(os.path.join(OUT, name + ".glb"))
        print(f"   saved {name}.glb  ({len(mesh.faces)} faces, {time.time() - t:.0f}s)")
    except Exception:
        traceback.print_exc()
        print(f"   [X] {name} failed, moving on")
    torch.cuda.empty_cache()
print("\nAll done. Tell Claude 'done'.")
