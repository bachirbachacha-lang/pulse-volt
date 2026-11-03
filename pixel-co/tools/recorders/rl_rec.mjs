import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const O='/tmp/claude-0/-home-user-pulse-volt/41464516-fe55-5f32-8de9-30d09a0a93a2/scratchpad/rlf/';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/pulse-volt/pixel-co/showreel/reel.html#rec');await p.waitForFunction(()=>window.READY,null,{timeout:20000});
const cv=await p.$('canvas');
for(let f=0;f<900;f++){await p.evaluate(t=>render(t),f/60);await cv.screenshot({path:O+String(f).padStart(4,'0')+'.jpg',type:'jpeg',quality:94})}
console.log('done',errs);await b.close();
