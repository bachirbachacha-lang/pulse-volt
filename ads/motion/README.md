# Motion videos (Reels Editor)
- glow.html: dark room, glowing screen concept (GSAP timeline). `node record.js glow.html x <out>`
- three.html: Three.js + GSAP. `?cut=fly` scroll-style camera fly-through (layered sprigs = depth/parallax, light beams, soft shadows, drop + ripple); `?cut=wave` wavy dot surface, sweeping beams, kinetic words, self-building 50 ml ring, bottle rises.
  Opened normally in a browser (no `record` in the URL) the page scrolls and ScrollTrigger scrubs the same timeline.
- frames/ (not committed): copy ads/reels-src/frames/spin_*.jpg (3D spin crop) for glow.html.
- Encode: `ffmpeg -framerate 30 -i <out>/f%05d.jpg -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart ads/video/<name>.mp4`
