// PREVIEW ONLY. This file stands in for the server so the app can run as a
// single web page with nothing installed. It keeps everything in memory,
// so changes disappear when the page is reloaded.
// It reuses the real chef and ingredient code from the server folder.
// The real app uses api.js and the Express server instead.
import { CATEGORIES, RECIPES, STARTER_PANTRY } from '../../server/seed-data.js';
import { STAPLES, toKey, parseIngredientText } from '../../server/ingredients.js';
import { suggestMeals, chefReply, buildDietPlan } from '../../server/chef.js';

const recipes = RECIPES.map((r, i) => ({
  ...r,
  id: i + 1,
  ingredients: r.ingredients.map(([key, name, quantity]) => ({ key, name, quantity })),
}));
let pantry = STARTER_PANTRY.map((name, i) => ({ id: i + 1, name, key: toKey(name) }));
let nextPantryId = pantry.length + 1;
const saved = new Set();

const summary = ({ ingredients, steps, ...rest }) => ({ ...rest, saved: saved.has(rest.id) });
const withIngredients = () => recipes.map((r) => ({ ...summary(r), ingredients: r.ingredients }));
const fail = (message) => { throw new Error(message); };
// A tiny pause so loading states behave like the real thing.
const later = (make) => new Promise((resolve, reject) => setTimeout(() => { try { resolve(make()); } catch (e) { reject(e); } }, 120));

export const api = {
  categories: () => later(() => CATEGORIES.map((c) => ({ ...c, count: recipes.filter((r) => r.category === c.id).length }))),

  recipes: ({ category, q, popular } = {}) => later(() => {
    const word = (q ?? '').trim().toLowerCase();
    return recipes
      .filter((r) => !category || r.category === category)
      .filter((r) => !popular || r.popular)
      .filter((r) => !word || r.title.toLowerCase().includes(word) || r.ingredients.some((i) => i.name.toLowerCase().includes(word) || i.key.includes(word)))
      .map(summary);
  }),

  recipe: (id) => later(() => {
    const r = recipes.find((x) => x.id === Number(id)) ?? fail('Recipe not found.');
    const have = new Set(pantry.map((p) => p.key));
    return { ...summary(r), steps: r.steps, ingredients: r.ingredients.map((i) => ({ ...i, have: have.has(i.key) || STAPLES.has(i.key) })) };
  }),

  randomRecipe: () => later(() => summary(recipes[Math.floor(Math.random() * recipes.length)])),

  pantry: () => later(() => [...pantry]),

  addPantry: (raw) => later(() => {
    const name = String(raw).replace(/\s+/g, ' ').trim();
    if (name.length < 1 || name.length > 40) fail('An ingredient name must be 1 to 40 letters long.');
    if (!/^\p{L}[\p{L}\p{M} '-]*$/u.test(name)) fail('Use letters only, for example "Spring onions".');
    const key = toKey(name);
    if (!key) fail('That does not look like an ingredient.');
    const existing = pantry.find((p) => p.key === key);
    if (existing) return { ...existing, alreadyThere: true };
    const item = { id: nextPantryId++, name: name[0].toUpperCase() + name.slice(1), key };
    pantry.push(item);
    return item;
  }),

  removePantry: (id) => later(() => { pantry = pantry.filter((p) => p.id !== id); return null; }),

  saved: () => later(() => recipes.filter((r) => saved.has(r.id)).map(summary)),
  setSaved: (id, on) => later(() => { if (on) saved.add(id); else saved.delete(id); return { id, saved: on }; }),

  suggest: async (body) => {
    await later(() => null);
    let ingredients;
    if (body.usePantry) {
      ingredients = pantry.map((p) => p.name);
      if (ingredients.length === 0) {
        return { source: 'sample', understood: [], suggestions: [], emptyPantry: true, reply: 'Your pantry is empty. Add a few ingredients first and I will find something to cook.' };
      }
    } else {
      ingredients = parseIngredientText(body.text ?? '');
    }
    const result = await suggestMeals({ ingredients, recipes: withIngredients(), limit: 5 });
    const understood = [...new Set(ingredients.map(toKey).filter(Boolean))];
    return { ...result, understood, reply: chefReply(result.suggestions, understood.length) };
  },

  dietPlan: (goal) => later(() => buildDietPlan({ goal, recipes: withIngredients(), days: 3 })),
};
