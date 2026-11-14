# Test results: Potwise

Everything on this page was run by Claude on 14 Nov 2026, in this session, on a Linux cloud computer with Node.js 22.23.4 and the Chromium browser. Nothing here was run on Windows or on a real phone.

## Summary

| Test set | What it checks | Command | Result |
|---|---|---|---|
| Backend tests | Ingredient matching, the sample chef, the diet plan, and every server address, using a throwaway database | `npm test` | **47 passed, 0 failed** |
| Browser tests | A real hidden browser at phone size using the built app like a person: search, categories, recipe, save, pantry, chef, diet plan | `npm run test:e2e` | **21 passed, 0 failed** |
| Fresh copy check | Cloned the branch into an empty folder, then `npm install`, `npm test`, `npm run build`, `npm start`, opened the health address and a recipe, ran the browser tests | by hand | **Worked** |
| Developer mode | `npm run dev`, then asked for the app and `/api/health` through port 5173 | by hand | **Worked** |
| Tests can fail | Put a deliberate mistake in the chef's sorting, ran `npm test` | by hand | **5 tests failed as they should.** Mistake removed, 47 pass again. |
| Mockups | Opened the 4 mockup files at phone width | script | No errors, no sideways scrolling |
| Colour contrast | Calculated with the WCAG formula | script | The 10 text and background pairs the design uses pass 4.5:1. One pair fails and is marked "do not use" (table in BRAND.md). |

## What happened on the way

- First browser run: 20 of 21 passed. The failing check ("the chat is still there after visiting another tab") counted the messages before the screen had finished drawing. That was a mistake in the test, not in the app. The test now waits for the Chef heading first. Second run: 21 of 21.
- First `npm test` run failed to start at all because Node 22 wants a file pattern, not a folder name. Fixed the command in `package.json`.

## Not tested (be careful claiming these)

- **Windows and macOS.** Only Linux was used. The code uses nothing Linux-only, but that is reasoning, not a test.
- **Real phones.** Only a phone-sized browser window (390 x 844) on a computer.
- **Other browsers.** Only Chromium. Not Safari, not Firefox.
- **Screen readers and keyboard-only use.** Labels, roles and focus outlines are in the code, but nobody has used the app with a screen reader, and no automatic accessibility scanner was run.
- **Many users at once, speed under load, security testing.** The app is built for one person on their own computer.
- **Real AI.** There is none yet, so there is nothing to test.
- **Nutrition numbers.** They are estimates written by hand and were not checked against a nutrition database.

## Backend tests, full list (`npm test`)

```
✔ GET /api/health
✔ GET /api/categories gives 5 categories with counts that add up to 16
✔ GET /api/recipes gives all 16 with lists already turned back from JSON text
✔ GET /api/recipes filters by category, popular and search word
✔ search treats % and _ as normal letters, and a SQL attack as plain text
✔ GET /api/recipes rejects an unknown category
✔ GET /api/recipes/:id gives ingredients, steps and pantry ticks
✔ GET /api/recipes/:id handles a missing recipe and a bad id
✔ GET /api/recipes/random gives a recipe
✔ pantry: starts with 7, add, duplicate, remove
✔ pantry: bad input is refused with a clear message
✔ pantry: Arabic and accented names are accepted
✔ saved: save, list, save twice, remove
✔ saved: cannot save a recipe that does not exist
✔ chef: suggest from typed text
✔ chef: suggest from the pantry
✔ chef: suggest from a list, and from nonsense
✔ chef: bad requests are refused
✔ chef: empty pantry gives a helpful answer
✔ chef: diet plan works for every goal and refuses unknown goals
✔ unknown /api addresses give a JSON 404
✔ the server does not announce which software it runs
✔ suggestMeals labels its answers as sample
✔ a recipe you can fully make comes first
✔ suggestions are ordered by fewest missing ingredients
✔ salt and water never count as missing
✔ only having salt suggests nothing
✔ unknown ingredients and an empty list suggest nothing
✔ the limit is respected and the default is 5
✔ suggestions do not carry the full ingredient list or steps
✔ different spellings match (scallions, spaghetti)
✔ chefReply has a sentence for every situation
✔ diet plan has 3 days of breakfast, lunch and dinner for every goal
✔ vegetarian plan contains only vegetarian or vegan recipes
✔ high-protein day 1 has more protein than balanced day 1; lighter day 1 has fewer calories
✔ the same meal is not repeated on consecutive days
✔ toKey makes plural and singular the same
✔ toKey ignores numbers, capitals, spaces and describing words
✔ toKey knows different names for the same thing
✔ toKey keeps words that only look plural
✔ toKey returns an empty string for things that are not words
✔ parseIngredientText splits a sentence into ingredients
✔ parseIngredientText removes repeats and handles empty input
✔ parseIngredientText stops at 30 ingredients
✔ sample data: every ingredient key is in its simplest form and matches its name
✔ sample data: 16 recipes, each complete
✔ sample data: starter pantry items all turn into keys
ℹ tests 47
ℹ pass 47
ℹ fail 0
```

## Browser tests, full list (`npm run test:e2e`)

```
  PASS  Home shows the heading, 5 categories and 6 popular recipes
  PASS  Brand fonts are loaded (Fraunces for headings, DM Sans for text)
  PASS  Tapping the Dinner category lists the 5 dinner recipes
  PASS  Search from Home finds a recipe by ingredient
  PASS  A search with no matches shows a helpful empty message
  PASS  Recipe screen shows facts, ticks pantry ingredients and has 4 steps
  PASS  Tapping a step marks it as done
  PASS  Saving a recipe puts it in Saved and it is still there after a reload
  PASS  Removing the save empties the Saved screen
  PASS  Pantry starts with 7 items and can add one
  PASS  Pantry refuses a duplicate (even singular vs plural) and a non-ingredient
  PASS  Pantry can remove an item
  PASS  "Cook with these" opens the chef with suggestions from the pantry
  PASS  Typing ingredients puts a recipe you can fully make first
  PASS  Random recipe gives one suggestion
  PASS  Diet plan: choosing Vegetarian gives 3 days with no chicken
  PASS  The chef answers kindly when it understands nothing
  PASS  The chat is still there after visiting another tab
  PASS  An unknown address shows a friendly page
  PASS  On a laptop-sized window the app stays a centred phone-width column
  PASS  No errors were printed in the browser console during the whole run
21 passed, 0 failed, 21 total
```

Screenshots taken by the browser tests during the last run are in `screenshots/`.
