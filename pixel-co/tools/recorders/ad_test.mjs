import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/pulse-volt/pixel-co/samples/bearbematcha-ad/ad.html#rec');await p.waitForFunction(()=>window.READY,null,{timeout:20000});
const ts=process.argv.slice(2).map(Number);let i=0;const cv=await p.$('canvas');
for(const t of ts){await p.evaluate(t=>render(t),t);await cv.screenshot({path:`ad-${i++}.jpg`,type:'jpeg',quality:80})}
console.log(errs);await b.close();
