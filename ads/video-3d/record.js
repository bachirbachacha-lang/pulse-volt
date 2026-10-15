// Renders the 3D scene frame by frame and saves JPEGs.
// Usage: node record.js <cut> <outDir> [fps] [onlyTimes,comma,separated]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const [cut = 'hero', out = 'frames', fpsArg = '30', only] = process.argv.slice(2);
  const fps = Number(fpsArg);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + `?cut=${cut}&record=1`);
  await page.waitForFunction('window.ready === true');
  const dur = await page.evaluate('window.DUR');
  const times = only ? only.split(',').map(Number) : Array.from({ length: Math.round(dur * fps) }, (_, i) => i / fps);
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(t => window.renderAt(t), times[i]);
    await page.screenshot({ path: path.join(out, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    if (i % 30 === 0) console.log(`${cut} ${i}/${times.length}`);
  }
  await browser.close();
})();
