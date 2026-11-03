import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
await p.goto('file:///home/user/pulse-volt/pixel-co/samples/samra/index.html');
await p.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';document.querySelectorAll('img').forEach(i=>i.loading='eager');document.getElementById('mag').scrollIntoView({block:'center'})});await p.waitForTimeout(800);
const r=await p.evaluate(()=>{const b=document.getElementById('mag').getBoundingClientRect();return{x:b.left+b.width*.55,y:b.top+b.height*.4}});
await p.mouse.move(r.x,r.y);await p.mouse.move(r.x+8,r.y+8);await p.waitForTimeout(400);
console.log(await p.evaluate(()=>{const m=document.getElementById('mag'),l=document.getElementById('lens');return [m.className,l.style.cssText.slice(0,200),getComputedStyle(l).opacity]}));
await p.screenshot({path:'mg.png',clip:{x:0,y:r.y-200,width:390,height:400}});await b.close();
