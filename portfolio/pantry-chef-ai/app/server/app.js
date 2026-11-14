// The server. It answers requests that start with /api and, once the screens
// have been built (npm run build), it also hands out the screens themselves.
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { suggestMeals, chefReply, buildDietPlan, DIET_GOALS } from './chef.js';
import { parseIngredientText, toKey } from './ingredients.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const MAX_PANTRY = 100;

// A small helper: stop with an error message and a status code.
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// "/api/recipes/7" gives us the text "7". This makes sure it really is a whole positive number.
function readId(text) {
  if (!/^[1-9]\d{0,8}$/.test(text)) throw new ApiError(400, 'That id is not valid.');
  return Number(text);
}

export function createApp(store, { distDir = path.join(here, '..', 'dist') } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // ---- Recipes ------------------------------------------------------------
  app.get('/api/categories', (req, res) => res.json(store.categories()));

  app.get('/api/recipes', (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '';
    if (category && !store.categories().some((c) => c.id === category)) {
      throw new ApiError(400, 'Unknown category.');
    }
    res.json(store.listRecipes({ category, q, popular: req.query.popular === '1' }));
  });

  app.get('/api/recipes/random', (req, res) => res.json(store.randomRecipe()));

  app.get('/api/recipes/:id', (req, res) => {
    const recipe = store.getRecipe(readId(req.params.id));
    if (!recipe) throw new ApiError(404, 'Recipe not found.');
    res.json(recipe);
  });

  // ---- Pantry -------------------------------------------------------------
  app.get('/api/pantry', (req, res) => res.json(store.pantry()));

  app.post('/api/pantry', (req, res) => {
    const raw = req.body?.name;
    if (typeof raw !== 'string') throw new ApiError(400, 'Send a name, for example {"name": "Eggs"}.');
    const name = raw.replace(/\s+/g, ' ').trim();
    if (name.length < 1 || name.length > 40) throw new ApiError(400, 'An ingredient name must be 1 to 40 letters long.');
    if (!/^\p{L}[\p{L}\p{M} '-]*$/u.test(name)) throw new ApiError(400, 'Use letters only, for example "Spring onions".');
    const key = toKey(name);
    if (!key) throw new ApiError(400, 'That does not look like an ingredient.');

    const existing = store.pantryByKey(key);
    if (existing) return res.status(200).json({ ...existing, alreadyThere: true });
    if (store.pantry().length >= MAX_PANTRY) throw new ApiError(400, `The pantry is full (${MAX_PANTRY} items).`);

    const shown = name[0].toUpperCase() + name.slice(1);
    res.status(201).json(store.addPantry(shown, key));
  });

  app.delete('/api/pantry/:id', (req, res) => {
    if (!store.removePantry(readId(req.params.id))) throw new ApiError(404, 'That pantry item does not exist.');
    res.status(204).end();
  });

  // ---- Saved recipes ------------------------------------------------------
  app.get('/api/saved', (req, res) => res.json(store.saved()));

  app.put('/api/saved/:id', (req, res) => {
    const id = readId(req.params.id);
    if (!store.recipeExists(id)) throw new ApiError(404, 'Recipe not found.');
    store.save(id);
    res.json({ id, saved: true });
  });

  app.delete('/api/saved/:id', (req, res) => {
    const id = readId(req.params.id);
    store.unsave(id);
    res.json({ id, saved: false });
  });

  // ---- Chef ---------------------------------------------------------------
  // Three ways to ask: { usePantry: true }, { text: "eggs, rice" } or { ingredients: ["eggs", "rice"] }
  app.post('/api/chef/suggest', async (req, res) => {
    const body = req.body ?? {};
    let ingredients;
    if (body.usePantry === true) {
      ingredients = store.pantry().map((p) => p.name);
      if (ingredients.length === 0) {
        return res.json({
          source: 'sample', understood: [], suggestions: [], emptyPantry: true,
          reply: 'Your pantry is empty. Add a few ingredients first and I will find something to cook.',
        });
      }
    } else if (typeof body.text === 'string') {
      if (body.text.length > 500) throw new ApiError(400, 'That message is too long (500 letters at most).');
      ingredients = parseIngredientText(body.text);
    } else if (Array.isArray(body.ingredients) && body.ingredients.length <= 50 && body.ingredients.every((i) => typeof i === 'string' && i.length <= 40)) {
      ingredients = body.ingredients;
    } else {
      throw new ApiError(400, 'Send {"usePantry": true}, {"text": "eggs, rice"} or {"ingredients": ["eggs", "rice"]}.');
    }

    // >>> The one call to the AI chef. See server/chef.js. <<<
    const result = await suggestMeals({ ingredients, recipes: store.recipesWithIngredients(), limit: 5 });

    const understood = [...new Set(ingredients.map(toKey).filter(Boolean))];
    res.json({ ...result, understood, reply: chefReply(result.suggestions, understood.length) });
  });

  app.post('/api/chef/diet-plan', (req, res) => {
    const goal = req.body?.goal;
    if (typeof goal !== 'string' || !Object.hasOwn(DIET_GOALS, goal)) {
      throw new ApiError(400, `Pick a goal: ${Object.keys(DIET_GOALS).join(', ')}.`);
    }
    res.json(buildDietPlan({ goal, recipes: store.recipesWithIngredients(), days: 3 }));
  });

  // Any other /api address does not exist.
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

  // ---- The screens --------------------------------------------------------
  // After "npm run build" the finished screens are in the dist folder.
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir));
    // Any other address (like /recipe/3) gets the app, which then shows the right screen.
    app.get(/.*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  // ---- Errors -------------------------------------------------------------
  // Every error ends up here and is sent back as { "error": "..." }.
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request was not valid JSON.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'The request was too large.' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  return app;
}
