# Brand: Sayback

Everything here is original work made for this project. `reference-style.png` was used for direction only: a dark workspace with a side menu, big number tiles, a list of recent recordings and an assistant panel on the right. The name, colours, fonts, logo and icons are different from it on purpose. The reference is purple on black with a shield-shaped logo; Sayback is sea green on deep blue-black with a speech-bubble mark, a different pair of fonts and its own icons.

## Name

**Sayback**. You say it once. The app gives it back when you need it: the sound, the words, the answer.

- Tagline: **Say it once. Find it again.**
- How to write it: one word, capital S only. Not "SayBack", not "Say Back".
- The helper is called **the assistant**. It has no human name and no face. While it is a sample it is never called AI on the screen.
- Name check: one quick web search on 14 Nov 2026 ("Sayback" voice notes app transcription) showed no voice-notes product with this name in the results. That is **not** a trademark check. The owner should check properly before any public use.

Other names I considered, if you want to change it (decision D1 in PLAN.md): Voicefold, Tellkeep, Notewake.

## Voice

Calm, short, plain. Like a tidy friend who keeps good notes.

- Say: "Saved. 2 min 14 s." Not: "Your recording has been successfully persisted."
- Say "sample" wherever something is sample. Never pretend the app heard or understood something it did not.
- About consent: firm but friendly. "Make sure everyone knows they are being recorded."

## Colours

One dark look. Contrast numbers are measured (WCAG ratio; 4.5 or more is good for normal text).

| Name | Hex | Used for | Contrast |
|---|---|---|---|
| Deep | `#0B1416` | Page background | |
| Slate | `#121E21` | Cards, side menu, assistant panel | |
| Slate raised | `#1A2A2E` | Hover, inputs, chips | |
| Line | `#27393E` | Borders (decoration only) | |
| Line strong | `#5F7A80` | Borders of inputs and buttons | 3.7 on Slate |
| Mist | `#EAF2F0` | Main text | 16.4 on Deep, 15.0 on Slate |
| Fog | `#9FB3B1` | Secondary text | 8.5 on Deep, 7.7 on Slate |
| Tide | `#35D0BA` | Main buttons, active menu item, logo, links | 8.8 on Slate |
| Tide ink | `#06201C` | Text on Tide | 8.8 |
| Ember | `#FF6F59` | Record button, recording state, delete | 6.2 on Slate |
| Ember ink | `#2A1006` | Text on Ember | 6.5 |
| Honey | `#F6C453` | Favourite star, "Sample" tags | 10.5 on Slate |
| Sky | `#8FBFFF` | "Meeting" tag, second chart colour | 9.0 on Slate |

Rules:

- Tide is the one main colour. Ember means "recording" or "careful". Honey means "favourite" or "sample". Do not use them for anything else.
- Colour is never the only signal. Tags also have words; the recording state also shows a timer and the word "Recording".

## Type

| Use | Font | Weight |
|---|---|---|
| Headings, big numbers, logo word | **Outfit** | 600 |
| Everything else | **Figtree** | 400, 600 |
| Times and durations | Figtree with tabular numbers | 400 |

Both are free under the SIL Open Font Licence and are installed with the app from npm (`@fontsource-variable/outfit`, `@fontsource-variable/figtree`), so nothing is loaded from the internet.

Sizes: body 16px, small 14px, never below 13px. Big dashboard numbers 40px. Line height 1.5 for text.

## Logo

Files: `brand/logo-mark.svg` (the mark) and `brand/logo-full.svg` (mark and name).

The mark is a speech bubble holding five bars of a sound wave: something said, kept. It is drawn by hand as SVG code for this project. I rendered it at 160, 32 and 16 pixels on the dark background and on white and looked at it; it stays readable down to 16 pixels as a shape.

- Colours: bubble in Tide, bars in Deep.
- Clear space: keep at least half a bar-width of the mark empty around it.
- Do not stretch, tilt, outline or recolour it outside the palette.
- The word in `logo-full.svg` is live text in Outfit. Where Outfit is not installed it shows in a system font. For print, convert the text to outlines first.

## Shapes and icons

- Corners: 14px on cards, 10px on buttons and inputs, fully round on the record button.
- Icons: simple line icons, 1.75px stroke, drawn for this project in `app/client/src/components/Icon.jsx`.
- Motion: small and quick (150 ms). The record button pulses gently while recording. People who ask their device for reduced motion get none.
