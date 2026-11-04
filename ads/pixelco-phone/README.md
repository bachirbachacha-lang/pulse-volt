# Pixel & Co. phone ad (Blender 3D)

25 s vertical reel (1080x1920, 30 fps) on the owner's song pick **"ski slopes" – Lex Amarni** (from TikTok @_.escapismm._ 7666003117141396757; audio not committed).
Beat grid: first beat 0.30 s, period 0.9513 s, drop 4.11 s (`beats.py` → `beats-ski-slopes.json`). 15 s cut-down: `../cut15.sh`.

## Current version: v3 (4 Nov) – one real client, Bear be matcha
Owner feedback on v1: too slow, no SUHA; later: drop LAYAN and GLAZE, focus on Pixel & Co. + Bear be matcha.
So v3 shows only the real Bear be matcha site (recording `pixel-co/samples/bearbematcha-v4/video/`, shown with the shop's permission)
on the real Blender phone, with a cut every 1–2 beats:

| shot | frames | what happens |
|---|---|---|
| A | 1–123 | back of the phone rises out of the dark, macro on the lenses, hook "عندك متجر بدون موقع؟" |
| B1–B4 | 124–323 | DROP: whip to the front, site boots on the beat, drink cards burst out, push-ins and orbits (chip 01 المنيو) |
| D1–D2 | 324–437 | phone flat, overhead, cards rise; corner macro on the price (chip 02 سوّ كوبك) |
| E1–E2 | 438–552 | low hero: whip spin on the cut that settles before the first word, push-in, cards burst (chip 03 الطلب) |
| F | 553–747 | push-out from the Pixel & Co. end screen + CTA "نسوّي لمتجرك موقع" / Free sample / @pixelandco.design |

Files: `timeline_v3.json` (screen track; the site starts 0.2 s in so the hero builds on the drop), `build_ad_v3.py`, `overlay_v3.html`.

## Pipeline
1. `parts.html` – drink cards (`#cards2`) + `?end=1` end screen. Site frames: `<dir>/bbmframes/b0001.jpg…b0428.jpg` (780x1688, time-remapped from the recording).
2. `TL=timeline_v3.json BBMN=428 node mk_track.js <dir>` – card PNGs + the 747-frame screen track →
   `ffmpeg -framerate 30 -i <dir>/track/f%04d.jpg -c:v libx264 -crf 14 -pix_fmt yuv420p <dir>/screen_track.mp4`.
3. `python3 build_ad_v3.py -- base=PixelCo_Phone.blend dir=<dir> [preview=1]` – builds `<dir>/PixelCo_Ad.blend`
   (Cycles 96 spp adaptive, OIDN, motion blur, DOF, camera cuts on markers). Preview env: `PSTEP PSAMPLES PPCT PBLUR PFRAMES`.
4. Full render on the owner's PC (RTX 4060, OptiX; v1 ran ~8–11 s/frame), folder `C:\Users\PC\Downloads\PixelCo_Ad2\`
   (PixelCo_Ad.blend, screen_track.mp4, cards\, pc_start.py, pc_encode.py). In Blender's Python console:
   - `bpy.ops.wm.open_mainfile(filepath=r"C:\Users\PC\Downloads\PixelCo_Ad2\PixelCo_Ad.blend", load_ui=False)`
   - `exec(open(r"C:\Users\PC\Downloads\PixelCo_Ad2\pc_start.py").read())` → PNG frames in `render\frames\`.
     Resumable: overwrite is off, so after a stop (Esc) the same line continues from the first missing frame.
   - when all 747 frames exist: `exec(open(r"C:\Users\PC\Downloads\PixelCo_Ad2\pc_encode.py").read())` → `render\pixelco_ad_3d.mp4`.
5. `OV=overlay_v3.html node rec_overlay.js <dir>/overlay` – transparent kinetic-type layer (747 PNGs).
6. `./compose.sh <render.mp4 | preview:<dir>/preview> <overlay dir> <song.wav> <out.mp4>` – beat zoom kick, grain, overlay, song with fade.

Honesty: the video is labelled "3D render / Design sample"; the end card is Pixel & Co.'s own offer. No prices for Pixel & Co. packages.

## Older versions
v1 (`build_ad.py`, `overlay.html`, `timeline.json`, `screens.html`): three fictional brands (SUHA café, LAYAN abayas, GLAZE car care). v2 (`build_ad_v2.py`): faster cuts. Both superseded.
