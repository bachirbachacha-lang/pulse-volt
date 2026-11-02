// Desktop capture of the Bear be matcha v4 sample for the laptop shot (CDN scripts and fonts served from local copies).
const { chromium } = require('playwright');
const fs = require('fs');
const ROOT = '/home/user/pulse-volt/';
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, reducedMotion: process.env.RM || 'no-preference' });
  await ctx.clock.install({ time: new Date('2026-11-02T16:21:00') });
  await ctx.route(/cdnjs\.cloudflare\.com.*gsap\.min\.js/, r => r.fulfill({ path: ROOT + 'ads/crewup/x/lib/gsap.min.js', contentType: 'application/javascript' }));
  await ctx.route(/cdnjs\.cloudflare\.com.*ScrollTrigger\.min\.js/, r => r.fulfill({ path: ROOT + 'ads/motion/lib/ScrollTrigger.min.js', contentType: 'application/javascript' }));
  await ctx.route(/fonts\.googleapis\.com/, r => r.fulfill({ contentType: 'text/css', body: `
    @font-face{font-family:'Baloo Bhaijaan 2';src:url(http://127.0.0.1:8766/ads/crewup/fonts/baloobhaijaan2-arabic-var.woff2) format('woff2');font-weight:400 800;unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F}
    @font-face{font-family:'Baloo Bhaijaan 2';src:url(http://127.0.0.1:8766/ads/crewup/fonts/baloobhaijaan2-latin-var.woff2) format('woff2');font-weight:400 800;unicode-range:U+0000-00FF,U+2000-206F,U+20AC,U+2122}` }));
  await ctx.route(/fonts\.gstatic\.com/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => console.error('page error:', e.message));
  await p.goto('http://127.0.0.1:8766/pixel-co/samples/bearbematcha-v4/index.html');
  await p.evaluate(() => document.fonts.ready);
  await ctx.clock.runFor(4000);
  await p.waitForTimeout(300);
  await p.screenshot({ path: OUT, type: 'jpeg', quality: 92 });
  console.log('saved', OUT);
  await b.close();
})();
