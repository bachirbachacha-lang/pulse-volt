import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
await p.route('**/three.min.js',r=>r.abort());
await p.goto('http://localhost:8765/index.html');
await p.evaluate(()=>scrollTo(0,844));
console.log(await p.evaluate(()=>[[3,400],[200,830],[386,400]].map(([x,y])=>{let e=document.elementFromPoint(x,y);const o=[];while(e&&o.length<4){o.push(e.tagName+'#'+e.id+'.'+e.className);e=e.parentElement}return o.join(' < ')})));
await b.close();
