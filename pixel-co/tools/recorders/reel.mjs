import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [mode,out]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:540,height:960},deviceScaleFactor:2});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/pulse-volt/pixel-co/samples/scalp-elixir-reel/_rec.html#record',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.render,null,{timeout:20000});await Promise.race([p.evaluate(()=>document.fonts.ready.then(()=>1)),p.waitForTimeout(8000)]);await p.waitForTimeout(800);console.log('fonts',await p.evaluate(()=>[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family).join(',')));
const ts=mode==='frames'?Array.from({length:Math.round(19.6*30)},(_,i)=>i/30):[1.5,3.1,4.6,6.6,9.5,12.1,13.2,14.4,15.6,17.5];

let i=0;for(const t of ts){await p.evaluate(t=>render(t),t);await p.screenshot({path:out+'/'+(mode==='frames'?'f'+String(i).padStart(5,'0')+'.jpg':'k'+i+'.png'),type:mode==='frames'?'jpeg':'png',quality:mode==='frames'?92:undefined});i++}
console.log('errors',errs,'n',i);await b.close();
