const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
for(const s of ['cafe','abaya','detail']){await p.goto('file://'+process.cwd()+'/screens.html?site='+s);await p.waitForFunction(()=>window.READY);
 for(const t of [0.3,1.6,3.4,5.0,6.2]){await p.evaluate(t=>setTime(t),t);await p.screenshot({path:`/tmp/claude-0/-home-claude/e0a25d60-53b3-58db-9b67-7dc13b1bba08/scratchpad/scr_${s}_${t}.png`});}}
console.log('errs',errs);await b.close();})();
