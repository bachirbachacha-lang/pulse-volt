# pc_encode.py: after every frame is rendered, join //render/frames/pc_####.png into //render/pixelco_ad_3d.mp4
# inside Blender (the PC has no ffmpeg on PATH). Run in the Python console of the open PixelCo_Ad.blend:
#   exec(open(r"C:\Users\PC\Downloads\PixelCo_Ad2\pc_encode.py").read())
import bpy, os
src = bpy.context.scene
base = bpy.path.abspath("//render/frames")
want = [f"pc_{i:04d}.png" for i in range(src.frame_start, src.frame_end + 1)]
missing = [f for f in want if not os.path.exists(os.path.join(base, f)) or os.path.getsize(os.path.join(base, f)) < 1024]
if missing:
    raise RuntimeError(f"{len(missing)} frames still missing, first: {missing[:3]}. Run pc_start.py again to finish them.")
sc = bpy.data.scenes.get("Encode") or bpy.data.scenes.new("Encode")
sc.render.fps = src.render.fps
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, 100
sc.frame_start, sc.frame_end = 1, len(want)
se = sc.sequence_editor_create()
coll = se.strips if hasattr(se, "strips") else se.sequences  # Blender 5 renamed sequences -> strips
for s in list(coll): coll.remove(s)
strip = coll.new_image("frames", os.path.join(base, want[0]), 1, 1)
for f in want[1:]: strip.elements.append(f)
sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"  # frames are already display-ready (AgX baked in)
try: sc.render.image_settings.media_type = "VIDEO"
except Exception: pass
sc.render.image_settings.file_format = "FFMPEG"
ff = sc.render.ffmpeg
ff.format = "MPEG4"; ff.codec = "H264"; ff.constant_rate_factor = "PERC_LOSSLESS"; ff.ffmpeg_preset = "GOOD"; ff.audio_codec = "NONE"
sc.render.filepath = bpy.path.abspath("//render/pixelco_ad_3d.mp4")
bpy.context.window.scene = sc
bpy.ops.render.render("INVOKE_DEFAULT", animation=True)
print("encoding", len(want), "frames ->", sc.render.filepath)
