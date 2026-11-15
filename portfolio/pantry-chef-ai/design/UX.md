# UI/UX: Potwise

Mockups: open `design/mockups/index.html` in a browser to see the four main screens side by side. A picture of them is in `design/mockups-preview.png`. They are static HTML with sample content and use the same stylesheet (`potwise.css`) that the real app uses, so the app looks like the mockups.

Updated 15 Nov 2026 for the yellow redesign. The mockups load DM Sans from Google Fonts and use the owner's photos from `design/mockups/photos/`, so they need an internet connection to show the right font.

## Who it is for

A student or young adult cooking at home who opens the fridge and thinks "what can I make with this?". They are on a phone, often with one hand busy.

## Screen list

| # | Screen | What it is for | Mockup |
|---|---|---|---|
| 1 | Home | Start here. Search, open the chef, pick a category, see popular recipes. | `home.html` |
| 2 | Explore | Search results and category filter over all recipes. | uses the Home card grid |
| 3 | Recipe | One recipe: facts, ingredients (ticked if you have them), steps, save. | `recipe.html` |
| 4 | Chef | Chat. Type ingredients, or tap Use what I have, Random recipe, Diet plan. | `chef.html` |
| 5 | Pantry | The list of ingredients you have. Add and remove. | `pantry.html` |
| 6 | Saved | Recipes you saved with the heart. | uses the Home card grid |

Bottom tabs on every main screen: Home, Explore, Chef (raised, in the middle), Saved, Pantry. The Recipe screen has no tabs; it has a back button.

## User flows

### 1. "Use what I have" (the main flow)

```
Pantry tab -> add ingredients -> "Cook with these"
   -> Chef screen shows suggestions, best match first
   -> tap a suggestion -> Recipe (ingredients you have are ticked)
```

Also reachable from Home: chef card -> Chef -> "Use what I have".
If the pantry is empty, the chef says so and offers a link to the Pantry.

### 2. Type ingredients to the chef

```
Chef tab -> type "eggs, rice, spring onion" -> Send
   -> chef reply + suggestion cards, each says what it uses and what is missing
```

### 3. Random recipe

```
Chef tab -> "Random recipe" -> one suggestion card -> Recipe
```

### 4. Diet plan

```
Chef tab -> "Diet plan" -> pick a goal (Balanced, Vegetarian, High protein, Lighter)
   -> 3-day plan: breakfast, lunch, dinner for each day, with estimated calories
   -> tap a meal -> Recipe
```

### 5. Browse and save

```
Home -> category chip or search -> Explore list -> Recipe -> heart -> appears in Saved
```

## Design rules used

- **Thumb first.** Main actions sit in the lower half. Every tap target is at least 44 px.
- **One main action per screen.** Yellow is kept for that action.
- **Tell the truth.** The Chef screen carries a "Sample answers" tag. Calories are labelled as estimates.
- **Never a dead end.** Empty pantry, no saved recipes, no search results and server errors each have their own short message and a next step.
- **Readable.** All text colour pairs pass WCAG AA contrast (table in BRAND.md). Focus outlines are visible. Icons that carry meaning have text labels. Motion is tiny and switched off when the device asks for reduced motion.
- **Not colour alone.** "You have this" is a tick, not just green. Missing counts are written as words.

## What differs from the reference picture

Followed on purpose (the owner asked for it on 15 Nov 2026): white and yellow colours, one sans-serif font, a dark card with a food photo on Home, round category tiles, photo recipe cards, a photo header with time and level pills on the recipe screen, a yellow "Start cooking" button, a chef header on the chat.

Our own: the name and logo, the pot-in-a-chef's-hat mascot (the reference has a robot), all text and recipes, the icons, the Pantry tab and ticked ingredients, the honest "Sample answers" label, and all the code. Left out: the user photo, notification bell, star ratings and "AI powered" label, because the app has no accounts, no reviews and no real AI.
