import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [src,out,w,h,pre]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto('file://'+src);await p.addStyleTag({content:'html{scroll-behavior:auto!important}'});await p.waitForTimeout(2500);
const ys=await p.evaluate(()=>[...document.querySelectorAll('[data-key]:not([hidden])')].map(s=>s.getBoundingClientRect().top+scrollY));
const H=+h;const stops=ys.map(y=>y);
let i=0;for(const y of stops){await p.evaluate(y=>scrollTo(0,y),Math.round(y));await p.waitForTimeout(700);await p.screenshot({path:out+'/'+pre+(i++)+'.png'})}
console.log('errors',errs,'w',await p.evaluate(()=>document.documentElement.scrollWidth));await b.close();
