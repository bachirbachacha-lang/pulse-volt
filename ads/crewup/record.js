// Renders a motion page frame by frame to JPEGs (30 fps). The page must expose
// window.DUR, window.ready and an async-or-sync window.renderAt(t).
// Usage: node record.js <page.html> <cut> <outDir> [onlyTimes,comma,separated]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const [page = 'glow.html', cut = '', out = 'out', only] = process.argv.slice(2);
  const fps = 30;
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  // W/H env vars render other sizes (landscape: W=1920 H=1080)
  const p = await browser.newPage({ viewport: { width: +process.env.W || 1080, height: +process.env.H || 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('page error:', e.message));
  // BASE (e.g. http://127.0.0.1:8765/) serves pages over http so textures load without file:// limits
  const url = (process.env.BASE ? process.env.BASE + page : 'file://' + path.resolve(__dirname, page)) + `?cut=${cut}&record=1${process.env.EXTRA || ''}`;
  await p.goto(url);
  await p.waitForFunction('window.ready === true', null, { timeout: 60000 });
  const dur = await p.evaluate('window.DUR');
  const cues = await p.evaluate('window.SFX || null');
  if (cues) fs.writeFileSync(path.join(out, 'sfx.json'), JSON.stringify({ dur, cues }));
  const times = only ? only.split(',').map(Number) : Array.from({ length: Math.round(dur * fps) }, (_, i) => i / fps);
  const t0 = Date.now();
  for (let i = 0; i < times.length; i++) {
    await p.evaluate(t => window.renderAt(t), times[i]);
    await p.screenshot({ path: path.join(out, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    if (i % 90 === 0) console.log(`${page} ${cut} ${i}/${times.length} ${((Date.now() - t0) / Math.max(1, i)).toFixed(0)} ms/frame`);
  }
  await browser.close();
})();
