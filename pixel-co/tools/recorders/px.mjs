import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const D='/tmp/claude-0/-home-user-pulse-volt/41464516-fe55-5f32-8de9-30d09a0a93a2/scratchpad/';
const b=await chromium.launch();
for(const [w,h,tag] of [[390,844,'m'],[1440,900,'d']]){
const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:w<500?2:1});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8766/index.html');await p.waitForTimeout(1200);await p.screenshot({path:D+`px-${tag}0.png`});
await p.waitForTimeout(2600);await p.screenshot({path:D+`px-${tag}1.png`});
await p.evaluate(()=>document.documentElement.style.scrollBehavior='auto');
let i=2;for(const id of ['work','liq','how','reel']){await p.evaluate(s=>{document.getElementById(s).scrollIntoView();scrollBy(0,40)},id);await p.waitForTimeout(900);await p.screenshot({path:D+`px-${tag}${i++}.png`})}
await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(800);await p.screenshot({path:D+`px-${tag}${i++}.png`});
console.log(tag,errs,await p.evaluate(()=>document.documentElement.scrollWidth));await p.close()}
await b.close();
