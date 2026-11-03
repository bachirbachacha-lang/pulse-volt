import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [src,out,w,h,pre]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:+w<500?2:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto('file://'+src);await p.waitForTimeout(2000);
const H=await p.evaluate(()=>document.documentElement.scrollHeight);
const stops=[0,.12,.22,.30,.38,.55,.68,.82,1];
let i=0;for(const s of stops){await p.evaluate(y=>scrollTo(0,y),Math.round((H-+h)*s));await p.waitForTimeout(500);await p.screenshot({path:out+'/'+pre+(i++)+'.png'})}
console.log('errors',errs,'w',await p.evaluate(()=>document.documentElement.scrollWidth),'H',H);await b.close();
