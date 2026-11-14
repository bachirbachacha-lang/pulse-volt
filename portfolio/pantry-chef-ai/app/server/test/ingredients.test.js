// Tests for turning typed words into ingredient keys.
// Run all tests with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toKey, parseIngredientText, STAPLES } from '../ingredients.js';
import { RECIPES, STARTER_PANTRY } from '../seed-data.js';

test('toKey makes plural and singular the same', () => {
  assert.equal(toKey('Eggs'), 'egg');
  assert.equal(toKey('egg'), 'egg');
  assert.equal(toKey('Tomatoes'), 'tomato');
  assert.equal(toKey('Spring onions'), 'spring onion');
});

test('toKey ignores numbers, capitals, spaces and describing words', () => {
  assert.equal(toKey('  2 Fresh   TOMATOES '), 'tomato');
  assert.equal(toKey('Ground cumin'), 'cumin');
  assert.equal(toKey('Cooked rice'), 'rice');
});

test('toKey knows different names for the same thing', () => {
  assert.equal(toKey('scallions'), 'spring onion');
  assert.equal(toKey('Spaghetti'), 'pasta');
  assert.equal(toKey('chicken breast'), 'chicken');
  assert.equal(toKey('yoghurt'), 'yogurt');
  assert.equal(toKey('oil'), 'vegetable oil');
});

test('toKey keeps words that only look plural', () => {
  assert.equal(toKey('couscous'), 'couscou'); // known limit: written down in TECHNICAL.md
  assert.equal(toKey('watercress'), 'watercress');
});

test('toKey returns an empty string for things that are not words', () => {
  assert.equal(toKey('123'), '');
  assert.equal(toKey(''), '');
  assert.equal(toKey(null), '');
  assert.equal(toKey(42), '');
});

test('parseIngredientText splits a sentence into ingredients', () => {
  assert.deepEqual(parseIngredientText('I have eggs, rice and 2 spring onions'), ['eggs', 'rice', 'spring onions']);
  assert.deepEqual(parseIngredientText('chicken; tomato & garlic'), ['chicken', 'tomato', 'garlic']);
});

test('parseIngredientText removes repeats and handles empty input', () => {
  assert.deepEqual(parseIngredientText('egg, eggs, Eggs'), ['egg']);
  assert.deepEqual(parseIngredientText(''), []);
  assert.deepEqual(parseIngredientText(', , ,'), []);
  assert.deepEqual(parseIngredientText(undefined), []);
});

test('parseIngredientText stops at 30 ingredients', () => {
  const many = Array.from({ length: 60 }, (_, i) => 'item' + 'abcdefghijklmnopqrstuvwxyz'[i % 26] + 'xyzabcdefghijklmnopqrstuvw'[Math.floor(i / 26)]).join(', ');
  assert.equal(parseIngredientText(many).length, 30);
});

test('sample data: every ingredient key is in its simplest form and matches its name', () => {
  for (const recipe of RECIPES) {
    for (const [key, name] of recipe.ingredients) {
      assert.equal(toKey(key), key, `${recipe.title}: key "${key}"`);
      assert.equal(toKey(name), key, `${recipe.title}: name "${name}" should turn into "${key}"`);
    }
  }
});

test('sample data: 16 recipes, each complete', () => {
  assert.equal(RECIPES.length, 16);
  for (const r of RECIPES) {
    assert.ok(r.title && r.description, r.title);
    assert.ok(r.ingredients.length >= 5, `${r.title} ingredients`);
    assert.equal(r.steps.length, 4, `${r.title} steps`);
    assert.equal(r.colors.length, 4, `${r.title} colours`);
    assert.ok(r.minutes > 0 && r.servings > 0 && r.kcal > 0 && r.protein > 0, `${r.title} numbers`);
    assert.ok(r.ingredients.some(([key]) => !STAPLES.has(key)), `${r.title} needs a real ingredient`);
  }
  assert.equal(new Set(RECIPES.map((r) => r.title)).size, 16, 'titles are unique');
});

test('sample data: starter pantry items all turn into keys', () => {
  for (const name of STARTER_PANTRY) assert.ok(toKey(name), name);
});
