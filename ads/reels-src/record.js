// Renders one reel frame by frame to JPEGs, then make the MP4 with ffmpeg (see README.md).
// Usage: node record.js <cut> <outDir> [onlyTimes,comma,separated]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const [cut = 'ritual', out = 'out', only] = process.argv.slice(2);
  const fps = 30;
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + `?cut=${cut}`);
  await page.waitForFunction('window.ready === true');
  const dur = await page.evaluate('window.DUR');
  const times = only ? only.split(',').map(Number) : Array.from({ length: Math.round(dur * fps) }, (_, i) => i / fps);
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(t => window.renderAt(t), times[i]);
    await page.screenshot({ path: path.join(out, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    if (i % 60 === 0) console.log(`${cut} ${i}/${times.length}`);
  }
  await browser.close();
})();
