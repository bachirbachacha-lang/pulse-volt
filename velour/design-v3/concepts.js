const STAR='M0,-98 C5,-24 20,-6 64,0 C20,6 5,24 0,98 C-5,24 -20,6 -64,0 C-20,-6 -5,-24 0,-98Z';
const STAR4='M0,-98 C9,-28 28,-9 98,0 C28,9 9,28 0,98 C-9,28 -28,9 -98,0 C-28,-9 -9,-28 0,-98Z';
const STAR5='M0,-9.5 2.8,-3 9.5,-2.9 4.3,1.6 6,8.6 0,4.8 -6,8.6 -4.3,1.6 -9.5,-2.9 -2.8,-3Z';
function wings(){let s='';for(const sd of[-1,1]){for(let i=0;i<7;i++){const L=160-i*15,a=-24+i*10,bx=sd*22,by=-34+i*8,th=11-i*.6;
  s+=`<path transform="translate(${bx},${by}) scale(${sd},1) rotate(${a})" d="M0,0 C${L*.25},${-th} ${L*.7},${-th*1.2} ${L},-2 C${L*.7},${th*.5} ${L*.25},${th*.8} 0,0Z"/>`;}
  for(let i=0;i<5;i++){const L=90-i*12,a=-6+i*14,bx=sd*20,by=-20+i*9;s+=`<path opacity=".0" d=""/>`}}
  return s}
function flames(){const T=(x,h,w,c)=>`M${x},150 C${x-w},${150-h*.3} ${x-w*.7},${150-h*.72} ${x+c},${150-h} C${x+w*.2},${150-h*.68} ${x+w},${150-h*.4} ${x+w*.2},${150-h*.12} C${x+w*.6},${150-h*.05} ${x+w*.4},150 ${x},150Z`;
  const I=(x,h,w,c)=>`M${x},${150-h*.12} C${x-w*.45},${150-h*.32} ${x-w*.3},${150-h*.58} ${x+c*.6},${150-h*.78} C${x+w*.1},${150-h*.55} ${x+w*.5},${150-h*.36} ${x},${150-h*.12}Z`;
  const F=[[-96,170,34,-18],[-50,250,44,14],[0,300,52,-10],[52,240,44,20],[100,180,34,10],[-130,110,26,-10],[132,120,26,12]];
  return F.map(f=>`<path fill-rule="evenodd" d="${T(...f)} ${I(...f)}"/>`).join('')}
function laurel(){let s='<path d="M-16,91 A92,92 0 0,1 -46,-80 M16,91 A92,92 0 0,0 46,-80" fill="none" stroke="currentColor" stroke-width="4"/>';
  for(const sd of[-1,1])for(let i=0;i<9;i++){const ph=(100+i*16)*Math.PI/180;const rr=92+(i%2?9:-9);const x=sd*Math.cos(ph)*rr*-1*-1,y=Math.sin(ph)*rr;const X=sd<0?Math.cos(ph)*rr:-Math.cos(ph)*rr;
    const rot=sd<0?(100+i*16)+90+(i%2?-28:28):-((100+i*16)+90+(i%2?-28:28));
    s+=`<ellipse cx="${X}" cy="${y}" rx="17" ry="6.5" transform="rotate(${rot} ${X} ${y})"/>`}
  return s}
function scratch(){let s='';const tips=[[0,-96],[92,0],[0,96],[-92,0]];let seed=5;const r=()=>(seed=(seed*16807)%2147483647)/2147483647-.5;
  for(let k=0;k<2;k++){const a=tips[k],b=tips[k+2];for(let j=0;j<3;j++){s+=`<path d="M${a[0]+r()*10},${a[1]+r()*10} Q${r()*14},${r()*14} ${b[0]+r()*10},${b[1]+r()*10}" stroke-width="${j?3:7}"/>`}}
  for(const [x,y] of[[46,-46],[-46,46],[46,46],[-46,-46]])s+=`<path d="M0,0 L${x+r()*8},${y+r()*8}" stroke-width="3"/>`;return s}
