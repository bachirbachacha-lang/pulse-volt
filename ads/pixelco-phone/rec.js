// node rec.js <site> <outDir>  -> 30 fps frames of the screen design at 2x
const {chromium}=require('playwright');
(async()=>{const [site,out]=process.argv.slice(2);require('fs').mkdirSync(out,{recursive:true});
const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
await p.goto('file://'+process.cwd()+'/screens.html?site='+site);await p.waitForFunction(()=>window.READY);
const N=Math.round(await p.evaluate(()=>DURATION)*30);
for(let i=0;i<N;i++){await p.evaluate(t=>setTime(t),i/30);await p.screenshot({path:`${out}/f${String(i).padStart(4,'0')}.jpg`,type:'jpeg',quality:92});}
await b.close();console.log(site,N,'frames');})();
