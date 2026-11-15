// Browser test: opens the real app in a real (hidden) browser and uses it like a person would.
// It starts its own copy of the server with a fresh, temporary database,
// so it never touches your own pantry or saved recipes.
//
// Before running:  npm run build
// Run:             npm run test:e2e
// Needs Playwright (free). If it is not installed:  npm install -D playwright && npx playwright install chromium
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(here, '..');
const shots = path.join(here, 'screenshots');
const PORT = 3219;
const URL = `http://localhost:${PORT}`;

assert.ok(fs.existsSync(path.join(appDir, 'dist', 'index.html')), 'Run "npm run build" first.');
fs.mkdirSync(shots, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'potwise-e2e-'));

const server = spawn(process.execPath, ['--no-warnings', 'server/index.js'], {
  cwd: appDir,
  env: { ...process.env, PORT: String(PORT), POTWISE_DB: path.join(tmp, 'test.db') },
  stdio: 'inherit',
});

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(URL + '/api/health')).ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('The server did not start.');
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log('  PASS  ' + name);
  } catch (err) {
    results.push({ name, ok: false });
    console.log('  FAIL  ' + name + '\n        ' + String(err.message).split('\n')[0]);
  }
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // a phone-sized window
  page.setDefaultTimeout(5000);
  const problems = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(String(e)));
  const shot = (name) => page.screenshot({ path: path.join(shots, name + '.png') });
  const noSidewaysScroll = async () =>
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'page scrolls sideways');

  console.log('\nPotwise browser test\n');

  await check('Home shows the heading, 5 categories and 6 popular recipes', async () => {
    await page.goto(URL);
    await page.getByRole('heading', { name: 'What would you like to cook?' }).waitFor();
    await page.locator('.recipe-card').first().waitFor();
    assert.equal(await page.locator('.cat-tiles .cat-tile').count(), 5);
    assert.equal(await page.locator('.recipe-card').count(), 6);
    await noSidewaysScroll();
    await document_fonts(page);
    await shot('01-home');
  });

  await check('Brand font is loaded (DM Sans for headings and text)', async () => {
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return [document.fonts.check('700 26px "DM Sans Variable"'), document.fonts.check('15px "DM Sans Variable"')];
    });
    assert.deepEqual(fonts, [true, true]);
  });

  await check('Tapping the Dinner category lists the 5 dinner recipes', async () => {
    await page.getByRole('link', { name: 'Dinner' }).click();
    await page.getByText('5 recipes').waitFor();
    assert.equal(await page.locator('.recipe-card').count(), 5);
    assert.equal(await page.getByRole('button', { name: 'Dinner' }).getAttribute('aria-pressed'), 'true');
    await shot('02-explore');
  });

  await check('Search from Home finds a recipe by ingredient', async () => {
    await page.goto(URL);
    await page.getByLabel('Search recipes or ingredients').fill('lentil');
    await page.keyboard.press('Enter');
    await page.getByText('1 recipe', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Red Lentil Soup' }).waitFor();
  });

  await check('A search with no matches shows a helpful empty message', async () => {
    await page.getByLabel('Search recipes or ingredients').fill('zzzz');
    await page.getByText('No recipes found').waitFor();
  });

  await check('Recipe screen shows facts, ticks pantry ingredients and has 4 steps', async () => {
    await page.goto(URL + '/explore?q=fried');
    await page.getByRole('link', { name: /Egg Fried Rice/ }).click();
    await page.getByRole('heading', { name: 'Egg Fried Rice', level: 1 }).waitFor();
    await page.getByText('You have 3 of 6').waitFor(); // starter pantry has eggs, rice and garlic
    assert.equal(await page.locator('.ing-list li').count(), 6);
    assert.equal(await page.locator('.ing-list .have.yes').count(), 3);
    assert.equal(await page.locator('.steps li').count(), 4);
    assert.equal(await page.locator('.tabbar').count(), 0, 'recipe screen should not show the tabs');
    await noSidewaysScroll();
    await shot('03-recipe');
  });

  await check('Tapping a step marks it as done', async () => {
    const step = page.locator('.step').first();
    assert.equal(await step.getAttribute('aria-pressed'), 'false');
    await step.click();
    assert.equal(await step.getAttribute('aria-pressed'), 'true');
  });

  await check('Saving a recipe puts it in Saved and it is still there after a reload', async () => {
    const heart = page.getByRole('button', { name: 'Save recipe' });
    await heart.click();
    assert.equal(await heart.getAttribute('aria-pressed'), 'true');
    await page.goto(URL + '/saved');
    await page.getByRole('heading', { name: 'Egg Fried Rice' }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'Egg Fried Rice' }).waitFor();
    await shot('04-saved');
  });

  await check('Removing the save empties the Saved screen', async () => {
    await page.getByRole('link', { name: /Egg Fried Rice/ }).click();
    await page.getByRole('button', { name: 'Save recipe' }).click();
    assert.equal(await page.getByRole('button', { name: 'Save recipe' }).getAttribute('aria-pressed'), 'false');
    await page.goto(URL + '/saved');
    await page.getByText('Nothing saved yet').waitFor();
  });

  await check('Pantry starts with 7 items and can add one', async () => {
    await page.getByRole('link', { name: 'Pantry' }).click();
    await page.getByText('7 ingredients').waitFor();
    await page.getByLabel('Add an ingredient').fill('Spring onions');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByText('Added Spring onions.').waitFor();
    await page.getByText('8 ingredients').waitFor();
  });

  await check('Pantry refuses a duplicate (even singular vs plural) and a non-ingredient', async () => {
    await page.getByLabel('Add an ingredient').fill('spring onion');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByText('Spring onions is already in your pantry.').waitFor();
    await page.getByLabel('Add an ingredient').fill('123');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByText('Use letters only').waitFor();
    assert.equal(await page.locator('.chip').count(), 8);
  });

  await check('Pantry can remove an item', async () => {
    await page.getByRole('button', { name: 'Remove Butter' }).click();
    await page.getByText('7 ingredients').waitFor();
    await noSidewaysScroll();
    await shot('05-pantry');
  });

  await check('"Cook with these" opens the chef with suggestions from the pantry', async () => {
    await page.getByRole('button', { name: 'Cook with these' }).click();
    await page.getByRole('heading', { name: 'Chef', level: 1 }).waitFor();
    await page.locator('.suggestion').first().waitFor();
    await page.getByText('Sample answers').waitFor();
    assert.ok((await page.locator('.suggestion').count()) >= 3);
    assert.equal(await page.locator('.bubble.me').count(), 1, 'the pantry question should be asked once only');
  });

  await check('Typing ingredients puts a recipe you can fully make first', async () => {
    await page.getByLabel('Tell the chef what ingredients you have').fill('eggs, rice, spring onions, garlic, soy sauce and oil');
    await page.getByRole('button', { name: 'Send' }).click();
    const last = page.locator('.chat-item').last();
    await last.locator('.suggestion').first().waitFor();
    const first = last.locator('.suggestion').first();
    assert.match(await first.innerText(), /Egg Fried Rice/);
    assert.match(await first.innerText(), /You have everything/);
    await noSidewaysScroll();
    await shot('06-chef');
  });

  await check('Random recipe gives one suggestion', async () => {
    await page.getByRole('button', { name: 'Random recipe' }).click();
    await page.getByText('How about this one?').waitFor();
    assert.equal(await page.locator('.chat-item').last().locator('.suggestion').count(), 1);
  });

  await check('Diet plan: choosing Vegetarian gives 3 days with no chicken', async () => {
    await page.getByRole('button', { name: 'Diet plan' }).click();
    await page.getByRole('button', { name: 'Vegetarian' }).click();
    await page.locator('.plan-day').first().waitFor();
    assert.equal(await page.locator('.plan-day').count(), 3);
    const text = await page.locator('.chat-item').last().innerText();
    assert.doesNotMatch(text, /chicken/i);
    assert.match(text, /not dietary or medical advice/);
    await shot('07-diet-plan');
  });

  await check('The chef answers kindly when it understands nothing', async () => {
    await page.getByLabel('Tell the chef what ingredients you have').fill('zzzz');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByText('I could not find a recipe that uses those yet').waitFor();
  });

  await check('The chat is still there after visiting another tab', async () => {
    await page.getByRole('link', { name: 'Home' }).click();
    await page.getByRole('link', { name: 'Chef', exact: true }).click();
    await page.getByRole('heading', { name: 'Chef', level: 1 }).waitFor();
    assert.equal(await page.locator('.bubble.me').count(), 6);
  });

  await check('An unknown address shows a friendly page', async () => {
    await page.goto(URL + '/nope');
    await page.getByText('That page does not exist').waitFor();
  });

  await check('On a laptop-sized window the app stays a centred phone-width column', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(URL);
    await page.locator('.recipe-card').first().waitFor();
    const box = await page.locator('.app').boundingBox();
    assert.equal(box.width, 480);
    assert.equal(Math.round(box.x), 400);
    await shot('08-desktop');
  });

  await check('No errors were printed in the browser console during the whole run', async () => {
    // The two deliberate bad requests (a bad pantry name) show up as 400 lines; those are expected.
    const unexpected = problems.filter((p) => !p.includes('400 (Bad Request)'));
    assert.deepEqual(unexpected, []);
  });
} finally {
  await browser?.close();
  server.kill();
  fs.rmSync(tmp, { recursive: true, force: true });
}

async function document_fonts(page) {
  await page.evaluate(() => document.fonts.ready);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed, ${results.length} total\n`);
process.exit(failed ? 1 : 0);
