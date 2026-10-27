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
