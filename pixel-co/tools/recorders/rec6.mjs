import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [src,dir]=process.argv.slice(2);const FPS=30,DT=1000/FPS;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
await ctx.addInitScript(()=>{window.__vt=0});
const p=await ctx.newPage();await p.goto('file://'+src);await p.waitForTimeout(2500);
await p.addStyleTag({content:'html{scroll-behavior:auto!important}.grain{animation:none!important}'});
await p.evaluate(()=>{window.__frozen=true;gsap.ticker.sleep();gsap.ticker.lagSmoothing(0);window.__g=gsap.ticker.time;window.__vt=0});
let f=0;
const shot=async()=>{await p.evaluate(dt=>{__vt+=dt;__g+=dt/1000;gsap.updateRoot(__g);ScrollTrigger.update();__render()},DT);await p.screenshot({path:dir+'/f'+String(f++).padStart(5,'0')+'.jpg',type:'jpeg',quality:90})};
const hold=async s=>{for(let i=0;i<Math.round(s*FPS);i++)await shot()};
const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const glide=async(to,s)=>{const from=await p.evaluate(()=>scrollY);const N=Math.round(s*FPS);for(let i=1;i<=N;i++){await p.evaluate(y=>scrollTo(0,y),Math.round(from+(to-from)*ease(i/N)));await shot()}};
const top=(sel,fr=0)=>p.evaluate(([s,fr])=>{const e=document.querySelector(s);return e.getBoundingClientRect().top+scrollY+e.offsetHeight*fr},[sel,fr]);
await hold(2.2);
for(const s of ['#c1','#c2','#c3','#c4','#pick']){await glide(await top(s,.15),1.6);await hold(1.6)}
for(const i of [1,2,3,4,0]){await p.evaluate(i=>document.querySelector('#sw [data-i="'+i+'"]').click(),i);await hold(1.1)}
await glide(await p.evaluate(()=>document.body.scrollHeight-innerHeight),2.0);await hold(2.4);
console.log('frames',f);await b.close();
