import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const D='/tmp/claude-0/-home-user-pulse-volt/41464516-fe55-5f32-8de9-30d09a0a93a2/scratchpad/';
const b=await chromium.launch();
for(const [w,h,tag] of [[390,844,'m'],[1440,900,'d']]){
const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:w<500?2:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/pulse-volt/pixel-co/samples/samra/index.html');
await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(600);
await p.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';document.querySelectorAll('img').forEach(i=>i.loading='eager')});await p.waitForTimeout(500);
await p.screenshot({path:D+`sm-${tag}1.png`});
for(const [i,sel] of [[2,'#shop'],[3,'#craft'],[4,'#size']]){await p.evaluate(s=>scrollTo(0,document.querySelector(s).offsetTop-60),sel);await p.waitForTimeout(400);await p.screenshot({path:D+`sm-${tag}${i}.png`})}
await p.click('[data-open=vine]');await p.click('[data-size="56"]');await p.waitForTimeout(500);await p.screenshot({path:D+`sm-${tag}5.png`});
await p.click('#addBtn');await p.waitForTimeout(800);await p.click('#giftTog');await p.waitForTimeout(400);await p.screenshot({path:D+`sm-${tag}6.png`});
console.log(tag,errs,await p.evaluate(()=>document.documentElement.scrollWidth));await p.close();}
await b.close();
