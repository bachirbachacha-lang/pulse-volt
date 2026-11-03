import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const D='/tmp/claude-0/-home-user-pulse-volt/41464516-fe55-5f32-8de9-30d09a0a93a2/scratchpad/', OUT=D+'b3v/';
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const p=await ctx.newPage(); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/three.min.js',r=>r.fulfill({path:D+'three/package/build/three.min.js'}));
await p.clock.install({time:new Date('2026-10-19T15:55:00')});
await p.goto('http://localhost:8765/index.html#record');
await p.waitForFunction(()=>window.__ready,null,{timeout:30000});
await p.evaluate(()=>document.fonts.ready);
await p.evaluate(()=>{try{localStorage.clear()}catch(e){};cart=[];renderAll();
  document.documentElement.style.scrollBehavior='auto';
  const f=document.createElement('div');f.id='finger';f.style.cssText='position:fixed;z-index:99;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(126,147,178,.45);border:2.5px solid rgba(75,42,30,.55);pointer-events:none;opacity:0';document.body.appendChild(f);
  window.__T=0;window.__sync=()=>{getComputedStyle(document.body).opacity;for(const a of document.getAnimations()){if(a.__s===undefined){a.__s=__T;a.pause()}a.currentTime=Math.max(0,__T-a.__s)}};});
for(let i=0;i<20;i++)await p.evaluate(()=>__step(1/30));
let n=0,finger=null;const DT=1000/30;
async function frame(){
  await p.clock.runFor(DT);
  let fs='';
  if(finger){const k=finger.k++/12;const o=k<.3?k/.3:Math.max(0,1-(k-.3)/.7);const s=1.15-.25*Math.min(1,k/.3);fs=`opacity:${o.toFixed(2)};left:${finger.x}px;top:${finger.y}px;transform:scale(${s.toFixed(2)})`;if(k>=1)finger=null}
  await p.evaluate(([dt,fs])=>{__T+=dt;const f=document.getElementById('finger');f.style.opacity=0;if(fs)f.style.cssText+=';'+fs;__step(dt/1000);__sync()},[DT,fs]);
  await p.screenshot({path:OUT+String(n++).padStart(4,'0')+'.jpg',type:'jpeg',quality:92});
}
const hold=async s=>{for(let i=0;i<Math.round(s*30);i++)await frame()};
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
async function scrollTo(y,s){const y0=await p.evaluate(()=>scrollY);const N=Math.round(s*30);for(let i=1;i<=N;i++){await p.evaluate(v=>scrollTo(0,v),y0+(y-y0)*ease(i/N));await frame()}}
async function tap(sel,pre=8,post=10){const r=await p.evaluate(s=>{const b=document.querySelector(s).getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2}},sel);finger={x:r.x,y:r.y,k:0};for(let i=0;i<pre;i++)await frame();await p.evaluate(s=>document.querySelector(s).click(),sel);for(let i=0;i<post;i++)await frame()}
const span=await p.evaluate(()=>{const s=document.getElementById('story');return{top:s.getBoundingClientRect().top+scrollY,step:(s.offsetHeight-innerHeight)/5}});
await hold(2.6);
for(let c=1;c<=5;c++){await scrollTo(span.top+span.step*c,1.0);await hold(c===5?2.6:2.1)}
await tap('.add3',8,22);
await tap('[data-v=sfoam]',8,20);
await tap('#addBtn',8,24);
const ck=await p.evaluate(()=>document.getElementById('checkout').getBoundingClientRect().top+scrollY-70);
await scrollTo(ck,1.6); await hold(1.2);
const sh=await p.evaluate(()=>document.querySelector('.shop-sees').getBoundingClientRect().top+scrollY-140);
await scrollTo(sh,1.1); await hold(2.2);
console.log('frames',n,errs);await b.close();