const SYM=`
<filter id="emb" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
 <feTurbulence type="fractalNoise" baseFrequency="0.07 1.4" numOctaves="2" seed="4" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.45" result="na"/>
 <feComposite in="na" in2="SourceAlpha" operator="in" result="lines"/>
 <feGaussianBlur in="SourceAlpha" stdDeviation="1.3" result="b"/>
 <feSpecularLighting in="b" surfaceScale="3" specularConstant=".9" specularExponent="16" lighting-color="#ffffff" result="sp"><feDistantLight azimuth="235" elevation="48"/></feSpecularLighting>
 <feComposite in="sp" in2="SourceAlpha" operator="in" result="sp2"/>
 <feColorMatrix in="sp2" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .5 0" result="sp3"/>
 <feDropShadow in="SourceGraphic" dx="0" dy="1.6" stdDeviation="1.2" flood-opacity=".6" result="base"/>
 <feMerge><feMergeNode in="base"/><feMergeNode in="lines"/><feMergeNode in="sp3"/></feMerge>
</filter>
<filter id="puff" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
 <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="b"/>
 <feSpecularLighting in="b" surfaceScale="4" specularConstant=".75" specularExponent="12" lighting-color="#ffffff" result="sp"><feDistantLight azimuth="235" elevation="50"/></feSpecularLighting>
 <feComposite in="sp" in2="SourceAlpha" operator="in" result="sp2"/>
 <feColorMatrix in="sp2" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .45 0" result="sp3"/>
 <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="1" seed="9" result="g"/>
 <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1 .7" result="ga"/>
 <feComposite in="ga" in2="SourceAlpha" operator="in" result="grain"/>
 <feDropShadow in="SourceGraphic" dx="0" dy="2.5" stdDeviation="2" flood-opacity=".55" result="base"/>
 <feMerge><feMergeNode in="base"/><feMergeNode in="grain"/><feMergeNode in="sp3"/></feMerge>
</filter>
<filter id="flat"><feOffset dx="0" dy="0"/></filter>
<symbol id="iStar" viewBox="-100 -100 200 200"><g fill="currentColor"><path d="${STAR}"/><path transform="translate(54,-56) scale(.22)" d="${STAR}"/><path transform="translate(-56,58) scale(.15)" d="${STAR}"/></g></symbol>
<symbol id="wBod" viewBox="0 0 640 120"><text x="320" y="96" text-anchor="middle" font-family="Bodoni Moda" font-weight="500" font-size="104" letter-spacing="28" fill="currentColor">VÉLOUR</text></symbol>
<symbol id="mStar" viewBox="0 0 200 200"><g fill="currentColor"><path transform="translate(100,72) scale(.62)" d="${STAR}"/><text x="104" y="176" text-anchor="middle" font-family="Bodoni Moda" font-weight="700" font-size="32" letter-spacing="9">VÉLOUR</text></g></symbol>
<symbol id="wDrip" viewBox="0 0 1000 460"><g fill="currentColor"><text x="500" y="250" text-anchor="middle" font-family="Yellowtail" font-size="270" transform="rotate(-7 500 250)">Vélour</text><g id="dripG"></g></g></symbol>
<symbol id="iCrest" viewBox="0 0 400 500"><g fill="none" stroke="currentColor"><path stroke-width="14" d="M200,62 C262,80 318,80 356,70 L356,262 C356,370 282,428 200,462 C118,428 44,370 44,262 L44,70 C82,80 138,80 200,62Z"/><path stroke-width="5" d="M200,95 C254,110 298,110 326,103 L326,262 C326,350 268,398 200,428 C132,398 74,350 74,262 L74,103 C102,110 146,110 200,95Z"/><path stroke-width="10" stroke-linecap="round" d="M120,150 L280,350 M280,150 L120,350"/></g>
 <g fill="currentColor"><g transform="translate(200,30)"><path transform="scale(1.5)" d="${STAR5}"/><path transform="translate(-56,8) scale(1.25)" d="${STAR5}"/><path transform="translate(56,8) scale(1.25)" d="${STAR5}"/><path transform="translate(-104,22) scale(1)" d="${STAR5}"/><path transform="translate(104,22) scale(1)" d="${STAR5}"/></g>
 <path d="M104,132 L134,140 L124,170Z M296,132 L266,140 L276,170Z"/><text x="200" y="306" text-anchor="middle" font-family="Grenze Gotisch" font-weight="900" font-size="178">V</text>
 <path d="M60,372 L340,372 L322,394 L340,416 L60,416 L78,394Z" fill="none" stroke="currentColor" stroke-width="5"/><text x="200" y="404" text-anchor="middle" font-family="Inter" font-weight="700" font-size="24" letter-spacing="10">VÉLOUR</text></g></symbol>
<symbol id="iRose" viewBox="-100 -112 200 230"><g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
 <path d="M-44,-64 C-52,-30 -36,-6 0,-4 C36,-6 52,-30 44,-64"/><path d="M-44,-64 C-32,-78 -14,-74 -6,-62"/><path d="M44,-64 C32,-80 12,-78 4,-64"/>
 <path d="M2,-64 C-16,-66 -26,-50 -20,-38 C-12,-24 12,-26 18,-40 C22,-52 12,-60 2,-58 C-8,-56 -10,-44 0,-42"/><path d="M-32,-30 C-16,-20 16,-20 32,-30"/><path d="M-40,-50 C-30,-40 -26,-30 -20,-22 M40,-50 C30,-40 26,-30 20,-22"/>
 <path d="M0,-4 C-4,30 6,62 0,112"/></g>
 <g fill="currentColor"><path d="M-2,20 L-16,14 L-2,30Z M4,46 L18,40 L4,56Z M0,80 L-14,74 L0,90Z"/><path d="M4,36 C22,18 48,20 58,32 C46,48 22,50 4,36Z"/><path d="M0,66 C-20,50 -46,52 -56,64 C-44,80 -20,82 0,66Z"/></g></symbol>
<symbol id="iWings" viewBox="-200 -110 400 220"><g fill="currentColor">${wings()}<text x="0" y="48" text-anchor="middle" font-family="Grenze Gotisch" font-weight="900" font-size="120">V</text><path transform="translate(0,-74) scale(.24)" d="${STAR}"/></g></symbol>
<symbol id="iFlame" viewBox="-160 -170 320 330"><g fill="currentColor">${flames()}</g></symbol>
<symbol id="wGoth" viewBox="0 0 620 180"><text x="310" y="140" text-anchor="middle" font-family="Grenze Gotisch" font-weight="900" font-size="156" fill="currentColor">Vélour</text></symbol>
<symbol id="iLaurel" viewBox="-125 -125 250 250"><g fill="currentColor">${laurel()}<text x="0" y="36" text-anchor="middle" font-family="Bodoni Moda" font-weight="700" font-size="110">V</text><text x="0" y="78" text-anchor="middle" font-family="Inter" font-weight="700" font-size="13" letter-spacing="5">MMXXVI</text><path transform="translate(0,-64) scale(.16)" d="${STAR}"/></g></symbol>
<symbol id="wSketch" viewBox="0 0 720 280"><g fill="currentColor"><text x="360" y="180" text-anchor="middle" font-family="Permanent Marker" font-size="170" transform="rotate(-6 360 180)">Vélour</text></g><g fill="none" stroke="currentColor" stroke-linecap="round"><path stroke-width="11" d="M90,236 C260,196 480,214 650,170"/><path stroke-width="5" d="M150,258 C310,232 470,240 610,214"/></g></symbol>
<symbol id="iScratch" viewBox="-100 -100 200 200"><g fill="none" stroke="currentColor" stroke-linecap="round">${scratch()}</g></symbol>
<mask id="moonM" maskUnits="userSpaceOnUse" x="-110" y="-110" width="220" height="220"><rect x="-110" y="-110" width="220" height="220" fill="#000"/><circle r="92" fill="#fff"/><circle cx="36" cy="-16" r="80" fill="#000"/></mask>
<symbol id="iMoon" viewBox="-110 -110 220 220"><g fill="currentColor"><rect x="-110" y="-110" width="220" height="220" mask="url(#moonM)"/><path transform="translate(60,-46) scale(.24)" d="${STAR4}"/><path transform="translate(82,16) scale(.13)" d="${STAR4}"/><path transform="translate(52,60) scale(.17)" d="${STAR4}"/></g></symbol>
<symbol id="wNuit" viewBox="0 0 600 70"><text x="300" y="52" text-anchor="middle" font-family="Bodoni Moda" font-style="italic" font-size="54" fill="currentColor">Maison de Nuit</text></symbol>
<symbol id="iOrbit" viewBox="-230 -115 460 230"><g fill="none" stroke="currentColor" stroke-width="5"><ellipse rx="210" ry="58" transform="rotate(-10)"/></g><g fill="currentColor"><text x="0" y="28" text-anchor="middle" font-family="Unbounded" font-weight="800" font-size="78" letter-spacing="2">VÉLOUR</text><path transform="translate(176,-70) scale(.22)" d="${STAR}"/><path transform="translate(-196,62) scale(.12)" d="${STAR}"/></g>
 <path fill="none" stroke="currentColor" stroke-width="5" d="M-120,46 C-40,62 60,58 150,30" transform="rotate(-10)" opacity="0"/></symbol>
`;
document.getElementById('D').innerHTML=SYM;
// drips
(function(){const D=[[262,272,20,58,1],[392,266,22,118,1],[481,255,18,46,0],[631,237,20,92,1],[697,228,18,66,0]];let out='';
 for(const [cx,by,w,len,drop] of D){const top=by-14;out+=`<path d="M${cx-w/2-5},${top} C${cx-w/2},${top+8} ${cx-w/2},${top+len*.55} ${cx-w*.36},${top+len} a${w*.36},${w*.36} 0 0 0 ${w*.72},0 C${cx+w/2},${top+len*.55} ${cx+w/2},${top+8} ${cx+w/2+5},${top}Z"/>`;if(drop)out+=`<ellipse cx="${cx}" cy="${top+len+w*.9+10}" rx="${w*.28}" ry="${w*.38}"/>`}
 const g=document.getElementById('dripG');g.outerHTML=`<g transform="rotate(-7 500 250)">${out}</g>`})();

