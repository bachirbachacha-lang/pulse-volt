// Browser test: opens the real app in a real (hidden) browser and uses it like a person would.
// It starts its own copy of the server with a fresh, temporary database,
// so it never touches your own progress.
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
const PORT = 3319;
const URL = `http://localhost:${PORT}`;

assert.ok(fs.existsSync(path.join(appDir, 'dist', 'index.html')), 'Run "npm run build" first.');
fs.mkdirSync(shots, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'latchlight-e2e-'));

const server = spawn(process.execPath, ['--no-warnings', 'server/index.js'], {
  cwd: appDir,
  env: { ...process.env, PORT: String(PORT), LATCHLIGHT_DB: path.join(tmp, 'test.db') },
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } }); // a laptop-sized window
  page.setDefaultTimeout(5000);
  const problems = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(String(e)));
  // Every request the page makes is written down, so we can prove what was and was not sent.
  const requests = [];
  page.on('request', (r) => requests.push({ method: r.method(), url: r.url(), body: r.postData() ?? '' }));

  const shot = (name, full = false) => page.screenshot({ path: path.join(shots, name + '.png'), fullPage: full });
  const heading = (name) => page.getByRole('heading', { name, level: 1 });
  const menu = (name) => page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true });
  const noSidewaysScroll = async () =>
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'page scrolls sideways');
  const statText = async (label) => (await page.locator('.stat', { hasText: label }).locator('.num').innerText()).trim();

  console.log('\nLatchlight browser test\n');

  await check('Dashboard shows the sample progress: 31%, 3 / 8 lessons, 80% quiz, 3 / 10 messages', async () => {
    await page.goto(URL);
    await heading('Your dashboard').waitFor();
    await page.getByRole('img', { name: 'Awareness score 31 percent' }).waitFor();
    assert.equal(await statText('lessons done'), '3 / 8');
    assert.equal(await statText('quiz average'), '80%');
    assert.equal(await statText('messages judged right'), '3 / 10');
    await page.getByText('Includes sample progress').waitFor();
    assert.equal(await page.locator('.bars li').count(), 7);
    assert.equal(await page.locator('.topic-rows li').count(), 4);
    await noSidewaysScroll();
    await page.evaluate(() => document.fonts.ready);
    await shot('01-dashboard');
  });

  await check('Brand fonts are loaded (Bricolage Grotesque for headings, Atkinson Hyperlegible for text)', async () => {
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return {
        head: document.fonts.check('700 30px "Bricolage Grotesque Variable"'),
        body: document.fonts.check('16px "Atkinson Hyperlegible"'),
        h1: getComputedStyle(document.querySelector('h1')).fontFamily,
      };
    });
    assert.equal(fonts.head, true);
    assert.equal(fonts.body, true);
    assert.match(fonts.h1, /Bricolage Grotesque/);
  });

  await check('The coach tip is labelled as a sample and is about the weakest topic', async () => {
    const card = page.locator('.coach');
    await card.getByText('Sample tip, not AI').waitFor();
    assert.match(await card.innerText(), /You have not started Safe browsing yet/);
  });

  await check('On a laptop the menu is a left side bar with 6 links and Dashboard marked as current', async () => {
    assert.equal(await page.locator('.nav a').count(), 6);
    assert.equal(await menu('Dashboard').getAttribute('aria-current'), 'page');
    const box = await page.locator('.side').boundingBox();
    assert.equal(box.x, 0);
    assert.equal(box.width, 232);
    assert.ok(box.height >= 800);
  });

  await check('"Next up" opens the first lesson that is not done', async () => {
    await page.locator('.next').getByRole('link', { name: 'Start lesson' }).click();
    await heading('Passphrases beat clever tricks').waitFor();
    assert.match(page.url(), /\/lessons\/3$/);
    assert.equal(await page.locator('.lesson-body section').count(), 3);
    assert.equal(await page.locator('.points li').count(), 3);
    await shot('03-lesson');
  });

  await check('Marking a lesson done shows the Done tag and survives a reload', async () => {
    const button = page.getByRole('button', { name: 'Mark as done' });
    assert.equal(await button.getAttribute('aria-pressed'), 'false');
    await button.click();
    await page.getByRole('button', { name: 'Mark as not done' }).waitFor();
    await page.locator('.page-head .tag.done').waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Mark as not done' }).waitFor();
    await page.getByRole('link', { name: /^Next lesson: Managers/ }).waitFor();
  });

  await check('Lessons screen lists 4 topics and 8 lessons, 4 of them done', async () => {
    await menu('Lessons').click();
    await heading('Lessons').waitFor();
    assert.equal(await page.locator('.topic-block').count(), 4);
    assert.equal(await page.locator('.lesson-card').count(), 8);
    assert.equal(await page.locator('.lesson-card .tag.done').count(), 4);
    await noSidewaysScroll();
    await shot('02-lessons');
  });

  await check('Quizzes screen shows 4 quizzes, phishing with its best result', async () => {
    await menu('Quizzes').click();
    await heading('Quizzes').waitFor();
    assert.equal(await page.locator('.quiz-list .card').count(), 4);
    await page.locator('.quiz-list .card', { hasText: 'Phishing' }).getByText('Best: 4 of 5').waitFor();
    assert.equal(await page.locator('.quiz-list .tag', { hasText: 'Not taken' }).count(), 3);
  });

  await check('A quiz cannot be checked until every question is answered', async () => {
    await page.getByRole('link', { name: /Start quiz\s*: Passwords/ }).click();
    await heading('Passwords quiz').waitFor();
    assert.equal(await page.locator('fieldset.question').count(), 5);
    const submit = page.getByRole('button', { name: 'Check my answers' });
    assert.equal(await submit.isDisabled(), true);
    await page.getByLabel('copper-lantern-orbit-meadow').check();
    await page.getByText('1 of 5 answered').waitFor();
    assert.equal(await submit.isDisabled(), true);
    await shot('04-quiz');
  });

  await check('The quiz page never receives the right answers before you submit', async () => {
    const quizCalls = requests.filter((r) => r.url.endsWith('/api/quizzes/passwords'));
    assert.equal(quizCalls.length >= 1, true);
    const text = await (await page.request.get(URL + '/api/quizzes/passwords')).text();
    assert.ok(!text.includes('"answer"') && !text.includes('explain'));
  });

  await check('Answering 4 right and 1 wrong gives "4 of 5" with every answer explained', async () => {
    await page.getByLabel('One leaked site lets attackers try that password everywhere').check();
    await page.getByLabel('Creates and stores a different strong password for each account').check();
    await page.getByLabel('Refuse: nobody genuine asks for that code').check();
    await page.getByLabel('A game you no longer play').check(); // the wrong one, on purpose
    await page.getByRole('button', { name: 'Check my answers' }).click();
    await heading('Passwords quiz: your result').waitFor();
    assert.equal((await page.locator('.result-big').innerText()).trim(), '4 of 5');
    assert.equal(await page.locator('.review').count(), 5);
    assert.equal(await page.locator('.review .tag.done').count(), 4);
    assert.equal(await page.locator('.review .tag.bad').count(), 1);
    assert.equal(await page.locator('.review .explain').count(), 5);
    await page.locator('.choice.wrong', { hasText: 'A game you no longer play' }).getByText('Your answer').waitFor();
    await page.locator('.choice.right', { hasText: 'Your main email account' }).getByText('Right answer').waitFor();
    await noSidewaysScroll();
    await shot('05-quiz-result');
  });

  await check('Spot the phish shows message 1 with the sender address in full and no clickable link', async () => {
    await menu('Spot the phish').click();
    await heading('Spot the phish').waitFor();
    await page.getByText('<support@campus-helpdesk.account-verify.example>').waitFor();
    await page.getByText('Message 1 of 10: what do you think?').waitFor();
    assert.equal(await page.locator('.msg a').count(), 0, 'practice messages must not contain real links');
    assert.equal(await page.locator('.dots li').count(), 10);
    assert.equal(await page.locator('.clues').count(), 0, 'clues must be hidden before answering');
    await shot('06-spot');
  });

  await check('Choosing "Phish" on a phish says you were right, shows 4 clues and hides the buttons', async () => {
    await page.getByRole('button', { name: 'Phish', exact: true }).click();
    await page.getByRole('heading', { name: 'It was a phish' }).waitFor();
    await page.getByText('You were right').waitFor();
    assert.equal(await page.locator('.clues li').count(), 4);
    assert.equal(await page.getByRole('button', { name: 'Looks safe' }).count(), 0);
    assert.equal(await page.locator('.dots li.ok').count(), 1);
    await noSidewaysScroll();
    await shot('07-spot-clues');
  });

  await check('Choosing "Phish" on an honest message says "Not this time" and explains why it was safe', async () => {
    await page.getByRole('button', { name: 'Next message' }).click();
    await page.getByText('Your book is due on Thursday').waitFor();
    await page.getByRole('button', { name: 'Phish', exact: true }).click();
    await page.getByRole('heading', { name: 'It was safe' }).waitFor();
    await page.getByText('Not this time').waitFor();
    assert.equal(await page.locator('.dots li.no').count(), 1);
  });

  await check('Finishing all 10 messages shows the result (9 of 10) and "Try again" starts over', async () => {
    const verdicts = ['Phish', 'Phish', 'Looks safe', 'Phish', 'Looks safe', 'Phish', 'Looks safe', 'Phish']; // messages 3 to 10, all right
    for (const [i, verdict] of verdicts.entries()) {
      await page.getByRole('button', { name: /Next message/ }).click();
      await page.getByText(`Message ${i + 3} of 10`).waitFor();
      await page.getByRole('button', { name: verdict, exact: true }).click();
      await page.getByText('You were right').waitFor();
    }
    await page.getByRole('button', { name: 'See my result' }).click();
    assert.equal((await page.locator('.result-big').innerText()).trim(), '9 of 10');
    await shot('08-spot-result');
    await page.getByRole('button', { name: 'Try again' }).click();
    await page.getByText('Message 1 of 10: what do you think?').waitFor();
  });

  await check('Dashboard has moved: 4 / 8 lessons, 2 quizzes taken, 9 / 10 messages, score 58%', async () => {
    await menu('Dashboard').click();
    await heading('Your dashboard').waitFor();
    assert.equal(await statText('lessons done'), '4 / 8');
    assert.equal(await statText('quiz average'), '80%');
    await page.getByText('(2 of 4 taken)').waitFor();
    assert.equal(await statText('messages judged right'), '9 / 10');
    // 50*4/8 + 25*((0.8+0.8)/4) + 25*9/10 = 25 + 10 + 22.5 = 57.5 -> 58
    await page.getByRole('img', { name: 'Awareness score 58 percent' }).waitFor();
    assert.equal((await page.locator('.bars .today .n').innerText()).trim(), '12'); // 1 lesson + 1 quiz + 10 messages today
  });

  await check('Password checker: an empty box shows no result; a common password is "Very weak"', async () => {
    await menu('Password checker').click();
    await heading('Password checker').waitFor();
    await page.getByText('Private by design.').waitFor();
    assert.equal(await page.locator('.pw-label').count(), 0);
    const box = page.getByLabel('Password to check');
    assert.equal(await box.getAttribute('type'), 'password');
    await box.fill('P@ssw0rd!');
    assert.equal((await page.locator('.pw-label').innerText()).trim(), 'Very weak');
    await page.getByText('Contains a common word (password)').waitFor();
    await box.fill('Summer2024!');
    assert.equal((await page.locator('.pw-label').innerText()).trim(), 'Weak');
    await page.getByText('Contains a year (2024).').waitFor();
    await page.getByRole('button', { name: 'Show' }).click();
    assert.equal(await box.getAttribute('type'), 'text');
    await noSidewaysScroll();
    await shot('09-password');
  });

  await check('Passphrase maker: 4 words, "Make another" changes it, "Check this one" rates it Very strong', async () => {
    const phrase = page.getByTestId('phrase');
    const first = (await phrase.innerText()).trim();
    assert.match(first, /^[a-z]+(-[a-z]+){3}$/);
    await page.getByRole('button', { name: 'Make another' }).click();
    const second = (await phrase.innerText()).trim();
    assert.notEqual(second, first);
    await page.getByRole('button', { name: 'Check this one' }).click();
    assert.equal(await page.getByLabel('Password to check').inputValue(), second);
    assert.equal((await page.locator('.pw-label').innerText()).trim(), 'Very strong');
    await shot('10-passphrase');
  });

  await check('PRIVACY: typing passwords made no network request, and nothing was put in browser storage', async () => {
    const before = requests.length;
    const box = page.getByLabel('Password to check');
    const secret = 'Zq-unique-test-value-7731';
    await box.fill('');
    await box.pressSequentially(secret, { delay: 5 });
    assert.equal((await page.locator('.pw-label').innerText()).trim(), 'Very strong');
    await page.waitForTimeout(300);
    assert.equal(requests.length, before, 'a request was made while typing a password');
    // Nothing typed on this screen appears in any request made during the whole test run.
    for (const typed of [secret, 'Summer2024', 'P@ssw0rd', 'P%40ssw0rd']) {
      assert.ok(!requests.some((r) => r.url.includes(typed) || r.body.includes(typed)), `"${typed}" was found in a request`);
    }
    const stored = await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }, document.cookie]));
    assert.equal(stored, '[{},{},""]');
  });

  await check('The password box is empty again after leaving the screen and coming back', async () => {
    await menu('About').click();
    await heading('About Latchlight').waitFor();
    await menu('Password checker').click();
    assert.equal(await page.getByLabel('Password to check').inputValue(), '');
  });

  await check('About: "Start fresh" asks first, Cancel keeps the progress', async () => {
    await menu('About').click();
    await page.getByRole('button', { name: 'Start fresh' }).click();
    await page.getByText('Remove all progress?').waitFor();
    await page.getByRole('button', { name: 'Cancel' }).click();
    assert.equal(await page.getByText('Remove all progress?').count(), 0);
    const data = await (await page.request.get(URL + '/api/dashboard')).json();
    assert.equal(data.lessons.done, 4);
    await shot('11-about');
  });

  await check('About: confirming "Start fresh" empties the dashboard, and it stays empty after a reload', async () => {
    await page.getByRole('button', { name: 'Start fresh' }).click();
    await page.getByRole('button', { name: 'Yes, remove it' }).click();
    await heading('Your dashboard').waitFor();
    await page.getByRole('img', { name: 'Awareness score 0 percent' }).waitFor();
    assert.equal(await statText('lessons done'), '0 / 8');
    assert.equal(await statText('quiz average'), '–');
    assert.equal(await page.getByText('Includes sample progress').count(), 0);
    await page.locator('.next').getByRole('heading', { name: 'What phishing is' }).waitFor();
    await page.reload();
    await page.getByRole('img', { name: 'Awareness score 0 percent' }).waitFor();
    await shot('12-fresh-dashboard');
  });

  await check('An address that does not exist shows a friendly message, and a missing lesson shows an error', async () => {
    await page.goto(URL + '/nothing-here');
    await page.getByRole('heading', { name: 'That page does not exist' }).waitFor();
    await page.goto(URL + '/lessons/999');
    await page.getByText('Lesson not found.').waitFor();
  });

  await check('Opening a lesson address directly works (the server hands out the app for any address)', async () => {
    await page.goto(URL + '/lessons/5');
    await heading('Read the address bar').waitFor();
  });

  await check('On a phone-sized window the menu becomes bottom tabs and no screen scrolls sideways', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [address, title] of [['/', 'Your dashboard'], ['/lessons', 'Lessons'], ['/lessons/2', 'Five clues in a message'], ['/quiz', 'Quizzes'], ['/quiz/browsing', 'Safe browsing quiz'], ['/spot', 'Spot the phish'], ['/password', 'Password checker'], ['/about', 'About Latchlight']]) {
      await page.goto(URL + address);
      await heading(title).waitFor();
      await noSidewaysScroll();
    }
    await page.goto(URL + '/spot');
    await heading('Spot the phish').waitFor();
    const nav = await page.locator('.nav').boundingBox();
    assert.equal(Math.round(nav.y + nav.height), 844, 'the tabs should sit at the bottom');
    assert.equal(nav.width, 390);
    await menu('Spot the phish').waitFor(); // the tabs keep their full names for screen readers
    for (const link of await page.locator('.nav a').all()) assert.ok((await link.boundingBox()).height >= 44, 'tab is too small to tap');
    await shot('13-phone-spot');
    await page.goto(URL);
    await heading('Your dashboard').waitFor();
    await shot('14-phone-dashboard');
  });

  await check('Keyboard: Tab reaches the menu first and the focused link has a visible outline', async () => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto(URL);
    await heading('Your dashboard').waitFor();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      const style = getComputedStyle(el);
      return { text: el.textContent.trim(), outline: style.outlineStyle, width: style.outlineWidth };
    });
    assert.match(focused.text, /Dashboard/);
    assert.equal(focused.outline, 'solid');
    assert.equal(focused.width, '3px');
  });

  await check('No errors were printed in the browser console during the whole run', async () => {
    // The one deliberate bad address (/lessons/999) shows up as a 404 line; that is expected.
    const unexpected = problems.filter((p) => !p.includes('404 (Not Found)'));
    assert.deepEqual(unexpected, []);
  });
} finally {
  await browser?.close();
  server.kill();
  fs.rmSync(tmp, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed, ${results.length} total\n`);
process.exit(failed ? 1 : 0);
