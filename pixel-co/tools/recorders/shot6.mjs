import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [src,out,w,h,pre]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto('file://'+src);await p.waitForTimeout(3500);
let i=0;const snap=async()=>p.screenshot({path:out+'/'+pre+(i++)+'.png'});await snap();
for(const s of ['#c1','#c2','#c3','#c4','#pick']){await p.evaluate(s=>{const e=document.querySelector(s);scrollTo(0,e.getBoundingClientRect().top+scrollY+e.offsetHeight*.15)},s);await p.waitForTimeout(3200);await snap()}
await p.click('#sw [data-i="2"]');await p.waitForTimeout(2500);await snap();
await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(3200);await snap();
console.log('errors',errs,'w',await p.evaluate(()=>document.documentElement.scrollWidth));await b.close();
