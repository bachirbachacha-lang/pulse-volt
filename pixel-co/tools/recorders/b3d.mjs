import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const D='/tmp/claude-0/-home-user-pulse-volt/41464516-fe55-5f32-8de9-30d09a0a93a2/scratchpad/';
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.route('**/three.min.js',r=>r.fulfill({path:D+'three/package/build/three.min.js'}));
await p.goto('http://localhost:8765/index.html#record');
await p.waitForFunction(()=>window.__ready,null,{timeout:20000});
await p.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';try{localStorage.clear()}catch(e){}});
await p.waitForTimeout(800);
const H=844;
for(const [i,c] of [[0,0],[1,1],[2,3],[3,4],[4,5]]){
  await p.evaluate(y=>scrollTo(0,y),c*H);
  for(let k=0;k<50;k++)await p.evaluate(()=>__step(1/30));
  await p.screenshot({path:D+`b3d-${i}.png`});
}
console.log(errs.slice(0,5));await b.close();
{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.route('**/three.min.js',r=>r.fulfill({path:D+'three/package/build/three.min.js'}));
await p.goto('http://localhost:8765/index.html#record');await p.waitForFunction(()=>window.__ready);
await p.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,900*5)});
for(let k=0;k<50;k++)await p.evaluate(()=>__step(1/30));
await p.screenshot({path:D+'b3d-desk.png'});await b.close();}
