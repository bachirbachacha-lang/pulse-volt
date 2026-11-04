// node mk_track.js <outDir>: card PNGs + one 747-frame screen track following timeline.json
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const out=process.argv[2];fs.mkdirSync(out+'/track',{recursive:true});fs.mkdirSync(out+'/cards',{recursive:true});
const TL=JSON.parse(fs.readFileSync('timeline.json'));
const b=await chromium.launch();
// cards
const c=await b.newPage({viewport:{width:600,height:2400},deviceScaleFactor:3});
await c.goto('file://'+process.cwd()+'/parts.html');await c.waitForFunction(()=>window.READY);
await c.evaluate(()=>Promise.all([...document.querySelectorAll('[style*=url]')].map(e=>new Promise(r=>{const u=getComputedStyle(e).backgroundImage.slice(5,-2);const i=new Image();i.onload=i.onerror=r;i.src=u;}))));
for(const id of await c.$$eval('#cards > .card, #cards2 > .card',a=>a.map(e=>e.id))){const el=await c.$('#'+id);await el.screenshot({path:`${out}/cards/${id}.png`,omitBackground:true});}
// screen pages
const pages={};
for(const s of ['cafe','abaya','detail']){const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});await p.goto('file://'+process.cwd()+'/screens.html?site='+s);await p.waitForFunction(()=>window.READY);pages[s]=p;}
const e=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});await e.goto('file://'+process.cwd()+'/parts.html?end=1');await e.waitForFunction(()=>window.READY);pages.end=e;
const N=Math.round(TL.duration*TL.fps);
for(let i=0;i<N;i++){const T=i/TL.fps;const sg=TL.segments.find(s=>T>=s.from&&T<s.to)||TL.segments[TL.segments.length-1];
  const f=`${out}/track/f${String(i).padStart(4,'0')}.jpg`;
  if(sg.site==='off'){fs.copyFileSync(out+'/black.jpg',f);continue;}
  if(sg.site==='bbm'){const k=Math.min(199,Math.max(1,Math.round((T-sg.from)*30)+1));fs.copyFileSync(`${out}/bbmframes/b${String(k).padStart(4,'0')}.jpg`,f);continue;}
  const p=pages[sg.site];await p.evaluate(t=>setTime(t),sg.t0+(T-sg.from)*sg.speed);await p.screenshot({path:f,type:'jpeg',quality:92});}
await b.close();console.log('frames',N);})();
