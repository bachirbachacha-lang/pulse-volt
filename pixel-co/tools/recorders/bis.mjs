import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
async function test(k){const p=await b.newPage({viewport:{width:540,height:960}});await p.goto('file:///home/user/pulse-volt/pixel-co/samples/scalp-elixir-reel/_rec.html?k='+k+'#record',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.seek);const n=await p.evaluate(()=>NCH);
 const r=await Promise.race([p.evaluate(()=>{for(const tt of [0.01,1.5,3,5,9,13,17,19]){TL.seek(tt,true)}return 'ok'}),new Promise(r=>setTimeout(()=>r('hang'),4000))]);await p.close().catch(()=>{});return [n,r]}
const [N]=await test(-1);console.log('N',N);let lo=0,hi=N;
while(hi-lo>1){const m=(lo+hi)>>1;const [,r]=await test(m);console.log(m,r);if(r==='hang')hi=m;else lo=m}
console.log('culprit index',lo);
const p=await b.newPage();await p.goto('file:///home/user/pulse-volt/pixel-co/samples/scalp-elixir-reel/_rec.html?k=999#record',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.seek);
console.log(await p.evaluate(i=>{const c=TL.getChildren(false,true,true)[i];return JSON.stringify({start:c.startTime(),dur:c.duration(),targets:(c.targets?c.targets().map(t=>t.id||t.className||typeof t):[]),vars:Object.keys(c.vars)})},lo));
await b.close();
