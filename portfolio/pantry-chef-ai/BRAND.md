# Brand: Potwise

Updated 15 Nov 2026. The owner asked for the app to follow the style of `reference-style.png` (white, warm yellow, dark text, big food photos). The look below is that direction. The name, logo, mascot, icons, recipes, text and code are our own. The reference is someone else's design and is not copied: no robot mascot, no ratings, no "AI powered" label, no user photo.

The first look (14 Nov: paprika red, cream, a serif for headings) is replaced. It is described at the end so the change is on record.

## Name

**Potwise**. "Wise about what goes in the pot."

- Tagline: **Cook what you already have.**
- How to write it: one word, capital P only. Not "PotWise", not "Pot Wise".
- The helper inside the app is called **the chef**. It is drawn as a smiling yellow pot in a chef's hat (`app/client/src/components/Mascot.jsx`).
- Name check: one quick web search on 14 Nov 2026 found no recipe app with this name. That is not a trademark check. The owner should check properly before any public use.

## Voice

Warm, short, practical. Like a friend who cooks well.

- Say: "You have 5 of the 7 ingredients." Not: "Ingredient match score: 71%."
- Say: "This is a sample suggestion." Never pretend the sample chef is real AI.
- No guilt about food, no health promises.

## Colours

The names in brackets are the names used in `app/client/src/styles.css`. Some old names were kept on purpose so no rule had to be rewritten (for example `--paprika` now holds the yellow).

| Name | Hex | Used for |
|---|---|---|
| Sun (`--sun`, `--paprika`) | `#FFC629` | Main buttons, the chef tab, the logo, "my" chat bubbles, step numbers |
| Sun deep (`--sun-deep`) | `#F5B400` | Active tab icon, input focus line |
| Sun pale (`--paprika-pale`) | `#FFF4CC` | Soft highlights, tags |
| Honey ink (`--paprika-dark`) | `#7A5200` | Links and text on pale yellow |
| Ink (`--ink`) | `#16181D` | Main text, text on yellow buttons, the dark chef card |
| Slate (`--muted`) | `#5E6470` | Secondary text |
| White (`--white`, `--cream`) | `#FFFFFF` | Page and cards |
| Mist (`--oat`) | `#F4F5F7` | Search box, stat tiles, page edge on a laptop |
| Line (`--crust`) | `#E9EBEF` | Borders |
| Leaf (`--basil`) | `#23A55A` | "You have this" ticks (shape only, never text) |
| Leaf dark (`--basil-dark`) | `#17703C` | Green text, the "Chef" label |
| Sky pale | `#EAF3FF` | The chef's chat bubbles |
| Sky ink | `#2B5FA8` | The word "Chef" in its bubbles |

Category tiles each have their own soft colour (yellow, green, lilac, pink, peach) with a darker icon of the same colour.

### Contrast (calculated on 15 Nov 2026 with the WCAG formula)

4.5 or more passes for normal text.

| Text | Background | Ratio | Pass |
|---|---|---|---|
| Ink | Sun (yellow buttons) | 11.30 | Yes |
| Ink | White | 17.76 | Yes |
| Ink | Mist | 16.28 | Yes |
| Ink | Sun pale | 16.12 | Yes |
| Slate | White | 5.94 | Yes |
| Slate | Mist (search box, stat tiles) | 5.45 | Yes |
| Slate | Line | 4.98 | Yes |
| Honey ink | Sun pale | 6.28 | Yes |
| Honey ink | White | 6.92 | Yes |
| Leaf dark | Leaf pale `#E3F6EA` | 5.45 | Yes |
| White | Leaf dark (the "Chef" label) | 6.14 | Yes |
| Sky ink | Sky pale | 5.68 | Yes |
| Light grey `#D9DCE3` | Dark chef card `#17191E` | 12.81 | Yes |
| White | Sun | 1.57 | **No. Never put white text on yellow.** |
| White | Leaf `#23A55A` | 3.18 | **No.** Leaf is for tick shapes only. |

Two pairs failed when I checked the redesign and were fixed the same day: grey text was `#6B7280` (4.43 on Mist) and is now `#5E6470`; the "Chef" label was white on Leaf (3.18) and is now white on Leaf dark.

## Type

| Role | Font | Why |
|---|---|---|
| Everything | **DM Sans** (400, 500, 600, 700) | One clean, rounded sans-serif, like the reference. Bold (700) for headings. Easy to read at small sizes. |

Free under the SIL Open Font Licence. The app installs it from the `@fontsource-variable/dm-sans` package, so it works offline. The one-page preview and the mockups load it from Google Fonts.

Sizes: 26 (screen title), 19 (section title), 15 to 17 (card title), 15 (body), 12 to 13 (labels). Minimum tap target 44 px.

## Pictures

- **Food photos**: 8 photos supplied by the owner on 15 Nov 2026. The owner says he made them with an AI image tool. They are in `app/client/src/photos/` and used for 8 recipes (see STATUS.md). They are small (about 180 x 200 pixels) because they were cut from one picture, so they look soft when shown large.
- **Recipes without a photo** show a drawn plate made by code from the recipe's own colours.
- Any new photo must be one the owner has the right to use. No photos of real people, no other brands' logos.

## Shape and feel

- Rounded corners: 22 px on cards, 16 px on inputs, full pill on buttons and tags.
- Soft, wide shadows on cards; yellow buttons have a faint yellow glow.
- Simple line icons drawn for this project.

## Logo

Files: `brand/logo-mark.svg` (the app icon) and `brand/logo-full.svg` (icon plus name). The app uses the same drawing in `app/client/src/components/Logo.jsx`, and `app/client/public/favicon.svg` is a copy of the mark.

The mark is a dark cooking pot with a small yellow smile on a yellow rounded square, with a white four-point spark rising from it where steam would be. Pot = the food you have. Spark = the idea of what to cook.

Rules:

- Keep clear space around it equal to the height of the spark.
- Smallest size: 24 px for the mark.
- Do not recolour, stretch, or put it on a busy picture.

The word "Potwise" in `logo-full.svg` is live text. It shows in DM Sans where that font is installed and in a normal sans-serif elsewhere.

## The first look (14 Nov 2026, replaced)

Paprika red `#C8401F` on cream `#FFF7EC`, aubergine text `#2A1A2E`, Fraunces serif headings with DM Sans text, and drawn plates instead of photos. It was replaced on 15 Nov because the owner wanted the app to look like his reference picture.
