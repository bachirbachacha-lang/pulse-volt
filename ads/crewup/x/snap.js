// Exports every [data-snap] element of x/ui.html as x/tex/<name>.png at 3x (transparent corners).
// Usage (from ads/crewup): BASE=http://127.0.0.1:8765/ node x/snap.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const out = path.join(__dirname, 'tex');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 4000, height: 3000 }, deviceScaleFactor: 3 });
  p.on('pageerror', e => console.error('page error:', e.message));
  const base = process.env.BASE || 'file://' + path.resolve(__dirname, '..') + '/';
  await p.goto(base + 'x/ui.html');
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
  await p.addStyleTag({ content: 'body{background:transparent!important}' });
  const names = await p.$$eval('[data-snap]', els => els.map(e => e.dataset.snap));
  for (const n of names) {
    await p.locator(`[data-snap="${n}"]`).screenshot({ path: path.join(out, n + '.png'), omitBackground: true });
    console.log(n);
  }
  await browser.close();
})();
