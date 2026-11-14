// Tests for the sample chef (server/chef.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestMeals, chefReply, buildDietPlan, DIET_GOALS } from '../chef.js';
import { openStore } from '../db.js';

const store = openStore(':memory:'); // a throwaway database filled with the sample recipes
const recipes = store.recipesWithIngredients();

test('suggestMeals labels its answers as sample', async () => {
  const result = await suggestMeals({ ingredients: ['eggs'], recipes });
  assert.equal(result.source, 'sample');
});

test('a recipe you can fully make comes first', async () => {
  const { suggestions } = await suggestMeals({
    ingredients: ['eggs', 'rice', 'spring onions', 'garlic', 'soy sauce', 'vegetable oil'],
    recipes,
  });
  assert.equal(suggestions[0].recipe.title, 'Egg Fried Rice');
  assert.deepEqual(suggestions[0].missing, []);
  assert.equal(suggestions[0].matchPercent, 100);
});

test('suggestions are ordered by fewest missing ingredients', async () => {
  const { suggestions } = await suggestMeals({ ingredients: ['egg', 'tomato', 'onion', 'garlic', 'rice'], recipes });
  const counts = suggestions.map((s) => s.missing.length);
  assert.deepEqual(counts, [...counts].sort((a, b) => a - b));
});

test('salt and water never count as missing', async () => {
  const { suggestions } = await suggestMeals({ ingredients: ['chickpeas', 'olive oil', 'cumin', 'paprika'], recipes });
  const chickpeas = suggestions.find((s) => s.recipe.title === 'Spiced Roasted Chickpeas');
  assert.deepEqual(chickpeas.missing, []);
  for (const s of suggestions) assert.ok(!s.missing.includes('Salt') && !s.missing.includes('Water'));
});

test('only having salt suggests nothing', async () => {
  const { suggestions } = await suggestMeals({ ingredients: ['salt', 'water'], recipes });
  assert.deepEqual(suggestions, []);
});

test('unknown ingredients and an empty list suggest nothing', async () => {
  assert.deepEqual((await suggestMeals({ ingredients: ['dragonfruit'], recipes })).suggestions, []);
  assert.deepEqual((await suggestMeals({ ingredients: [], recipes })).suggestions, []);
});

test('the limit is respected and the default is 5', async () => {
  const common = ['garlic', 'onion', 'tomato', 'olive oil'];
  assert.equal((await suggestMeals({ ingredients: common, recipes })).suggestions.length, 5);
  assert.equal((await suggestMeals({ ingredients: common, recipes, limit: 2 })).suggestions.length, 2);
});

test('suggestions do not carry the full ingredient list or steps', async () => {
  const { suggestions } = await suggestMeals({ ingredients: ['eggs'], recipes });
  assert.equal(suggestions[0].recipe.ingredients, undefined);
  assert.equal(suggestions[0].recipe.steps, undefined);
  assert.ok(suggestions[0].recipe.id > 0);
});

test('different spellings match (scallions, spaghetti)', async () => {
  const { suggestions } = await suggestMeals({ ingredients: ['Scallions', 'SPAGHETTI'], recipes });
  const titles = suggestions.map((s) => s.recipe.title);
  assert.ok(titles.includes('Egg Fried Rice'));
  assert.ok(titles.includes('Garlic Butter Pasta'));
});

test('chefReply has a sentence for every situation', () => {
  const s = (missing) => ({ recipe: { title: 'Soup' }, missing: Array(missing).fill('x') });
  assert.match(chefReply([], 0), /Tell me a few ingredients/);
  assert.match(chefReply([], 2), /could not find/);
  assert.match(chefReply([s(0), s(2)], 2), /one of these right now/);
  assert.match(chefReply([s(0), s(0)], 2), /2 of these right now/);
  assert.match(chefReply([s(1)], 2), /Soup, which needs 1 more ingredient\./);
  assert.match(chefReply([s(3)], 2), /3 more ingredients\./);
});

test('diet plan has 3 days of breakfast, lunch and dinner for every goal', () => {
  for (const goal of Object.keys(DIET_GOALS)) {
    const plan = buildDietPlan({ goal, recipes });
    assert.equal(plan.source, 'sample');
    assert.equal(plan.days.length, 3, goal);
    for (const day of plan.days) {
      assert.deepEqual(day.meals.map((m) => m.slot), ['Breakfast', 'Lunch', 'Dinner'], goal);
      assert.equal(day.kcal, day.meals.reduce((sum, m) => sum + m.recipe.kcal, 0));
    }
    assert.match(plan.note, /not dietary or medical advice/);
  }
});

test('vegetarian plan contains only vegetarian or vegan recipes', () => {
  for (const day of buildDietPlan({ goal: 'vegetarian', recipes }).days) {
    for (const meal of day.meals) {
      assert.ok(meal.recipe.tags.includes('Vegetarian') || meal.recipe.tags.includes('Vegan'), meal.recipe.title);
    }
  }
});

test('high-protein day 1 has more protein than balanced day 1; lighter day 1 has fewer calories', () => {
  const day1 = (goal) => buildDietPlan({ goal, recipes }).days[0];
  assert.ok(day1('high-protein').protein > day1('balanced').protein);
  assert.ok(day1('lighter').kcal < day1('balanced').kcal);
});

test('the same meal is not repeated on consecutive days', () => {
  const plan = buildDietPlan({ goal: 'balanced', recipes });
  for (let d = 1; d < plan.days.length; d++) {
    plan.days[d].meals.forEach((meal, i) => assert.notEqual(meal.recipe.id, plan.days[d - 1].meals[i].recipe.id));
  }
});
