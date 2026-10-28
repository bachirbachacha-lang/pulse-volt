// Records the SUKKAR sample on a phone-size screen: scroll to the menu, add an item,
// open the order, press "send on WhatsApp". Saves frames + the real order message text.
// Usage: node record-sukkar-order.js <outDir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const out = process.argv[2] || 'frames/sukkar-order';
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 600 / 390 });
  await p.goto('file://' + path.resolve(__dirname, '../../pixel-co/samples/sukkar/index.html'));
  await p.waitForTimeout(2000);
  await p.addStyleTag({ content: `html{scroll-behavior:auto!important}
    #tap{position:fixed;z-index:99999;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;
    background:rgba(255,255,255,.45);border:3px solid rgba(40,20,20,.55);pointer-events:none;opacity:0}` });
  await p.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div id="tap"></div>'));

  const tap = (x, y, k) => p.evaluate(([x, y, k]) => {   // k: 0..1 press animation, -1 hidden
    const t = document.getElementById('tap');
    t.style.left = x + 'px'; t.style.top = y + 'px';
    t.style.opacity = k < 0 ? 0 : String(1 - Math.max(0, k - .6) / .4);
    t.style.transform = `scale(${k < 0 ? 1 : 1.25 - .35 * Math.min(1, k / .4)})`;
  }, [x, y, k]);
  const center = sel => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel);
  const ease = x => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2;

  const menuY = await p.evaluate(() => document.getElementById('menu').getBoundingClientRect().top + scrollY);
  const endY = menuY + 330;
  let f = 0;
  const shot = async () => { await p.screenshot({ path: path.join(out, String(++f).padStart(3, '0') + '.jpg'), type: 'jpeg', quality: 90 }); };

  // 1) hero, then scroll down to the menu (60 frames)
  for (let i = 0; i < 60; i++) { await p.evaluate(y => scrollTo(0, y), endY * ease((i - 8) / 50)); await tap(0, 0, -1); await shot(); }
  // 2) tap "+ add" on a visible menu item that isn't the macarons already in the order
  const addSel = await p.evaluate(() => {
    const el = [...document.querySelectorAll('[data-add]')].find(e => { const r = e.getBoundingClientRect(); return e.dataset.add !== 'mac' && r.top > 250 && r.bottom < 760; });
    return `[data-add="${el.dataset.add}"]`;
  });
  let [x, y] = await center(addSel);
  for (let i = 0; i < 18; i++) { if (i === 8) await p.click(addSel); await tap(x, y, i / 14); await shot(); }
  // 3) tap the order bag
  [x, y] = await center('#bagBtn');
  for (let i = 0; i < 16; i++) { if (i === 8) await p.click('#bagBtn'); await tap(x, y, i / 14); await shot(); await p.waitForTimeout(30); }
  // 4) order drawer open, then press "send on WhatsApp" (we don't follow the link)
  for (let i = 0; i < 14; i++) { await tap(0, 0, -1); await shot(); await p.waitForTimeout(40); }
  await p.evaluate(() => document.getElementById('waBtn').scrollIntoView({ block: 'center' }));
  [x, y] = await center('#waBtn');
  for (let i = 0; i < 18; i++) { await tap(x, y, i / 14); await shot(); }
  fs.writeFileSync(path.join(out, 'message.txt'), await p.evaluate(() => msg()));
  console.log('frames', f);
  await b.close();
})();
