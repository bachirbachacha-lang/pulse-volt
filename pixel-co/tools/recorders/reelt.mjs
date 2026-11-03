import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:540,height:960},deviceScaleFactor:2});
await p.goto('file:///home/user/pulse-volt/pixel-co/samples/scalp-elixir-reel/_rec.html#record',{waitUntil:'domcontentloaded'});
console.log('loaded');await p.waitForFunction(()=>window.seek,null,{timeout:20000});console.log('seekfn');await p.waitForTimeout(3000);console.log('waited');
console.log('ping',await p.evaluate(()=>1+1));console.log('dur',await p.evaluate(()=>TL.duration()));for(const tt of [0.01,0.2,0.4,0.8]){let a=Date.now();await p.evaluate(tt=>TL.seek(tt,true),tt);console.log('seek',tt,Date.now()-a)}let t0=Date.now();console.log('seek',Date.now()-t0);
t0=Date.now();await p.screenshot({path:'/tmp/claude-0/-home-user-pulse-volt/41464516-fe55-5f32-8de9-30d09a0a93a2/scratchpad/rk/t.png',timeout:60000});console.log('shot',Date.now()-t0);
await b.close();
