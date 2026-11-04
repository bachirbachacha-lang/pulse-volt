// node rec_layers.js <outDir> [frames csv]: bg (jpg) + fg (png alpha) frames, 747 @30fps
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const out=process.argv[2];const only=process.argv[3]?process.argv[3].split(',').map(Number):null;
for(const L of ['bg','fg'])fs.mkdirSync(`${out}/${L}`,{recursive:true});
const b=await chromium.launch();
for(const L of ['bg','fg']){const p=await b.newPage({viewport:{width:1080,height:1920}});
 await p.goto('file://'+process.cwd()+'/layers.html?layer='+L);await p.waitForFunction(()=>window.READY);
 const fr=only||[...Array(747).keys()].map(i=>i+1);
 for(const f of fr){await p.evaluate(t=>setTime(t),(f-1)/30);
   await p.screenshot({path:`${out}/${L}/${L}${String(f).padStart(4,'0')}.${L==='bg'?'jpg':'png'}`,type:L==='bg'?'jpeg':'png',quality:L==='bg'?92:undefined,omitBackground:L==='fg'});}}
await b.close();console.log('done');})();
