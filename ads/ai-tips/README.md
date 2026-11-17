# Pixel & Co. AI-tips reels (16–17 Nov 2026)

10 reels made (light: r1–r7, dark: r8–r10). Finished MP4s are on the owner's PC: Downloads\PixelCo_Ad5\FINAL.
Captions + 10-day posting plan: pixelco_captions.md.

Pipeline: specs/<name>.json → make.py (Chatterbox voice, word-by-word Whisper check, timing) → t.html template (GSAP, mascot, captions, SFX cues) → rec.js (Playwright frames) → fx.py (synth SFX) → ffmpeg mix.
Setup: python venv with torch 2.6 CPU + chatterbox-tts + faster-whisper; node playwright; serve this folder on 127.0.0.1:8767; mascot frames m/talk_XX.png, m/idle_XX.png cut from mascot/*_sheet.png (10x6 grid of 600 px, resized to 420).

## Where we stopped (17 Nov, owner went to sleep)
- Owner liked the reels but wants a slightly deeper, steadier male voice. Approved direction: the blend between Kokoro am_fenrir and am_onyx (voice-ref/mid.wav as Chatterbox audio prompt, exaggeration 0.4, cfg 0.5). Sample: voice-ref/s_mid.wav. He had not confirmed the blend yet.
- Next: run make_v2.py on all 10 specs (posting order: r1, r9, r2, r10, r3, r5, r8, r4, r6, r7) → out2/, send each, save to the PC FINAL folder.
- Blender ad v5 (English phone ad) is finished; its sources are in blender-ad-v5/.
