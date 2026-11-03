import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
await p.goto('file:///home/user/pulse-volt/pixel-co/samples/breath/index.html');await p.waitForTimeout(500);
await p.click('#cartBtn');await p.waitForTimeout(800);
console.log(await p.evaluate(()=>{const e=document.elementFromPoint(200,130);const o=[];let n=e;while(n){const cs=getComputedStyle(n);o.push(n.tagName+'#'+n.id+'.'+n.className+' op='+cs.opacity+' col='+cs.color);n=n.parentElement}return o}));
await b.close();
