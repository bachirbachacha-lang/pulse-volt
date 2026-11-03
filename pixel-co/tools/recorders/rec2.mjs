import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [src,dir]=process.argv.slice(2);
const FPS=30, DT=1000/FPS;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true,isMobile:true});
await ctx.addInitScript(()=>{
  window.__vt=0;const q=[];let n=1;
  window.setTimeout=(fn,ms)=>{const id=n++;q.push({t:__vt+(+ms||0),fn,id});return id};
  window.clearTimeout=id=>{const i=q.findIndex(x=>x.id===id);if(i>=0)q.splice(i,1)};
  window.__tick=dt=>{__vt+=dt;
    for(const a of document.getAnimations()){a.pause();a.currentTime=(a.currentTime||0)+dt}
    q.sort((a,b)=>a.t-b.t);while(q.length&&q[0].t<=__vt){const x=q.shift();try{x.fn()}catch(e){}}};
});
const p=await ctx.newPage();
await p.goto('file://'+src);await p.waitForTimeout(1500);
await p.addStyleTag({content:'html{scroll-behavior:auto!important}'});
await p.evaluate(()=>__tick(0));
let f=0;
const shot=async()=>{await p.evaluate(dt=>__tick(dt),DT);await p.screenshot({path:dir+'/f'+String(f++).padStart(5,'0')+'.jpg',type:'jpeg',quality:92})};
const hold=async s=>{for(let i=0;i<Math.round(s*FPS);i++)await shot()};
const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const glide=async(to,s)=>{const from=await p.evaluate(()=>scrollY);const N=Math.round(s*FPS);for(let i=1;i<=N;i++){await p.evaluate(y=>scrollTo(0,y),from+(to-from)*ease(i/N));await shot()}};
const top=sel=>p.evaluate(s=>document.querySelector(s).getBoundingClientRect().top+scrollY,sel);
await hold(2.2);
await glide((await top('#menu'))-70,1.6);await hold(1.0);
await glide((await top('#menu'))+260,0.9);await hold(0.6);
await p.tap('[data-open="isb"]');await hold(1.5);
await p.tap('[data-g="size"][data-v="lg"]');await hold(0.9);
await p.tap('[data-g="milk"][data-v="oat"]');await hold(1.3);
await p.tap('[data-g="extra"][data-v="foam"]');await hold(1.3);
await p.tap('#addBtn');await hold(1.4);
await glide((await top('#checkout'))-70,1.6);await hold(1.3);
await p.tap('[data-m="30"]');await hold(0.8);
await p.tap('#name');await hold(0.3);
for(const c of 'Noura'){await p.keyboard.type(c);await hold(0.13)}
await hold(0.5);
await glide((await top('.shop-sees'))-150,1.5);await hold(3.2);
console.log('frames',f);await b.close();
