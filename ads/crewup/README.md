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
