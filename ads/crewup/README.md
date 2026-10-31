# CrewUp reels (Reels Editor)
Logo: img/crewup-logo.png (owner-supplied). Brand from the owner's CrewUp brief: bg #090B10, blue #1F6BFF, orange #FF7A2F (streaks), gold #FFC83D (trophies), Sora/Montserrat ExtraBold + Tajawal for Arabic, @getcrewup.
One page, six cuts: `node record.js index.html <cut> <outDir>` with cut = day1 | nudge | lost | fake | excuses | showcase.
App screens are hand-built mockups labelled "APP PREVIEW · CONCEPT" until the owner screen-records the real app. Silent: add a trending sound in TikTok/CapCut.

## real.html: "screen recording" versions (more realistic)
Full-screen iPhone UI (390 pt canvas scaled to 1080x1920): iOS status bar, Dynamic Island, home indicator, lock screen, stacked notification banners, show-touches dots, haptic jiggle, native TikTok white text boxes. English only.
`node record.js real.html <cut> <outDir>` (same six cuts) -> ads/video/crewup-real-0N-<cut>.mp4.
Stock photos/video were blocked by the environment network policy (unsplash/pexels); swap in owner clips or real app recordings when available.

## Phone-from-outside + sound effects (crewup-phone-0N-*.mp4)
`EXTRA='&frame=1' node record.js real.html <cut> <out>` puts the iPhone screen inside a 3D-tilting phone on the blue CrewUp background, text above the phone, phone bumps on every notification/buzz. record.js also saves <out>/sfx.json (cue list).
`python3 sfx.py <out> <out>.wav` builds the sound track (all sounds synthesized: notification "ba-bum", vibration buzz, taps, swooshes, chat pops, win jingle, fail, logo chord), then mux: `ffmpeg -framerate 30 -i <out>/f%05d.jpg -i <out>.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -shortest ...`.

