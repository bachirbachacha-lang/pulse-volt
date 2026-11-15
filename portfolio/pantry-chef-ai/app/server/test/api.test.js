// Tests for the server's addresses (the API). Each test talks to a real running
// copy of the server that uses a throwaway in-memory database.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../db.js';
import { createApp } from '../app.js';

let server;
let base;
let store;

before(async () => {
  store = openStore(':memory:');
  // distDir points nowhere so these tests only cover /api, built screens or not.
  const app = createApp(store, { distDir: '/nonexistent' });
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); }); // port 0 = any free port
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  store.close();
});

// Small helper: make a request, give back the status and the JSON.
async function call(method, path, body, rawBody) {
  const res = await fetch(base + path, {
    method,
    headers: body || rawBody ? { 'Content-Type': 'application/json' } : undefined,
    body: rawBody ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null, headers: res.headers };
}

test('GET /api/health', async () => {
  const { status, data } = await call('GET', '/api/health');
  assert.equal(status, 200);
  assert.deepEqual(data, { ok: true });
});

test('GET /api/categories gives 5 categories with counts that add up to 21', async () => {
  const { data } = await call('GET', '/api/categories');
  assert.deepEqual(data.map((c) => c.id), ['breakfast', 'lunch', 'dinner', 'snacks', 'desserts']);
  assert.equal(data.reduce((sum, c) => sum + c.count, 0), 21);
});

test('GET /api/recipes gives all 21 with lists already turned back from JSON text', async () => {
  const { data } = await call('GET', '/api/recipes');
  assert.equal(data.length, 21);
  assert.ok(Array.isArray(data[0].tags) && Array.isArray(data[0].colors));
  assert.equal(typeof data[0].popular, 'boolean');
  assert.equal(data[0].saved, false);
});

test('GET /api/recipes filters by category, popular and search word', async () => {
  assert.equal((await call('GET', '/api/recipes?category=dinner')).data.length, 8);
  assert.equal((await call('GET', '/api/recipes?popular=1')).data.length, 8);
  assert.deepEqual((await call('GET', '/api/recipes?q=lentil')).data.map((r) => r.title), ['Red Lentil Soup']);
  assert.deepEqual((await call('GET', '/api/recipes?q=PASTA')).data.map((r) => r.title), ['Creamy Garlic Pasta']);
  assert.equal((await call('GET', '/api/recipes?category=dinner&q=chickpea')).data.length, 1);
  assert.deepEqual((await call('GET', '/api/recipes?q=zzzz')).data, []);
});

test('search treats % and _ as normal letters, and a SQL attack as plain text', async () => {
  assert.deepEqual((await call('GET', '/api/recipes?q=%25')).data, []); // %25 is a "%" sign
  assert.deepEqual((await call('GET', '/api/recipes?q=_')).data, []);
  assert.deepEqual((await call('GET', "/api/recipes?q=" + encodeURIComponent("'; DROP TABLE recipes; --"))).data, []);
  assert.equal((await call('GET', '/api/recipes')).data.length, 21); // still there
});

test('GET /api/recipes rejects an unknown category', async () => {
  const { status, data } = await call('GET', '/api/recipes?category=brunch');
  assert.equal(status, 400);
  assert.ok(data.error);
});

test('GET /api/recipes/:id gives ingredients, steps and pantry ticks', async () => {
  const list = (await call('GET', '/api/recipes?q=fried')).data;
  const { status, data } = await call('GET', '/api/recipes/' + list[0].id);
  assert.equal(status, 200);
  assert.equal(data.title, 'Egg Fried Rice');
  assert.equal(data.ingredients.length, 6);
  assert.equal(data.steps.length, 4);
  // starter pantry has eggs, rice and garlic
  assert.deepEqual(data.ingredients.filter((i) => i.have).map((i) => i.key).sort(), ['egg', 'garlic', 'rice']);
});

test('GET /api/recipes/:id handles a missing recipe and a bad id', async () => {
  assert.equal((await call('GET', '/api/recipes/9999')).status, 404);
  assert.equal((await call('GET', '/api/recipes/abc')).status, 400);
  assert.equal((await call('GET', '/api/recipes/-1')).status, 400);
  assert.equal((await call('GET', '/api/recipes/1.5')).status, 400);
});

test('GET /api/recipes/random gives a recipe', async () => {
  const { status, data } = await call('GET', '/api/recipes/random');
  assert.equal(status, 200);
  assert.ok(data.id > 0 && data.title);
});

test('pantry: starts with 7, add, duplicate, remove', async () => {
  assert.equal((await call('GET', '/api/pantry')).data.length, 7);

  const added = await call('POST', '/api/pantry', { name: '  soy   sauce ' });
  assert.equal(added.status, 201);
  assert.equal(added.data.name, 'Soy sauce'); // tidied and capitalised
  assert.equal(added.data.key, 'soy sauce');

  const again = await call('POST', '/api/pantry', { name: 'Soy Sauce' });
  assert.equal(again.status, 200);
  assert.equal(again.data.alreadyThere, true);
  assert.equal(again.data.id, added.data.id);

  const plural = await call('POST', '/api/pantry', { name: 'egg' }); // "Eggs" is already there
  assert.equal(plural.data.alreadyThere, true);
  assert.equal((await call('GET', '/api/pantry')).data.length, 8);

  assert.equal((await call('DELETE', '/api/pantry/' + added.data.id)).status, 204);
  assert.equal((await call('DELETE', '/api/pantry/' + added.data.id)).status, 404);
  assert.equal((await call('GET', '/api/pantry')).data.length, 7);
});

test('pantry: bad input is refused with a clear message', async () => {
  for (const body of [{ name: '' }, { name: '   ' }, { name: '123' }, { name: 'x'.repeat(41) }, { name: '<script>' }, { name: 5 }, {}]) {
    const { status, data } = await call('POST', '/api/pantry', body);
    assert.equal(status, 400, JSON.stringify(body));
    assert.ok(data.error);
  }
  assert.equal((await call('POST', '/api/pantry', null, '{not json')).status, 400);
  assert.equal((await call('POST', '/api/pantry', { name: 'a'.repeat(20000) })).status, 413);
  assert.equal((await call('GET', '/api/pantry')).data.length, 7);
});

test('pantry: Arabic and accented names are accepted', async () => {
  const a = await call('POST', '/api/pantry', { name: 'طماطم' });
  const b = await call('POST', '/api/pantry', { name: 'Jalapeño' });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  await call('DELETE', '/api/pantry/' + a.data.id);
  await call('DELETE', '/api/pantry/' + b.data.id);
});

test('saved: save, list, save twice, remove', async () => {
  assert.deepEqual((await call('GET', '/api/saved')).data, []);
  assert.deepEqual((await call('PUT', '/api/saved/3')).data, { id: 3, saved: true });
  assert.equal((await call('PUT', '/api/saved/3')).status, 200); // saving twice is fine
  const list = (await call('GET', '/api/saved')).data;
  assert.equal(list.length, 1);
  assert.equal(list[0].saved, true);
  assert.equal((await call('GET', '/api/recipes/3')).data.saved, true);
  assert.deepEqual((await call('DELETE', '/api/saved/3')).data, { id: 3, saved: false });
  assert.deepEqual((await call('GET', '/api/saved')).data, []);
});

test('saved: cannot save a recipe that does not exist', async () => {
  assert.equal((await call('PUT', '/api/saved/9999')).status, 404);
  assert.equal((await call('PUT', '/api/saved/abc')).status, 400);
});

test('chef: suggest from typed text', async () => {
  const { status, data } = await call('POST', '/api/chef/suggest', { text: 'I have eggs, rice, spring onions, garlic, soy sauce and oil' });
  assert.equal(status, 200);
  assert.equal(data.source, 'sample');
  assert.deepEqual(data.understood, ['egg', 'rice', 'spring onion', 'garlic', 'soy sauce', 'vegetable oil']);
  assert.equal(data.suggestions[0].recipe.title, 'Egg Fried Rice');
  assert.deepEqual(data.suggestions[0].missing, []);
  assert.match(data.reply, /right now/);
});

test('chef: suggest from the pantry', async () => {
  const { data } = await call('POST', '/api/chef/suggest', { usePantry: true });
  assert.ok(data.suggestions.length > 0);
  assert.equal(data.suggestions[0].recipe.title, 'Masala Scrambled Eggs'); // needs only green chilli on top of the starter pantry
  assert.deepEqual(data.suggestions[0].missing, ['Green chilli']);
});

test('chef: suggest from a list, and from nonsense', async () => {
  const list = await call('POST', '/api/chef/suggest', { ingredients: ['chickpeas', 'cumin'] });
  assert.ok(list.data.suggestions.length > 0);
  const none = await call('POST', '/api/chef/suggest', { text: 'zzzz' });
  assert.deepEqual(none.data.suggestions, []);
  assert.match(none.data.reply, /could not find/);
  const empty = await call('POST', '/api/chef/suggest', { text: '   ' });
  assert.match(empty.data.reply, /Tell me a few ingredients/);
});

test('chef: bad requests are refused', async () => {
  assert.equal((await call('POST', '/api/chef/suggest', {})).status, 400);
  assert.equal((await call('POST', '/api/chef/suggest', { text: 'a'.repeat(501) })).status, 400);
  assert.equal((await call('POST', '/api/chef/suggest', { ingredients: [1, 2] })).status, 400);
  assert.equal((await call('POST', '/api/chef/suggest', { usePantry: 'yes' })).status, 400);
});

test('chef: empty pantry gives a helpful answer', async () => {
  const items = (await call('GET', '/api/pantry')).data;
  for (const item of items) await call('DELETE', '/api/pantry/' + item.id);
  const { data } = await call('POST', '/api/chef/suggest', { usePantry: true });
  assert.equal(data.emptyPantry, true);
  assert.deepEqual(data.suggestions, []);
  for (const item of items) await call('POST', '/api/pantry', { name: item.name }); // put them back
  assert.equal((await call('GET', '/api/pantry')).data.length, 7);
});

test('chef: diet plan works for every goal and refuses unknown goals', async () => {
  for (const goal of ['balanced', 'vegetarian', 'high-protein', 'lighter']) {
    const { status, data } = await call('POST', '/api/chef/diet-plan', { goal });
    assert.equal(status, 200);
    assert.equal(data.days.length, 3);
  }
  assert.equal((await call('POST', '/api/chef/diet-plan', { goal: 'keto' })).status, 400);
  assert.equal((await call('POST', '/api/chef/diet-plan', { goal: 'constructor' })).status, 400);
  assert.equal((await call('POST', '/api/chef/diet-plan', {})).status, 400);
});

test('unknown /api addresses give a JSON 404', async () => {
  const { status, data } = await call('GET', '/api/nope');
  assert.equal(status, 404);
  assert.deepEqual(data, { error: 'Not found.' });
});

test('the server does not announce which software it runs', async () => {
  const { headers } = await call('GET', '/api/health');
  assert.equal(headers.get('x-powered-by'), null);
});
