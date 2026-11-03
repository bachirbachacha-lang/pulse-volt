import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [src,out,w,h,pre]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto('file://'+src);await p.waitForTimeout(3800);
let i=0;const snap=async()=>p.screenshot({path:out+'/'+pre+String(i++).padStart(2,'0')+'.png'});await snap();
const go=async(y)=>{await p.evaluate(y=>{if(window.__lenis)__lenis.scrollTo(y,{immediate:true});else scrollTo(0,y)},y);await p.waitForTimeout(1600)};
const top=(s,f=0)=>p.evaluate(([s,f])=>{const e=document.querySelector(s);return e.getBoundingClientRect().top+scrollY+e.offsetHeight*f},[s,f]);
for(const [s,f] of [['.statement',0],['#design',.15],['#bp',-.2],['#apart',.35],['#apart',.62],['#finStage',-.15],['#bandStage',-.1],['#details',0],['#details',.5],['#time',.2],['.finale',.1]]){await go(await top(s,f));await snap()}
await go(await top('#finStage',-.15));await p.click('#finChips [data-i="2"]');await p.waitForTimeout(1200);await snap();
console.log('errors',errs,'w',await p.evaluate(()=>document.documentElement.scrollWidth));await b.close();
