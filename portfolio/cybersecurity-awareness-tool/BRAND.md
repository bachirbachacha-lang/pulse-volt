# Brand: Latchlight

Everything here is original work made for this project. `reference-style.png` was used for direction only (a security awareness dashboard with a side menu, charts and training cards). The name, colours, fonts, logo and pictures are different from it on purpose: the reference is pale blue with a shield logo, a rounded font and photos of people; Latchlight is pine green and warm paper with a keyhole mark, a different pair of fonts and no photos at all.

## Name

**Latchlight**. A latch keeps the door shut. A light lets you see who is knocking.

- Tagline: **Look twice. Click once.**
- How to write it: one word, capital L only. Not "LatchLight", not "Latch Light".
- The helper on the dashboard is called **the coach**. It has no human name and no face.
- Name check: one quick web search on 14 Nov 2026 ("Latchlight" security awareness app) found no security awareness product with this name. That is not a trademark check. The owner should check properly before any public use.

Other names I considered, if you want to change it (decision D1 in PLAN.md): Second Look, Porchlamp, Keyleaf.

## Voice

Calm, short, kind. Like an older student who knows this stuff and does not show off.

- Say: "This sender address does not match the name." Not: "Spoofed display-name vector detected."
- Never scare, never shame. Getting one wrong is how the exercise teaches.
- Say "sample" wherever something is sample. Never call the coach AI.

## Colours

| Name | Hex | Used for |
|---|---|---|
| Pine | `#1E6B57` | Main buttons, active menu item, logo, "safe" |
| Pine dark | `#134537` | Text on pale pine |
| Pine pale | `#DCEFE8` | Soft highlights, done tags |
| Marigold | `#E8A33A` | The "light": chart accent, logo rays, focus on dark. Never as text on paper. |
| Marigold dark | `#6F4400` | Text on pale marigold |
| Marigold pale | `#FBEBCB` | "Sample" tags, in-progress tags |
| Clay | `#B23A2B` | "Phish" button, wrong answers, weak password |
| Clay dark | `#7F2318` | Text on pale clay |
| Clay pale | `#F8E0DB` | Warning backgrounds |
| Ink | `#17231F` | Main text, side menu background |
| Moss grey | `#55635D` | Secondary text |
| Paper | `#F7F4EC` | Page background |
| Linen | `#EEE9DC` | Input backgrounds, chart tracks |
| Line | `#DDD6C5` | Borders |
| White | `#FFFFFF` | Cards |

### Contrast (calculated in this session with the WCAG formula)

4.5 or more passes for normal text. The script is short: turn each colour into a brightness number, then divide the lighter by the darker.

| Text | Background | Ratio | Pass |
|---|---|---|---|
| Ink | Paper | 14.74 | Yes |
| Ink | White | 16.20 | Yes |
| Ink | Linen | 13.36 | Yes |
| Moss grey | Paper | 5.74 | Yes |
| Moss grey | White | 6.31 | Yes |
| Moss grey | Linen | 5.20 | Yes |
| White | Pine | 6.37 | Yes |
| Pine | Paper | 5.80 | Yes |
| Pine | White | 6.37 | Yes |
| Pine dark | Pine pale | 9.08 | Yes |
| Marigold dark | Marigold pale | 7.13 | Yes |
| Ink | Marigold | 7.50 | Yes |
| White | Clay | 5.94 | Yes |
| Clay | White | 5.94 | Yes |
| Clay dark | Clay pale | 7.73 | Yes |
| Paper | Ink | 14.74 | Yes |
| Marigold | Ink | 7.50 | Yes |
| Pine pale | Ink | 13.54 | Yes |
| Marigold | Paper | 1.96 | **No.** Marigold is for shapes only, never text on a light background. |

Colour is never the only signal: right and wrong answers also show a tick or a cross and a word.

## Type

| Role | Font | Why |
|---|---|---|
| Headings, big numbers | **Bricolage Grotesque** (600 to 700) | A sans-serif with a little character in its curves. Looks confident without looking like a bank. |
| Everything else | **Atkinson Hyperlegible** (400, 700) | Designed so that similar letters (I, l, 1, O, 0) are easy to tell apart. That matters in an app that asks you to read web addresses carefully. |
| Sender addresses and passwords | the device's own monospace font | Every character the same width, so odd characters stand out. |

Both named fonts are free under the SIL Open Font Licence and are installed with the app from the `@fontsource` packages, so nothing loads from another company's servers.

Sizes: 30 (screen title), 20 (section title), 17 (card title), 16 (body), 13 (labels). Minimum tap target 44 px.

## Shape and feel

- Rounded corners: 16 px on cards, 12 px on inputs and buttons, full pill on tags.
- Cards are white on paper with a thin line border. Almost no shadows.
- Charts are simple: one ring, plain bars. Drawn by code.
- Icons are simple line icons drawn for this project. No photos, no people, no mascots.

## Logo

Files: `brand/logo-mark.svg` (the app icon) and `brand/logo-full.svg` (icon plus name).

The mark is a cream keyhole on a pine rounded square, with three short marigold rays above it. Keyhole = the latch. Rays = the light.

Rules:

- Keep clear space around it equal to the length of one ray.
- Smallest size: 24 px for the mark.
- Do not recolour, stretch, or put it on a busy picture.
- On an ink background the mark is used as it is.

Note: the word "Latchlight" in `logo-full.svg` is live text. It shows in Bricolage Grotesque where that font is installed and in a normal sans-serif elsewhere. Turning it into fixed outlines is a small job for later.
