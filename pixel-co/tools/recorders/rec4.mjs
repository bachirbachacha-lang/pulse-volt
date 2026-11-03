import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [src,dir,w,h,dpr]=process.argv.slice(2);
const FPS=30,DT=1000/FPS;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const ctx=await b.newContext({viewport:{width:+w,height:+h},deviceScaleFactor:+dpr});
await ctx.addInitScript(()=>{window.__vt=0;const q=[];let n=1;
  window.setTimeout=(fn,ms)=>{const id=n++;q.push({t:__vt+(+ms||0),fn,id});return id};
  window.__tick=dt=>{__vt+=dt;for(const a of document.getAnimations()){a.pause();a.currentTime=(a.currentTime||0)+dt}
    q.sort((a,b)=>a.t-b.t);while(q.length&&q[0].t<=__vt){const x=q.shift();try{x.fn()}catch(e){}}}});
const p=await ctx.newPage();await p.goto('file://'+src);await p.waitForTimeout(2000);
await p.addStyleTag({content:'html{scroll-behavior:auto!important}'});
let f=0;
const shot=async()=>{await p.evaluate(dt=>{__tick(dt);window.__frozen=true;window.__render&&__render()},DT);await p.screenshot({path:dir+'/f'+String(f++).padStart(5,'0')+'.jpg',type:'jpeg',quality:92})};
const hold=async s=>{for(let i=0;i<Math.round(s*FPS);i++)await shot()};
const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const glide=async(to,s,e=ease)=>{const from=await p.evaluate(()=>scrollY);const N=Math.round(s*FPS);for(let i=1;i<=N;i++){await p.evaluate(y=>{scrollTo(0,y);dispatchEvent(new Event('scroll'))},Math.round(from+(to-from)*e(i/N)));await shot()}};
const top=sel=>p.evaluate(s=>document.querySelector(s).getBoundingClientRect().top+scrollY,sel);
const vh=+h;
const ys=await p.evaluate(()=>[...document.querySelectorAll('[data-key]:not([hidden])')].map(s=>s.getBoundingClientRect().top+scrollY));
await hold(1.8);
for(let k=1;k<ys.length;k++){await glide(ys[k],k===1?2.6:1.5);await hold(k===1?0.3:1.0);}
await hold(1.0);
console.log('frames',f);await b.close();