## Motion-design ads (crewup-motion-0N-*.mp4), same styles as the Scalp Elixir / Pixel & Co. motion sets
- m-glow.html: dark room + glowing screen (challenge, streak, nudge toast), kinetic "Challenge. Check in. Nudge.", logo reveal.
- m-3d.html: Three.js fly-through past Bronze/Silver/Gold/Diamond badges to a gold trophy with orbiting dumbbells (logo via img/logo-data.js because file:// blocks image textures).
- m-type.html: kinetic type: gym group-chat excuses blown away, crew network draws itself, Challenge · Check in · Nudge · Win, logo.
- m-depth.html: CSS 3D phone with floating cards for the 4 brief steps, parallax background.
Render: `node record.js m-<x>.html x <out>` then `python3 sfx.py <out> <out>.wav` and mux. No whoosh sounds (owner, 27 Oct): sfx.py mutes swoosh/swipe.

## Keynote-style ads (crewup-keynote-0N-*.mp4), from the owner's 28 Oct reference (clean kinetic type + widgets)
k.html, `?cut=light|dark|blue`: letter-drop kinetic text, CrewUp widgets (streak, crew gauge, rank, steps, nudge) with blur-morph, check-in mosaic around a question, glass widgets over a parallax sky (day / night / sunset), logo frame, end line. All shapes are CrewUp's own (no Apple watch/health designs). Mosaic tiles use emoji placeholders until the owner sends real gym photos.

## Adding the owner's song
`python3 music.py <video.mp4> <song> <out.mp4> [--cues <render>/sfx.json] [--hit 12.65] [--start 30] [--no-sfx]`
Picks the loudest stretch of the song as long as the video, shifts it so a real beat lands on the logo moment (or --hit), fades in/out, ducks the song under the reel's sound effects. Tested with a 128 BPM test track: beat landed within ~15 ms.
Silent copies for editing in CapCut/TikTok: ads/video/music-ready/*-silent.mp4.

## Beat-synced trailer (crewup-trailer-beat.mp4), from the owner's 28 Oct references (inDrive/Spotify/Liner-style concept edits)
t.html: dark glow background that pulses with the song's onsets, CSS-3D phone playing clean app recordings (real.html with &notext=1, copied to frames-trailer/ at 540x960, not committed), word-per-beat kinetic lines, 3D mosaic of screens, NOT COUNTED stamp on the beat, rank chips, "Free. No excuses. No skipping.", dot -> ring -> logo build.
img/trailer-beat.js = beat grid + per-frame onset energy from the owner's song (the audio of their 4th reference video, ~129 BPM). Every scene starts on a beat index B(n).

## X reels (crewup-x-*.mp4): full 3D renders on the owner's song (29 Oct, "extreme advanced")
Folder `x/`. Shared engine `x/common.js` (three.js r128 + GSAP, everything seeked frame by frame):
- HDR pipeline: half-float render target with a 24-bit depth buffer -> HDR bloom -> optional depth-of-field gather -> grade pass (soft-shoulder tone curve that keeps UI colours exact, saturation/contrast, vignette, grain, lens fringing that kicks on the beat, real camera motion blur from the camera's own movement) -> FXAA.
- Realistic phones (bevelled metal frame, black glass with reflection-only coating, island, camera bump), mirror floor, studio soft-box reflections, glow points (sparks/trails), floor outlines, volumetric cones, dust, camera rig with chase mode and shake, favourite ending (`X.ending(40)`).
- UI textures: `x/ui.html` -> `BASE=http://127.0.0.1:8765/ node x/snap.js` -> `x/tex/*.png` (3x, real fonts, transparent corners).
Reels (all 24.5 s, beat grid from img/trailer-beat.js, label "3D RENDER · APP CONCEPT"):
- `x/nudge.html`: four crew phones on black glass, three check in on the drop, Faisal sleeps, you tap Nudge, a light comet crosses the table (chase cam), his phone wakes, live photo check-in, 4/4 top view with light beams.
- `x/streak.html`: every check-in lights a numbered day tile, a burning fuse runs tile to tile, day 22 goes cold (excuses, counter hits 0), the crew's three nudge comets save it, the 30 days turn out to draw the CrewUp logo.
- `x/season.html`: 3D crew leaderboard (you climb #4 -> #1), holographic player card levelling Bronze -> Silver -> Gold -> Diamond on the beats, podium, spotlights, trophy, confetti, Faisal (last) buys the coffee.
- `x/simple.html` (+ `x/simple-wide.html`, 1920x1080 via `window.X_SIZE` and `W=1920 H=1080` for record.js): CrewUp remake of the owner's reference concept ad, light keynote UI on the reference's cut times (27.1 s, reference audio, beat grid img/simple-beat.js).
- `x/exact.html` (1920x1080; render with `W=1920 H=1080`): rebuild of the owner's reference ad itself (dnyxstudios' "Stocks" concept), made at the owner's request ("the same exact one", creator's permission): same shots, text and cut times, muxed with the original soundtrack (music + AI voice) cut at 23.0 s, before TikTok's outro: ads/video/stocks-concept-rebuild.mp4. Not a CrewUp ad. Vertical cut (1080x1920, same timeline): `x/exact-v.html` -> ads/video/stocks-concept-rebuild-vertical.mp4.
- `x/coffee.html` (1920x1080; render with `W=1920 H=1080`; for the 1080x1920 cut add `?v=1`, i.e. `EXTRA='&v=1' W=1080 H=1920`): rebuild of @olaf.motion's "Claude Opus 5.5" concept video at the owner's request (the owner says the creator OK'd it): same scenes, words and cut times, 29.3 s, silent (the song is not the creator's to give). Everything else that was not theirs is our own: "John Doe" placeholder post, every clip on the wall drawn here, a ray-marched 3D runner instead of the photo, a plain asterisk instead of Claude's logo, our own pixel coffee-cup mascot, hands drawn here, a "concept by @olaf.motion" credit instead of their memoji. -> ads/video/claude-concept-rebuild.mp4 and claude-concept-rebuild-vertical.mp4. Not an ad for our brands. New fonts for it (OFL, licences in fonts/): Outfit, Newsreader, Sora 400.
- `x/words.html` (1080x1920, 24 s, silent): our own Claude fan ad, "It starts with words." Hook "This video started as one prompt." -> the prompt bursts into 70k particles that are all letters (a glyph atlas on point sprites, morphs between shapes on the GPU) -> galaxy -> thinking sphere -> phone "apps." -> city "worlds." -> book "stories." -> chart "plans." -> code "code." -> the letters spell "It starts with words." -> end card "Claude / Made from one prompt." with "not an official Anthropic ad". Renders with `ss: 1.5` (new X.three option: supersampling, the browser scales it down) -> ads/video/claude-words-ad.mp4.
- `vo/vo.py`: text-to-speech voice-over for any silent video, one line per caption at its own time (`vo/words-lines.json` is the Claude ad's). Voice: Kokoro-82M (open model, Apache-2.0, OK for commercial use), runs locally, no API key; setup is in the script's header. Levels to -15 LUFS / -1.5 dBTP. -> ads/video/claude-words-ad-voice.mp4 (af_heart, warm female) and claude-words-ad-voice-male.mp4 (am_michael).
- `x/how.html`: "How CrewUp works" in the same keynote look on song4: "Me, every gym day:" alarm snoozed on 3 beats, "Unless your crew is waiting.", then the brief's 4 steps with numbered headers (challenge card: crew, goal, loser's punishment; 3D phone check-in with the shutter on the big hit; crew list -> Nudge -> Faisal's lock screen gets it -> he checks in, 4/4; player card flips Bronze -> Diamond, crew ranks, coffee tag), favourite ending with the end block raised into the safe area.
Render: serve the folder (`cd ads/crewup && python3 -m http.server 8765 --bind 127.0.0.1`), then `BASE=http://127.0.0.1:8765/ node record.js x/<reel>.html x <outDir>` (~2.5-4 s/frame with SwiftShader), then mux the song:
`ffmpeg -framerate 30 -i <outDir>/f%05d.jpg -i song4.wav -filter_complex "[1:a]atrim=0:24.5,asetpts=PTS-STARTPTS,afade=t=out:st=23.6:d=0.9[a]" -map 0:v -map "[a]" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest out.mp4`
(song4.wav = audio of the owner's 4th reference video; not committed.)
