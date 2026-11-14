// ============================================================================
//  THE AI CHEF LIVES HERE
// ============================================================================
//  Right now this is NOT real AI. suggestMeals() returns SAMPLE suggestions
//  by comparing your ingredients with the recipes in the database.
//
//  To plug in real AI later, change the inside of suggestMeals() only.
//  Keep what goes in and what comes out the same, and no screen has to change:
//
//    in:   { ingredients: ["eggs", "rice"], recipes: [...], limit: 5 }
//    out:  { source: "sample", suggestions: [ { recipe, uses, missing, matchPercent } ] }
//
//  When it is real AI, set source to "ai" so the app stops showing the
//  "Sample answers" label. Real AI needs an API key or a local model, and
//  that is a decision for the owner (see PLAN.md, "Needs the owner").
// ============================================================================

import { STAPLES, toKey } from './ingredients.js';

export async function suggestMeals({ ingredients, recipes, limit = 5 }) {
  const have = new Set(ingredients.map(toKey).filter(Boolean));
  const suggestions = [];

  for (const recipe of recipes) {
    // Salt and water are not counted either way.
    const needed = recipe.ingredients.filter((i) => !STAPLES.has(i.key));
    const uses = needed.filter((i) => have.has(i.key));
    const missing = needed.filter((i) => !have.has(i.key));
    if (uses.length === 0) continue; // nothing in common, not a useful idea

    const { ingredients: _i, steps: _s, ...summary } = recipe;
    suggestions.push({
      recipe: summary,
      uses: uses.map((i) => i.name),
      missing: missing.map((i) => i.name),
      matchPercent: Math.round((uses.length / needed.length) * 100),
    });
  }

  // Best first: fewest missing, then most of your food used, then quickest.
  suggestions.sort(
    (a, b) =>
      a.missing.length - b.missing.length ||
      b.uses.length - a.uses.length ||
      a.recipe.minutes - b.recipe.minutes ||
      a.recipe.title.localeCompare(b.recipe.title),
  );

  return { source: 'sample', suggestions: suggestions.slice(0, limit) };
}

// The sentence the chef says above the suggestion cards. Also sample logic.
export function chefReply(suggestions, understoodCount) {
  if (understoodCount === 0) {
    return 'Tell me a few ingredients, separated by commas. For example: eggs, rice, tomato.';
  }
  if (suggestions.length === 0) {
    return 'I could not find a recipe that uses those yet. Try adding one or two more ingredients.';
  }
  const ready = suggestions.filter((s) => s.missing.length === 0).length;
  if (ready === 1) return 'Good news: you can make one of these right now. The others need a little shopping.';
  if (ready > 1) return `Good news: you can make ${ready} of these right now.`;
  const best = suggestions[0];
  const n = best.missing.length;
  return `Nothing is a perfect match yet. The closest is ${best.recipe.title}, which needs ${n} more ingredient${n === 1 ? '' : 's'}.`;
}

// ---------------------------------------------------------------------------
//  Diet plan. Also SAMPLE logic: it picks recipes by simple rules.
//  It is not dietary or medical advice.
// ---------------------------------------------------------------------------
export const DIET_GOALS = {
  balanced: 'Balanced',
  vegetarian: 'Vegetarian',
  'high-protein': 'High protein',
  lighter: 'Lighter',
};

const SLOTS = [
  { slot: 'Breakfast', category: 'breakfast' },
  { slot: 'Lunch', category: 'lunch' },
  { slot: 'Dinner', category: 'dinner' },
];

export function buildDietPlan({ goal, recipes, days = 3 }) {
  const pick = (category) => {
    let list = recipes.filter((r) => r.category === category);
    if (goal === 'vegetarian') list = list.filter((r) => r.tags.includes('Vegetarian') || r.tags.includes('Vegan'));
    if (goal === 'high-protein') list = [...list].sort((a, b) => b.protein - a.protein);
    if (goal === 'lighter') list = [...list].sort((a, b) => a.kcal - b.kcal);
    return list;
  };
  const choices = SLOTS.map((s) => ({ ...s, list: pick(s.category) }));

  const plan = [];
  for (let d = 0; d < days; d++) {
    const meals = choices
      .filter((c) => c.list.length > 0)
      .map((c) => {
        const { ingredients: _i, steps: _s, ...summary } = c.list[d % c.list.length];
        return { slot: c.slot, recipe: summary };
      });
    plan.push({
      day: d + 1,
      meals,
      kcal: meals.reduce((sum, m) => sum + m.recipe.kcal, 0),
      protein: meals.reduce((sum, m) => sum + m.recipe.protein, 0),
    });
  }

  return {
    source: 'sample',
    goal,
    goalLabel: DIET_GOALS[goal],
    days: plan,
    note: 'Sample plan. Calories and protein are rough estimates for one serving of each meal. It covers three meals, not everything a person needs in a day, and it is not dietary or medical advice.',
  };
}
