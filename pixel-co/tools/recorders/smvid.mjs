import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const OUT='/tmp/claude-0/-home-user-pulse-volt/41464516-fe55-5f32-8de9-30d09a0a93a2/scratchpad/smv/';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.clock.install({time:new Date('2026-10-19T15:55:00')});
await p.goto('file:///home/user/pulse-volt/pixel-co/samples/samra/index.html');
await p.evaluate(()=>document.fonts.ready);
await p.evaluate(()=>{try{localStorage.clear()}catch(e){};bag=[];renderStatic();renderBag();document.querySelectorAll('img').forEach(i=>i.loading='eager');
  document.documentElement.style.scrollBehavior='auto';
  const f=document.createElement('div');f.id='finger';f.style.cssText='position:fixed;z-index:99;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(126,147,178,.45);border:2.5px solid rgba(75,42,30,.55);pointer-events:none;opacity:0';document.body.appendChild(f);
  window.__T=0;window.__sync=()=>{getComputedStyle(document.body).opacity;for(const a of document.getAnimations()){if(a.__s===undefined){a.__s=__T;a.pause()}a.currentTime=Math.max(0,__T-a.__s)}};
});
await p.waitForTimeout(1500);
let n=0, finger=null; const DT=1000/30;
async function frame(){
  await p.clock.runFor(DT);
  let fs='';
  if(finger){const k=finger.k++/12;const o=k<.3?k/.3:Math.max(0,1-(k-.3)/.7);const s=1.15-.25*Math.min(1,k/.3);
    fs=`opacity:${o.toFixed(2)};left:${finger.x}px;top:${finger.y}px;transform:scale(${s.toFixed(2)})`; if(k>=1)finger=null;}
  await p.evaluate(([dt,fs])=>{__T+=dt;const f=document.getElementById('finger');f.style.opacity=0;if(fs)f.style.cssText+=';'+fs;__sync()},[DT,fs]);
  await p.screenshot({path:OUT+String(n++).padStart(4,'0')+'.jpg',type:'jpeg',quality:92});
}
const hold=async s=>{for(let i=0;i<Math.round(s*30);i++)await frame()};
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
async function scrollTo(y,s){const y0=await p.evaluate(()=>scrollY);const N=Math.round(s*30);for(let i=1;i<=N;i++){await p.evaluate(v=>scrollTo(0,v),y0+(y-y0)*ease(i/N));await frame()}}
async function yOf(sel,off=90){return p.evaluate(([s,o])=>{const e=document.querySelector(s);return Math.max(0,e.getBoundingClientRect().top+scrollY-o)},[sel,off])}
async function tap(sel,pre=8,post=10){
  const r=await p.evaluate(s=>{const e=document.querySelector(s);const b=e.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2}},sel);
  finger={x:r.x,y:r.y,k:0}; for(let i=0;i<pre;i++)await frame();
  await p.evaluate(s=>document.querySelector(s).click(),sel); for(let i=0;i<post;i++)await frame();
}
// 1 hero
await hold(2.6);
// 2 collection
await scrollTo(await yOf('#shop',60),1.3); await hold(1.0);
await tap('[data-open=vine]',8,24);
await tap('[data-img="1"]',8,22);
await tap('[data-size="56"]',8,14);
await tap('[data-hijab]',8,18);
await tap('#addBtn',8,40);
await tap('#giftTog',8,26);
await hold(1.2);
await tap('#closeBag',8,14);
// 3 craft + magnifier
await scrollTo(await yOf('#mag',140),1.4);
{const r=await p.evaluate(()=>{const b=document.getElementById('mag').getBoundingClientRect();return{x:b.left,y:b.top,w:b.width,h:b.height}});
 await p.evaluate(()=>document.getElementById('mag').classList.add('on'));
 for(let i=0;i<45;i++){const t=i/44,x=r.x+r.w*(.3+.4*t),y=r.y+r.h*(.55-.25*Math.sin(t*3));
   await p.evaluate(([x,y])=>{const m=document.getElementById('mag');m.dispatchEvent(new PointerEvent('pointermove',{clientX:x,clientY:y,pointerType:'mouse',bubbles:true}))},[x,y]);await frame()}
 await p.evaluate(()=>document.getElementById('mag').classList.remove('on'));}
// 4 size finder
await scrollTo(await yOf('#size',60),1.3);
for(let i=0;i<30;i++){await p.evaluate(v=>{const h=document.getElementById('height');h.value=v;h.dispatchEvent(new Event('input',{bubbles:true}))},Math.round(158+i*.4));await frame()}
await hold(1.4);
// 5 lookbook
await scrollTo(await yOf('#look',160),1.2);
for(let i=0;i<40;i++){await p.evaluate(v=>document.getElementById('look').scrollLeft=-v,i*14);await frame()}
await hold(0.8);
// 6 english
await scrollTo(0,1.4);
await tap('#lang',8,10); await hold(2.2);
console.log('frames',n,'errs',errs);
await b.close();
