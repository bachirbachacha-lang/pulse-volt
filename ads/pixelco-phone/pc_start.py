# pc_start.py: start (or resume) the Pixel & Co. frame render on the owner's PC, inside Blender.
# 1) Blender Python console:  bpy.ops.wm.open_mainfile(filepath=r"C:\Users\PC\Downloads\PixelCo_Ad2\PixelCo_Ad.blend", load_ui=False)
# 2) then:                    exec(open(r"C:\Users\PC\Downloads\PixelCo_Ad2\pc_start.py").read())
# Frames go to //render/frames/pc_0001.png ... pc_0747.png. Overwrite is off, so running this again after a stop
# continues from the first missing frame. Stop any time with Esc in the render window.
import bpy, os
sc = bpy.context.scene
cp = bpy.context.preferences.addons["cycles"].preferences
for kind in ("OPTIX", "CUDA"):
    try:
        cp.compute_device_type = kind; cp.get_devices()
        gpus = [d for d in cp.devices if d.type == kind]
        if gpus:
            for d in cp.devices: d.use = d.type == kind
            break
    except Exception as e: print("device", kind, e)
sc.cycles.device = "GPU"
sc.render.use_overwrite = False; sc.render.use_placeholder = False
out = bpy.path.abspath("//render/frames")
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):  # drop any empty or partial file so it is rendered again
    p = os.path.join(out, f)
    if f.endswith(".png") and os.path.getsize(p) < 1024: os.remove(p)
done = len([f for f in os.listdir(out) if f.startswith("pc_") and f.endswith(".png")])
print("Pixel & Co.: device", cp.compute_device_type, "| frames already done:", done, "of", sc.frame_end - sc.frame_start + 1)
bpy.ops.render.render("INVOKE_DEFAULT", animation=True)
