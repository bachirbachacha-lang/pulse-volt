# PULSE: brand site

Scroll-driven 3D showcase and shop for **PULSE**:

- **PULSE Energy** (500 mL, zero sugar, 160 mg caffeine): Arctic Rush, Solar Flare, Venom, Cherry Bomb, Night Drive
- **PULSE Sparkling** (330 mL clear cans, real fruit, caffeine free): Citrus, Mango, Berry, Watermelon

## Run it

It's a static site with no build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly from disk (file://) won't work, because browsers block ES modules there.

## How it's built

- `js/products.js`: **flavors, prices, pack sizes, ingredients and nutrition.** Edit this file to change what the site sells.
- `js/ui.js`: energy flavor switcher, buy boxes, nutrition panels, shop grid and cart (saved in the visitor's browser).
- `index.html`: all page content. Each chapter has a `data-stage` number.
- `js/main.js`: the Three.js scene. `STAGES` holds a keyframe per chapter (can positions, rotations, background colors), and scrolling blends between them.
- `js/labels.js`: draws every can label in code: the five energy designs and the clear sparkling labels.
- `css/style.css`: layout, type and the portrait/mobile layout.
- `js/vendor/three.min.js`: bundled Three.js (MIT).
- `assets/fonts`: self-hosted Anton, Archivo and Permanent Marker (SIL OFL).

Add an energy flavor by adding it to `ENERGY` in `products.js` and giving it a design in `ENERGY_ART` in `labels.js` (plus a lineup spot in `main.js`). The switcher, shop and cart pick it up automatically.

**Before launch:** the nutrition values, caffeine content and ingredient lists are a working recipe. Replace them with your lab-tested values, and check the labelling rules where you sell. Prices are in USD (`CURRENCY` in `products.js`). The cart has no checkout behind it yet; connect Shopify, Stripe Checkout or similar.

The email form isn't connected to anything yet either. Hook it up to Mailchimp, ConvertKit, Formspree or similar before launch.

Respects `prefers-reduced-motion`, and falls back to the campaign photos when WebGL isn't available.
