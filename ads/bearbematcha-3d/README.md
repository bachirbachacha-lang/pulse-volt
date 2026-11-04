# Bear be matcha 3D drink ad (concept, 4 Nov)

25 s vertical (1080x1920, 30 fps) on "ski slopes" – Lex Amarni, in the style of the owner's two references
(Starbucks mock: bold colour backgrounds, wipes, splashes, typewriter + ring logo reveal; McDonald's concept: product builds itself, macro, light streaks).
Shown with Bear be matcha's permission; labelled "Concept ad by Pixel & Co.". Real logo, real menu names and prices (23 / 25 / 26 SAR), real ordering site on the phone.

- `build_bbm.py` – Blender scene: thin clear cup with the bear sticker, milk + matcha in one liquid (swirl boundary animated in the shader, level via boolean),
  ice, pour streams, foam cap, matcha powder burst, sprinkles, banana slices, the phone (from the Pixel & Co. phone model) playing `bbm_screen.mp4`.
  Transparent film → WebM VP9 with alpha. Full render on the owner's RTX 4060: ~20 s/frame, frames 124–747.
- `layers.html?layer=bg|fg` + `rec_layers.js` – 2D colour backgrounds, circle wipes, splashes, streaks / text, logo reveal, prices, end card.
- `compose.sh` – bg → 3D (PAD=123 when the render starts at frame 124) → fg, beat zoom kick, grain, song.
