import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const D='/home/user/pulse-volt/pixel-co/stories/';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+D+'how.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(800);
await p.screenshot({path:D+'how-it-works-story.png'});
for(const k of ['samples','how']){await p.goto('file://'+D+'cover.html?k='+k);await p.waitForTimeout(200);await p.screenshot({path:D+'cover-'+k+'.png'})}
await b.close();
