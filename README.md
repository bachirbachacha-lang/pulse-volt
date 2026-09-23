# PULSE: brand site

Scroll-driven 3D showcase for **PULSE**: Arctic Rush zero-sugar energy, plus PULSE Sparkling (Citrus, Mango, Berry, Watermelon).

## Run it

It's a static site with no build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly from disk (file://) won't work, because browsers block ES modules there.

## How it's built

- `index.html`: all page content. Each chapter has a `data-stage` number.
- `js/main.js`: the Three.js scene. `STAGES` holds a keyframe per chapter (can positions, rotations, background colors), and scrolling blends between them.
- `js/labels.js`: draws every can label in code on a canvas. Edit flavors, copy or colors here.
- `css/style.css`: layout, type and the portrait/mobile layout.
- `js/vendor/three.min.js`: bundled Three.js (MIT).
- `assets/fonts`: self-hosted Anton, Archivo and Permanent Marker (SIL OFL).

Add a flavor by adding it to `FLAVORS` and `CAN_IDS` in `main.js`, giving it a keyframe in each stage, drawing its fruit in `labels.js`, and adding a section in `index.html`.

The email form isn't connected to anything yet. Hook it up to Mailchimp, ConvertKit, Formspree or similar before launch.

Respects `prefers-reduced-motion`, and falls back to the campaign photos when WebGL isn't available.
