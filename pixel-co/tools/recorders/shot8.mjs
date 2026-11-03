import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [src,out,w,h,pre]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto('file://'+src);await p.waitForTimeout(3000);
let i=0;for(const f of [.02,.22,.42,.62,.8,.97]){await p.evaluate(f=>{const e=document.querySelector('#apart');const y=e.offsetTop+(e.offsetHeight-innerHeight)*f;if(window.__lenis)__lenis.scrollTo(y,{immediate:true});else scrollTo(0,y)},f);await p.waitForTimeout(1500);await p.screenshot({path:out+'/'+pre+(i++)+'.png'})}
console.log('errors',errs,'w',await p.evaluate(()=>document.documentElement.scrollWidth));await b.close();
