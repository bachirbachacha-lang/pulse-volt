import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [src,out,w,h,pre]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto('file://'+src);await p.waitForTimeout(800);await p.screenshot({path:out+'/'+pre+'00.png'});await p.waitForTimeout(4200);
const go=async(sel,f=0)=>{await p.evaluate(([s,f])=>{const el=document.querySelector(s);scrollTo(0,el.getBoundingClientRect().top+scrollY+el.offsetHeight*f)},[sel,f]);await p.waitForTimeout(2600)};
let i=1;const snap=async()=>p.screenshot({path:out+'/'+pre+String(i++).padStart(2,'0')+'.png'});
await snap();
for(const s of ['#scene-1','#scene-2','#scene-3','#scene-4','#scene-5']){await go(s,.3);await snap()}
await go('#showroom');await snap();
await p.click('[data-view="side"]');await p.waitForTimeout(2000);await snap();
await p.click('#explodeBtn');await p.waitForTimeout(2200);await snap();
await go('#story-edit',.0);await snap();await go('#gallery');await snap();await go('#specs');await snap();await go('#shop');await snap();
await p.click('#addBtn');await p.waitForTimeout(1200);await snap();
console.log('errors',errs,'w',await p.evaluate(()=>document.documentElement.scrollWidth));await b.close();