const CREAM='#efe7d8',RED='#b4141d',GOLD='#c9a86a',INK='#18171a',SILV='#cfd4da';
const AR={iStar:1,wBod:.1875,mStar:1,wDrip:.46,iCrest:1.25,iRose:1.15,iWings:.55,iFlame:1.03,wGoth:.29,iLaurel:1,wSketch:.39,iScratch:1,iMoon:1,wNuit:.117,iOrbit:.5};
const p=(sym,x,y,w,o={})=>Object.assign({sym,x,y,w,ar:AR[sym]},o);
const C=[
 {n:'01',t:'The Star',col:'noir',ink:CREAM,acc:CREAM,tag:'Born after midnight.',
  logo:[['iStar',220,105,170],['wBod',220,222,330]],
  hf:[p('mStar',330,195,64,{fx:'emb'})],hb:[p('iStar',250,270,250)],jf:[p('iStar',246,190,40,{fx:'emb'})],jb:[p('wBod',290,380,220,{rot:90})],
  cu:[['mStar','emb'],['iStar','puff']]},
 {n:'02',t:'The Drip',col:'bordeaux',ink:CREAM,acc:'#d9a0a8',tag:'Soft as velvet.<br>Heavy as midnight.',
  logo:[['wDrip',220,128,400]],
  hf:[p('wDrip',250,210,190,{fx:'emb'})],hb:[p('wDrip',250,250,330),p('wNuit',250,360,170)],jf:[p('wDrip',244,180,90,{fx:'emb'})],jb:[],
  cu:[['wDrip','emb'],['wDrip','puff']]},
 {n:'03',t:'The Crest',col:'marine',ink:CREAM,acc:'#a9b8d6',tag:'Built to last.',
  logo:[['iCrest',220,125,170]],
  hf:[p('iCrest',330,195,56,{fx:'emb'})],hb:[p('iCrest',250,270,200),p('wBod',250,430,170)],jf:[p('iCrest',246,190,44,{fx:'emb'})],jb:[p('wBod',290,380,220,{rot:90})],
  cu:[['iCrest','emb'],['iCrest','puff']]},
 {n:'04',t:'The Rose',col:'blanc',ink:RED,acc:RED,light:1,tag:'Beauty with thorns.',
  logo:[['iRose',220,104,150],['wGoth',220,226,250,INK]],
  hf:[p('iRose',330,195,54,{fx:'emb'})],hb:[p('wGoth',250,150,230,{ink:INK}),p('iRose',250,320,210)],jf:[p('iRose',244,250,80,{rot:-8,fx:'emb'})],jb:[],
  cu:[['iRose','emb'],['wGoth','emb',INK]]},
 {n:'05',t:'The Wings',col:'gris',ink:INK,acc:INK,light:1,tag:'Rise quiet.',
  logo:[['iWings',220,118,400]],
  hf:[p('iWings',250,200,150,{fx:'emb'})],hb:[p('iWings',250,240,380),p('wBod',250,370,170)],jf:[p('iWings',246,180,70,{fx:'emb'})],jb:[],
  cu:[['iWings','emb'],['wBod','emb']]},
 {n:'06',t:'The Flame',col:'noir',ink:RED,acc:RED,tag:'Burn slow.',
  logo:[['wGoth',220,70,300],['iFlame',220,176,130]],
  hf:[p('wGoth',330,190,100,{fx:'emb'})],hb:[p('iFlame',250,400,400),p('wGoth',250,170,260)],jf:[p('iFlame',118,560,120),p('iFlame',242,560,120)],jb:[],
  cu:[['wGoth','emb'],['iFlame','puff']]},
 {n:'07',t:'The Laurel',col:'bordeaux',ink:GOLD,acc:GOLD,tag:'Earned, not given.',
  logo:[['iLaurel',220,118,210]],
  hf:[p('iLaurel',250,205,90,{fx:'emb'})],hb:[p('iLaurel',250,270,230)],jf:[p('iLaurel',246,190,50,{fx:'emb'})],jb:[p('wBod',290,380,220,{rot:90})],
  cu:[['iLaurel','emb'],['iLaurel','puff']]},
 {n:'08',t:'The Sketch',col:'gris',ink:INK,acc:INK,light:1,tag:'Drawn by night.',
  logo:[['wSketch',220,104,380],['iScratch',380,220,60]],
  hf:[p('wSketch',250,210,210,{rot:-4})],hb:[p('iScratch',250,270,270)],jf:[p('iScratch',246,190,54)],jb:[p('wSketch',280,380,200,{rot:84})],
  cu:[['wSketch','flat'],['iScratch','flat']]},
 {n:'09',t:'The Moon',col:'marine',ink:GOLD,acc:GOLD,tag:'Made for the night.',
  logo:[['iMoon',220,92,150],['wNuit',220,196,240],['wBod',220,236,180]],
  hf:[p('iMoon',330,190,54,{fx:'emb'})],hb:[p('iMoon',250,250,200),p('wNuit',250,390,200),p('wBod',250,430,140)],jf:[p('iMoon',246,190,40,{fx:'emb'})],jb:[],
  cu:[['iMoon','emb'],['iMoon','puff']]},
 {n:'10',t:'The Orbit',col:'noir',ink:SILV,acc:SILV,tag:'Beyond the noise.',
  logo:[['iOrbit',220,125,420]],
  hf:[p('iOrbit',250,200,170,{fx:'emb'})],hb:[p('iOrbit',250,250,380)],jf:[p('iStar',246,200,40,{fx:'emb'})],jb:[p('iOrbit',280,380,200,{rot:90})],
  cu:[['iOrbit','emb'],['iStar','puff']]},
];
const NAMES={noir:'Noir',bordeaux:'Bordeaux',blanc:'Blanc',gris:'Gris',brun:'Brun',marine:'Marine'};
function fill(list,ink){return list.map(q=>Object.assign({},q,{ink:q.ink||ink}))}
function build(){
  const B=document.getElementById('board');
  for(const c of C){
    const pn=document.createElement('div');pn.className='pn';pn.id='pn'+c.n;
    const bg=c.light?'radial-gradient(90% 60% at 50% 40%,#f3efe8,#d9d3c9)':`radial-gradient(90% 60% at 50% 40%,${c.col==='noir'?'#232227':c.col==='bordeaux'?'#2a1015':c.col==='marine'?'#151b2b':'#2a2420'},#09090a)`;
    pn.style.background=bg;pn.style.setProperty('--acc',c.acc);if(c.light){pn.style.color='#151314';pn.style.setProperty('--tagc','#151314')}
    pn.innerHTML=`<div class="t">${c.n}. <b>${c.t}</b></div><div class="logo"></div><div class="tag">${c.tag}</div><div class="gar g1"></div><div class="gar g2"></div><div class="cu"><div></div><div></div></div><div class="ft"><i style="background:${COL[c.col]}"></i><i style="background:${c.ink}"></i>${NAMES[c.col]} / ${c.ink===CREAM?'Cream':c.ink===RED?'Red':c.ink===GOLD?'Gold':c.ink===SILV?'Silver':'Black'}</div>`;
    B.appendChild(pn);
    const lg=document.createElementNS(NS,'svg');lg.setAttribute('viewBox','0 0 440 260');lg.setAttribute('width','440');lg.setAttribute('height','260');
    c.logo.forEach(([s,x,y,w,ink])=>{const h=w*AR[s];const u=el('use',{href:'#'+s,x:x-w/2,y:y-h/2,width:w,height:h,color:ink||c.ink},lg)});
    pn.querySelector('.logo').appendChild(lg);
    const ink=c.ink;
    pn.querySelector('.g1').append(garment('hf',c.col,fill(c.hf,ink),236),garment('hb',c.col,fill(c.hb,ink),236));
    pn.querySelector('.g2').append(garment('jf',c.col,fill(c.jf,ink),176),garment('jb',c.col,fill(c.jb,ink),176));
    const cus=pn.querySelectorAll('.cu > div');c.cu.forEach(([s,fx,ink2],i)=>cus[i].appendChild(closeup(c.col,s,ink2||ink,AR[s],fx)));
  }
  const f=document.createElement('div');f.id='foot';f.innerHTML='<b>VÉLOUR</b><span>MAISON DE NUIT · DROP 01 CONCEPTS</span>';B.appendChild(f);
}
window.BUILD=async()=>{
  FLEECE=new Image();FLEECE.src='fleece.png';await FLEECE.decode();
  for(const f of ['500 50px "Bodoni Moda"','700 50px "Bodoni Moda"','italic 400 50px "Bodoni Moda"','80px Yellowtail','900 80px "Grenze Gotisch"','80px "Permanent Marker"','800 80px Unbounded','700 20px Inter'])await document.fonts.load(f);
  build();
};
