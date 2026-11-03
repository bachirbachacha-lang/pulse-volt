import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [mode,out]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:540,height:960},deviceScaleFactor:2});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/pulse-volt/pixel-co/samples/scalp-elixir-store-reel/index.html#record',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.render&&window.READY);
await p.evaluate(()=>READY);await Promise.race([p.evaluate(()=>document.fonts.ready.then(()=>1)),p.waitForTimeout(8000)]);await p.waitForTimeout(600);
const ts=mode==='frames'?Array.from({length:Math.round(19.6*30)},(_,i)=>i/30):[1.6,3.3,4.6,6.9,8.5,10.6,12.1,13.1,14.1,15.1,17.8];
let i=0;for(const t of ts){await p.evaluate(t=>{render(t);const im=document.getElementById('frame');return (im.complete&&im.naturalWidth)?1:Promise.race([new Promise(r=>{im.onload=r;im.onerror=r}),new Promise(r=>setTimeout(r,700))])},t);await p.screenshot({path:out+'/'+(mode==='frames'?'f'+String(i).padStart(5,'0')+'.jpg':'k'+i+'.png'),type:mode==='frames'?'jpeg':'png',quality:mode==='frames'?92:undefined});i++}
console.log('errors',errs,'n',i);await b.close();
