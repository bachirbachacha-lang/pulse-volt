import {chromium} from '/opt/node22/lib/node_modules/playwright/index.mjs';
const S='/tmp/claude-0/-home-user-pulse-volt/41464516-fe55-5f32-8de9-30d09a0a93a2/scratchpad/';const OUT=S+'v4v/';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/cdnjs.cloudflare.com/**',r=>r.fulfill({path:S+'gsap/package/dist/'+r.request().url().split('/').pop(),contentType:'text/javascript'}));
await p.clock.install({time:new Date('2026-11-02T16:20:00')});
await p.goto('http://localhost:8766/index.html');
await p.evaluate(()=>{try{localStorage.clear()}catch(e){}
  window.go=()=>{};
  const f=document.createElement('div');f.id='finger';f.style.cssText='position:fixed;z-index:999;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(126,147,178,.45);border:2.5px solid rgba(75,42,30,.55);pointer-events:none;opacity:0';document.body.appendChild(f);
  window.__T=0;window.__sync=()=>{for(const a of document.getAnimations()){if(a.__s===undefined){a.__s=__T;a.pause()}a.currentTime=Math.max(0,__T-a.__s)}};
});
let n=0,finger=null;const DT=1000/30;
async function frame(){
  await p.clock.runFor(DT);
  let fs='';
  if(finger){if(finger.drag){fs=`opacity:1;left:${finger.x}px;top:${finger.y}px;transform:scale(1)`}else{const k=finger.k++/12;const o=k<.3?k/.3:Math.max(0,1-(k-.3)/.7);const s=1.15-.25*Math.min(1,k/.3);
    fs=`opacity:${o.toFixed(2)};left:${finger.x}px;top:${finger.y}px;transform:scale(${s.toFixed(2)})`;if(k>=1)finger=null}}
  await p.evaluate(([dt,fs])=>{__T+=dt;const f=document.getElementById('finger');f.style.opacity=0;if(fs)f.style.cssText+=';'+fs;__sync()},[DT,fs]);
  await p.screenshot({path:OUT+String(n++).padStart(4,'0')+'.jpg',type:'jpeg',quality:90});
}
const hold=async s=>{for(let i=0;i<Math.round(s*30);i++)await frame()};
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
async function scrollTo(y,s,lin){const y0=await p.evaluate(()=>scrollY);const N=Math.round(s*30);for(let i=1;i<=N;i++){const t=i/N;await p.evaluate(v=>scrollTo(0,v),y0+(y-y0)*(lin?t:ease(t)));await frame()}}
async function yOf(sel,off=80){return p.evaluate(([s,o])=>{const e=document.querySelector(s);return Math.max(0,e.getBoundingClientRect().top+scrollY-o)},[sel,off])}
async function tap(sel,pre=8,post=10){
  const r=await p.evaluate(s=>{const e=document.querySelector(s);const b=e.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2}},sel);
  finger={x:r.x,y:r.y,k:0};for(let i=0;i<pre;i++)await frame();
  await p.evaluate(s=>document.querySelector(s).click(),sel);for(let i=0;i<post;i++)await frame();
}
// 1 intro + hero
await hold(3.4);
// drag across the photo stack
const st=await p.evaluate(()=>{const r=document.getElementById('stack').getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height}});
const path=[[.5,.5],[.2,.35],[.8,.3],[.75,.75],[.5,.5]];
for(let s=0;s<path.length-1;s++)for(let i=0;i<14;i++){const t=i/14,x=st.x+st.w*(path[s][0]+(path[s+1][0]-path[s][0])*t),y=st.y+st.h*(path[s][1]+(path[s+1][1]-path[s][1])*t);
  finger={drag:1,x,y};await p.evaluate(([x,y])=>document.getElementById('stack').dispatchEvent(new PointerEvent('pointermove',{clientX:x,clientY:y,bubbles:true})),[x,y]);await frame()}
finger=null;await p.evaluate(()=>document.getElementById('stack').dispatchEvent(new PointerEvent('pointerleave')));await hold(.5);
// 2 marquee + pinned carousel
const pin=await p.evaluate(()=>{const t=ScrollTrigger.getAll().find(t=>t.pin);return{s:t.start,e:t.end}});
await scrollTo(pin.s,1.6);await hold(.5);
await scrollTo(pin.s+(pin.e-pin.s)*.34,1.6);await hold(.3);
await tap('[data-quick=banana]',8,16);
await scrollTo(pin.e,2.6);await hold(.4);
// 3 limited drop
await scrollTo(await yOf('#limited',-60),2.2,false);await hold(.6);
await scrollTo(await yOf('#limited .grid>div:last-child',300),1.2);await hold(.6);
// 4 builder: autumn
await tap('[data-pick=autumn]',8,4);
await scrollTo(await yOf('#build',70),1.0);await hold(1.6);
await scrollTo(await yOf('#extras',330),1.0);
await tap('[data-ex=dose]',8,22);
await tap('[data-ex=coco]',8,22);
await tap('[data-ex=party]',8,26);
await scrollTo(await yOf('#addBtn',560),.6);
await tap('#qp',8,10);
await tap('#addBtn',8,30);
// 5 order
await scrollTo(await yOf('#order',70),1.4);await hold(.8);
await scrollTo(await yOf('.times',260),.8);
await tap('[data-m="30"]',8,12);
await tap('#nm',8,6);
for(const ch of 'Sara'){await p.evaluate(c=>{const i=document.getElementById('nm');i.value+=c;i.dispatchEvent(new Event('input',{bubbles:true}))},ch);await hold(.17)}
await p.evaluate(()=>document.activeElement.blur());
await scrollTo(await yOf('.phone',80),1.3);await hold(2.6);
// 6 english
await scrollTo(0,1.6);
await tap('#lang',8,10);await hold(2.4);
console.log('frames',n,'errors',errs);
await b.close();
