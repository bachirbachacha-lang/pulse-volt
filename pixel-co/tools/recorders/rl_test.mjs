import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file:///home/user/pulse-volt/pixel-co/showreel/reel.html#rec');await p.waitForFunction(()=>window.READY,null,{timeout:20000});
const ts=[6.5,7.2];let i=0;
const t0=Date.now();
for(const t of ts){await p.evaluate(t=>render(t),t);await p.screenshot({path:`rl-${i++}.jpg`,type:'jpeg',quality:80})}
console.log(errs,(Date.now()-t0)/ts.length,'ms/frame');await b.close();
