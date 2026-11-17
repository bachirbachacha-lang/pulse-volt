const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
(async()=>{const [out,only]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});p.on('pageerror',e=>console.error('page error:',e.message));
await p.goto('http://127.0.0.1:8767/'+(process.env.PAGE||'index.html')+'');await p.waitForFunction('window.ready===true',null,{timeout:120000});
const dur=await p.evaluate('window.DUR');const cues=await p.evaluate('window.SFX||null');if(cues)fs.writeFileSync(path.join(out,'sfx.json'),JSON.stringify(cues)),times=only?only.split(',').map(Number):Array.from({length:Math.round(dur*30)},(_,i)=>i/30);const t0=Date.now();
for(let i=0;i<times.length;i++){await p.evaluate(t=>window.renderAt(t),times[i]);await p.screenshot({path:path.join(out,only?`s_${times[i]}.jpg`:`f${String(i).padStart(5,'0')}.jpg`),type:'jpeg',quality:92});if(i%60===0&&!only)console.log(i,'/',times.length,((Date.now()-t0)/Math.max(1,i)).toFixed(0),'ms/f');}
await b.close();})();
