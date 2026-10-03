Object.assign(COL,{rose:'#e9b7bd',charbon:'#3a3a3c'});
const SY=`
<filter id="emb" x="-15%" y="-25%" width="130%" height="150%" color-interpolation-filters="sRGB">
 <feTurbulence type="fractalNoise" baseFrequency="0.07 1.4" numOctaves="2" seed="4" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.45" result="na"/>
 <feComposite in="na" in2="SourceAlpha" operator="in" result="lines"/>
 <feGaussianBlur in="SourceAlpha" stdDeviation="1.1" result="b"/>
 <feSpecularLighting in="b" surfaceScale="3" specularConstant=".9" specularExponent="16" lighting-color="#ffffff" result="sp"><feDistantLight azimuth="235" elevation="48"/></feSpecularLighting>
 <feComposite in="sp" in2="SourceAlpha" operator="in" result="sp2"/>
 <feColorMatrix in="sp2" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .5 0" result="sp3"/>
 <feDropShadow in="SourceGraphic" dx="0" dy="1.4" stdDeviation="1" flood-opacity=".55" result="base"/>
 <feMerge><feMergeNode in="base"/><feMergeNode in="lines"/><feMergeNode in="sp3"/></feMerge>
</filter>
<filter id="puff"><feOffset/></filter>
<symbol id="sA" viewBox="0 0 640 220"><text x="320" y="150" text-anchor="middle" font-family="Great Vibes" font-size="170" fill="currentColor">Velour</text></symbol>
<symbol id="sB" viewBox="0 0 640 240"><g fill="currentColor"><text x="320" y="140" text-anchor="middle" font-family="Yellowtail" font-size="160" transform="rotate(-6 320 140)">Velour</text><path d="M150,176 C260,160 420,150 540,128 C430,166 280,184 156,190 Z" transform="rotate(-6 320 140)"/></g></symbol>
<symbol id="sC" viewBox="0 0 640 220"><text x="320" y="150" text-anchor="middle" font-family="Mr Dafoe" font-size="170" fill="currentColor">Velour</text></symbol>
`;
document.getElementById('D').innerHTML=SY;
const AR={sA:220/640,sB:240/640,sC:220/640};
const CREAM='#efe7d8';
function sec(title,sub){const d=document.createElement('div');d.style.cssText='padding:46px 60px 10px';d.innerHTML=`<div style="font:700 13px Inter;letter-spacing:.4em;color:#8a6a35">${sub}</div><div style="font-family:'Bodoni Moda';font-size:52px;font-weight:500;margin-top:6px">${title}</div>`;return d}
function build(){
  const B=document.getElementById('board');
  const h=document.createElement('div');h.style.cssText='padding:50px 60px 0;display:flex;justify-content:space-between;align-items:end';
  h.innerHTML=`<div style="font-family:'Bodoni Moda';font-weight:500;font-size:44px;letter-spacing:.45em">VÉLOUR</div><div style="font:600 13px Inter;letter-spacing:.3em;color:#776">DROP 01 · SCRIPT COLLECTION · LOGO + PLACEMENT</div>`;B.appendChild(h);
  // logos
  B.appendChild(sec('The script logo','STEP 1 · PICK ONE'));
  const L=document.createElement('div');L.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:16px 60px 10px';
  [['sA','A · Elegant','Thin and classy, like your pink / charcoal / burgundy pics'],['sB','B · Sporty','Bold script with swoosh underline, like your navy pic'],['sC','C · Signature','Handwritten signature feel']].forEach(([s,t,d])=>{
    const c=document.createElement('div');c.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;height:260px;border-radius:6px;overflow:hidden"><div class="a" style="background:#151314;display:grid;place-items:center"></div><div class="b" style="background:#e9b7bd;display:grid;place-items:center"></div></div><div style="font:700 15px Inter;letter-spacing:.2em;margin-top:14px;text-transform:uppercase">${t}</div><div style="font:400 15px Inter;color:#665;margin-top:4px">${d}</div>`;
    const mk=(col,ink)=>{const sv=document.createElementNS(NS,'svg');sv.setAttribute('viewBox','0 0 300 220');sv.setAttribute('width','100%');sv.setAttribute('height','100%');const df=el('defs',{},sv);const id='lp'+(uid++);const pt=el('pattern',{id,patternUnits:'userSpaceOnUse',width:300,height:300},df);el('image',{href:makeTint(COL[col]),width:300,height:300},pt);el('rect',{width:300,height:220,fill:`url(#${id})`},sv);const w=250,hh=w*AR[s];el('use',{href:'#'+s,x:25,y:110-hh/2,width:w,height:hh,color:ink,filter:'url(#emb)'},sv);return sv};
    c.querySelector('.a').appendChild(mk('noir',CREAM));c.querySelector('.b').appendChild(mk('rose','#ffffff'));L.appendChild(c)});
  B.appendChild(L);
  // placements
  B.appendChild(sec('Where it goes','STEP 2 · PLACEMENT (sizes for size L)'));
  const P=document.createElement('div');P.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:30px;padding:10px 60px';
  const lay=(name,desc,col,ink,hf,hb,jf,notes)=>{const c=document.createElement('div');c.style.cssText='background:#e6e0d6;border-radius:8px;padding:24px';
    c.innerHTML=`<div style="font:700 16px Inter;letter-spacing:.2em;text-transform:uppercase">${name}</div><div style="font:400 15px Inter;color:#665;margin:4px 0 10px">${desc}</div><div class="g" style="display:flex;justify-content:center;align-items:flex-end"></div><ol style="font:400 15px/1.7 Inter;margin:14px 0 0 18px">${notes.map(n=>`<li>${n}</li>`).join('')}</ol>`;
    c.querySelector('.g').append(garment('hf',col,hf,280),garment('hb',col,hb,280),garment('jf',col,jf,170));return c};
  const s='sA',ar=AR[s];
  P.appendChild(lay('Layout 1 · Quiet','Tonal or cream script, front only. Your pink / charcoal / burgundy look.','bordeaux',CREAM,
    [{sym:s,x:322,y:190,w:96,ar,ink:CREAM,fx:'emb'}],[],[{sym:s,x:250,y:200,w:78,ar,ink:CREAM,fx:'emb'}],
    ['<b>Left chest:</b> 9 cm wide, 7 cm below shoulder seam, 5 cm from centre','<b>Left thigh (joggers):</b> 8 cm wide, 12 cm below waistband','Flat embroidery, thread tone-on-tone or cream']));
  P.appendChild(lay('Layout 2 · Statement','Big script on the back + small on the sleeve. Like the "Luxe Noir" pic.','noir',CREAM,
    [{sym:s,x:322,y:190,w:96,ar,ink:CREAM,fx:'emb'},{sym:s,x:58,y:390,w:60,ar,ink:CREAM,fx:'emb',rot:-82}],[{sym:s,x:250,y:200,w:290,ar,ink:CREAM,fx:'emb'},{sym:s,x:442,y:390,w:60,ar,ink:CREAM,fx:'emb',rot:82}],[{sym:s,x:250,y:200,w:78,ar,ink:CREAM,fx:'emb'}],
    ['<b>Back:</b> 30 cm wide, centred, 14 cm below collar seam (embroidery)','<b>Left sleeve:</b> 9 cm, 8 cm above cuff','<b>Left chest + left thigh:</b> same as Layout 1']));
  B.appendChild(P);
  // colours
  B.appendChild(sec('Colours','STEP 3 · YOUR PALETTE'));
  const K=document.createElement('div');K.style.cssText='display:flex;gap:18px;padding:14px 60px 60px;flex-wrap:wrap';
  [['rose','Rose','#E9B7BD','white'],['charbon','Charbon','#3A3A3C','tonal'],['bordeaux','Bordeaux','#3D0E18','cream'],['marine','Marine','#1C2234','cream'],['noir','Noir','#1B1A1C','cream'],['gris','Gris','#B9B8B6','white'],['blanc','Blanc','#ECE8E1','tonal'],['brun','Brun','#5A3F2E','cream']].forEach(([k,n,h,t])=>{
    const d=document.createElement('div');d.style.cssText='text-align:center;font:600 13px Inter;letter-spacing:.15em';d.appendChild(garment('hf',k,[{sym:s,x:322,y:190,w:96,ar,ink:t==='white'?'#fff':t==='tonal'?COL[k]:CREAM,fx:'emb'}],200));
    d.insertAdjacentHTML('beforeend',`<div style="margin-top:6px">${n.toUpperCase()}</div><div style="font-weight:400;color:#776">${h} · ${t} logo</div>`);K.appendChild(d)});
  B.appendChild(K);
}
window.BUILD=async()=>{FLEECE=new Image();FLEECE.src='fleece.png';await FLEECE.decode();
  for(const f of ['80px "Great Vibes"','80px Yellowtail','80px "Mr Dafoe"','500 50px "Bodoni Moda"','700 20px Inter'])await document.fonts.load(f);build()};
