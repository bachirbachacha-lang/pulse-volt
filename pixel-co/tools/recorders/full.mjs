import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
await p.goto('file:///tmp/claude-0/-home-user-pulse-volt/41464516-fe55-5f32-8de9-30d09a0a93a2/scratchpad/se-full.html');await p.waitForTimeout(2500);
await p.addStyleTag({content:'.ritual{height:auto!important}.ritual .stick{position:relative!important;height:auto!important;padding-block:60px}.steps li{opacity:1!important}'});
await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=400){scrollTo(0,y);await new Promise(r=>setTimeout(r,80))}scrollTo(0,0)});await p.waitForTimeout(800);
await p.screenshot({path:'/home/user/pulse-volt/pixel-co/samples/scalp-elixir-reel/img/site.png',fullPage:true});await b.close();
