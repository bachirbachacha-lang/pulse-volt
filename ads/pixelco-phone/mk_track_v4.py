"""mk_track_v4.py <dir> : 747-frame phone screen track for the v4 portfolio cut (780x1688 JPEGs in <dir>/track, f0000 = Blender frame 1).
Each shot shows a different real project; content changes only on camera cuts, so the switch is invisible.
Needs: <dir>/bbmframes (Bear be matcha, time-remapped), <dir>/crew/m*.png (CrewUp screens), <dir>/black.jpg, <dir>/endframes (v3 end-screen frames)."""
import os, sys, subprocess, shutil, glob
from PIL import Image
D = sys.argv[1]; SAMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../pixel-co/samples")
OUT = os.path.join(D, "track"); os.makedirs(OUT, exist_ok=True)
W, H = 780, 1688
def tgt(i): return os.path.join(OUT, f"f{i:04d}.jpg")
def video(i0, i1, src, s0, speed, fit=False):
    n = i1 - i0 + 1; tmp = os.path.join(D, "tmp_seg"); shutil.rmtree(tmp, True); os.makedirs(tmp)
    sc = f"scale={W}:-2:flags=lanczos,pad={W}:{H}:0:(oh-ih)/2:black" if fit else f"scale={W}:{H}:flags=lanczos"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(s0), "-i", os.path.join(SAMP, src), "-vf",
                    f"setpts=(PTS-STARTPTS)/{speed},fps=30,{sc}", "-frames:v", str(n), "-q:v", "2", os.path.join(tmp, "s%04d.jpg")], check=True)
    got = sorted(glob.glob(tmp + "/s*.jpg"))
    for k in range(n): shutil.copyfile(got[min(k, len(got) - 1)], tgt(i0 + k))
def bbm(i0, i1, k0):
    for k, i in enumerate(range(i0, i1 + 1)): shutil.copyfile(os.path.join(D, "bbmframes", f"b{min(428, k0 + k):04d}.jpg"), tgt(i))
def still(i0, i1, frames):
    """frames: list of (png, from_frame_offset, scroll_px_start, scroll_px_end); horizontal slide between consecutive screens over 5 frames"""
    n = i1 - i0 + 1
    ims = [Image.open(os.path.join(D, "crew", p)).convert("RGB").resize((W, H), Image.LANCZOS) for p, *_ in frames]
    for k in range(n):
        j = max(x for x, f in enumerate(frames) if f[1] <= k)
        p, a, y0, y1 = frames[j]; b = frames[j + 1][1] if j + 1 < len(frames) else n
        u = (k - a) / max(1, b - a); y = int(y0 + (y1 - y0) * u)
        im = ims[j]
        if k - a < 5 and j > 0:  # slide in from the right
            e = 1 - (1 - (k - a + 1) / 5) ** 3
            fr = Image.new("RGB", (W, H)); fr.paste(ims[j - 1], (int(-W * e), 0)); fr.paste(im, (int(W * (1 - e)), 0)); im = fr
        im.save(tgt(i0 + k), quality=92)
N = 747
for i in range(0, 123): shutil.copyfile(os.path.join(D, "black.jpg"), tgt(i))
bbm(123, 151, 8)                                                   # B1  drop: Bear be matcha hero builds
bbm(152, 179, 176)                                                 # B2  Bear be matcha menu
video(180, 237, "watch-ultra/video/torq-ultra-phone.mp4", 6.3, 2.8)  # B3  TORQ Ultra: bpm -> activity rings
video(238, 322, "detailing-cinematic/video/lustre-phone.mp4", 1.45, 2.3, fit=True)  # B4 LUSTRE hero
video(323, 379, "samra/video/samra-phone.mp4", 0.3, 2.4)           # D1  SAMRA hero -> collection
video(380, 436, "watch-luxe/video/torq-atelier-phone.mp4", 18.2, 2.4)  # D2 TORQ Atelier showroom
still(437, 493, [("m0.png", 0, 0, 0)])                              # E1  CrewUp home
still(494, 551, [("m3.png", 0, 0, 0), ("m4.png", 30, 0, 0)])        # E2  CrewUp crew battle -> profile
for i in range(552, N): shutil.copyfile(os.path.join(D, "endframes", f"f{i:04d}.jpg"), tgt(i))
shutil.rmtree(os.path.join(D, "tmp_seg"), True)
print("track frames", len(os.listdir(OUT)))
