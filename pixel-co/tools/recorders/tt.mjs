import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const D='/home/user/pulse-volt/pixel-co/stories/';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:3000}});
await p.goto('file://'+D+'tt.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(600);
await (await p.$('#pfp')).screenshot({path:D+'tiktok-profile-picture.png'});
await (await p.$('#cov')).screenshot({path:D+'tiktok-pinned-cover.png'});
await b.close();
