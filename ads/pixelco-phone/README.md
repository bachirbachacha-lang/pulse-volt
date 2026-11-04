# Pixel & Co. phone ad (Blender 3D, 4 Nov)

25 s vertical reel (1080x1920, 30 fps) on the owner's song pick **"ski slopes" – Lex Amarni** (from TikTok @_.escapismm._ 7666003117141396757; audio not committed).
Beat grid: first beat 0.30 s, period 0.9513 s, drop 4.11 s (`beats.py` → `beats-ski-slopes.json`).

Real Blender phone (`phone/build_phone.py`, the "PixelCo_Phone.blend" model) in six shots cut on beats:
A reveal (macro on lenses, light sweep, hook) · B drop (whip to front, SUHA café site, cards burst out) · C tilted hero ·
D phone flat, overhead orbit, LAYAN abayas, glossy floor · E low hero spin, GLAZE car care, teal kick · F Pixel & Co. end screen + CTA.
All three brands are fictional design samples; the video is labelled "3D render / Design samples".

## Pipeline
1. `screens.html?site=cafe|abaya|detail` – the new concept sites (deterministic `setTime`). `parts.html` – floating cards + `?end=1` end screen.
2. `node mk_track.js <dir>` – card PNGs + one 747-frame screen track following `timeline.json` → `ffmpeg … screen_track.mp4`.
3. `python3 build_ad.py -- base=PixelCo_Phone.blend dir=<dir> [preview=1]` – builds `PixelCo_Ad.blend` (Cycles, motion blur, DOF, markers for camera cuts).
   Full render on the owner's PC (RTX 4060, OptiX): ~8–11 s/frame → `render/pixelco_ad_3d.mp4`.
4. `node rec_overlay.js <dir>/overlay` – transparent kinetic-type layer (`overlay.html`).
5. `./compose.sh <render.mp4> <overlay dir> <song.wav> <out.mp4>` – beat zoom kick, grain, overlay, song with fade.
