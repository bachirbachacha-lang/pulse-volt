// node rec_overlay.js <outDir>: transparent PNG frames of overlay.html, 747 frames @30fps
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
await p.goto('file://'+process.cwd()+'/'+(process.env.OV||'overlay.html'));await p.waitForFunction(()=>window.READY);
const N=747;for(let i=0;i<N;i++){await p.evaluate(t=>setTime(t),i/30);await p.screenshot({path:`${out}/o${String(i).padStart(4,'0')}.png`,omitBackground:true});}
await b.close();console.log('overlay frames',N);})();
