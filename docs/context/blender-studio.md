# Blender Studio (3D models, product renders, 3D motion ads)
Read owner.md first.

## What's been made
- Realistic 3D phone for edits: `ads/pixelco-phone/phone/build_phone.py` → PixelCo_Phone.blend (also in the owner's Downloads).
- Bear be matcha 3D drink ad (DONE 4 Nov, final 25 s + 15 s sent in chat): `ads/bearbematcha-3d/` (build_bbm.py → BearbeMatcha_Ad.blend, layers.html for 2D text/backgrounds, compose.sh, ../cut15.sh). Rendered on the PC GPU: ~18–22 s/frame.
- Pixel & Co. phone ad: `ads/pixelco-phone/`. v4 (current) = portfolio cut mixing the owner's real work (Bear be matcha real client, TORQ Ultra, LUSTRE, SAMRA, TORQ Atelier, CrewUp), bilingual: big English + Arabic under. Files: mk_track_v4.py (screen track), build_ad_v4.py, overlay_v4.html. Preview sent 4 Nov; NOT rendered yet. Fix before render: TORQ Atelier corner macro (~13 s) crops text badly. v3 (all Bear be matcha) is superseded: the owner said don't only use Bear be matcha and don't only use Arabic.
- Song for both ads: "ski slopes" – Lex Amarni (from TikTok, not committed). Beat grid: beat0 0.30 s, period 0.9513 s, drop 4.11 s.

## How renders run
- Heavy renders on the owner's PC (RTX 4060, Cycles OptiX). The cloud box is only for previews (2 CPUs).
- PC render is resumable: PNG frames with overwrite off. In Blender's Python console:
  `bpy.ops.wm.open_mainfile(filepath=r"C:\Users\PC\Downloads\PixelCo_Ad2\PixelCo_Ad.blend", load_ui=False)` then
  `exec(open(r"C:\Users\PC\Downloads\PixelCo_Ad2\pc_start.py").read())`; when done `exec(open(r"...\pc_encode.py").read())`.
  For v4, copy the ad4 build (PixelCo_Ad.blend, screen_track.mp4, cards/) to the PC first.
- The PC is loud (fans never cleaned, 3 years): let it rest between long renders, ask before starting one.
- New Mac (MacBook Air M5, ordered): Blender runs natively on Apple Silicon (Cycles uses Metal). Fanless Air = slower and gets warm on long renders; keep the PC for big renders.

## Rules
- Label 3D/AI work "3D RENDER" / "Concept". Real brands only with their permission (Bear be matcha: yes). No BREATH or Qamaria visuals (no permission). Never the PURC bottle photo on the black table.
- Avoid "·" next to Arabic digits (reads as a zero).
