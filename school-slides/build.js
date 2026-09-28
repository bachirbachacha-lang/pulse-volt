const pptxgen = require('pptxgenjs');
const fs = require('fs');
const pres = new pptxgen(); pres.layout = 'LAYOUT_16x9';
const BG='0E1B33', CARD='1B2A4A', TXT='FFFFFF', MUTED='AFC0DD', GREEN='39E08A', RED='FF6B6B', GOLD='FFD166';
const img = f => 'image/png;base64,' + fs.readFileSync(f).toString('base64');
const H='Cambria', B='Calibri';
function base(){ const s=pres.addSlide(); s.background={color:BG};
  s.addText('Example made with AI (Claude)',{x:6.9,y:5.25,w:2.9,h:0.25,fontFace:B,fontSize:9,color:MUTED,align:'right',isTextBox:true,margin:0}); return s; }
function button(s,text,x,y,w,color,slide,textColor){ s.addText(text,{shape:pres.shapes.ROUNDED_RECTANGLE,rectRadius:0.2,x,y,w,h:0.6,fill:{color},fontFace:B,fontSize:18,bold:true,color:textColor||BG,align:'center',valign:'middle',isTextBox:true,hyperlink:{slide}}); }

// 1 Title
let s=base();
s.addText('Think Before You Post',{x:0.6,y:1.1,w:5.4,h:1.4,fontFace:H,fontSize:42,bold:true,color:TXT,isTextBox:true,margin:0});
s.addText('Once it\'s online, it\'s online forever.',{x:0.6,y:2.6,w:5.4,h:0.5,fontFace:B,fontSize:20,italic:true,color:GREEN,isTextBox:true,margin:0});
s.addText('Everything you post leaves a digital footprint. Make it a good one!',{x:0.6,y:3.2,w:5.2,h:0.8,fontFace:B,fontSize:16,color:MUTED,isTextBox:true,margin:0});
s.addText('🔊 Voice-over: record 10–15 seconds and add it here (Insert → Audio)',{x:0.6,y:4.4,w:5.4,h:0.4,fontFace:B,fontSize:11,color:GOLD,isTextBox:true,margin:0});
s.addImage({data:img('slide1-footprint.png'),x:5.9,y:0.9,w:3.8,h:2.85});
s.addNotes('Voice-over script: "Hey everyone! Have you ever posted something and then regretted it? Even if you delete it, it might still be out there. Let\'s learn how to stay safe online."');

// 2 Flow
s=base();
s.addText('One Post, Lots of People',{x:0.6,y:0.35,w:8.8,h:0.7,fontFace:H,fontSize:34,bold:true,color:TXT,isTextBox:true,margin:0});
const steps=[['📱','You post a silly photo'],['📸','A friend screenshots it'],['💬','It gets sent to a group chat'],['👀','People you don\'t know see it'],['⏳','It could still be there years later']];
const bw=1.62, gap=0.28, y=1.75;
steps.forEach(([e,t],i)=>{ const x=0.5+i*(bw+gap);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x,y,w:bw,h:1.9,rectRadius:0.15,fill:{color:i===4?RED:CARD}});
  s.addText(e,{x,y:y+0.15,w:bw,h:0.6,fontSize:28,align:'center',isTextBox:true});
  s.addText(t,{x:x+0.1,y:y+0.8,w:bw-0.2,h:1.0,fontFace:B,fontSize:14,bold:true,color:i===4?BG:TXT,align:'center',valign:'top',isTextBox:true,margin:0});
  if(i<4) s.addShape(pres.shapes.LINE,{x:x+bw+0.03,y:y+0.95,w:gap-0.06,h:0,line:{color:GREEN,width:3,endArrowType:'triangle'}});
});
s.addText('Deleting it doesn\'t delete the screenshots!',{x:0.6,y:4.1,w:8.8,h:0.5,fontFace:B,fontSize:18,bold:true,color:GOLD,align:'center',isTextBox:true});

// 3 Choice
s=base();
s.addText('What Would You Do?',{x:0.6,y:0.35,w:5.6,h:0.7,fontFace:H,fontSize:34,bold:true,color:TXT,isTextBox:true,margin:0});
s.addText('Your friend sends you an embarrassing photo of a classmate and says: "Post it, it\'s funny!"',{x:0.6,y:1.3,w:5.4,h:1.2,fontFace:B,fontSize:18,color:MUTED,isTextBox:true,margin:0});
button(s,'Post it',0.6,2.9,2.5,RED,5);
button(s,'Don\'t post it',3.4,2.9,2.6,GREEN,6);
s.addText('Tap a button to see what happens',{x:0.6,y:3.65,w:5.4,h:0.35,fontFace:B,fontSize:12,italic:true,color:MUTED,isTextBox:true,margin:0});
s.addImage({data:img('slide3-thinking.png'),x:6.1,y:1.0,w:3.6,h:2.7});

// 4 Tips
s=base();
s.addText('Be Smart Online',{x:0.6,y:0.35,w:6,h:0.7,fontFace:H,fontSize:34,bold:true,color:TXT,isTextBox:true,margin:0});
const tips=[['🔒','Stay Private','Keep your account private and only accept people you know.'],['⏸️','Pause First','Before you post, ask: would I be okay if my parents saw this?'],['🗣️','Speak Up','Tell an adult you trust if something online feels wrong.']];
tips.forEach(([e,h,t],i)=>{ const x=0.6+i*2.35;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x,y:1.3,w:2.15,h:2.5,rectRadius:0.15,fill:{color:CARD}});
  s.addText(e,{x,y:1.4,w:2.15,h:0.6,fontSize:28,align:'center',isTextBox:true});
  s.addText(h,{x:x+0.15,y:2.05,w:1.85,h:0.4,fontFace:B,fontSize:17,bold:true,color:GREEN,align:'center',isTextBox:true,margin:0});
  s.addText(t,{x:x+0.15,y:2.5,w:1.85,h:1.2,fontFace:B,fontSize:13,color:TXT,align:'center',valign:'top',isTextBox:true,margin:0});
});
s.addImage({data:img('slide4-safe.png'),x:7.65,y:1.4,w:2.0,h:1.5});
s.addText([{text:'Need help? Visit eSafety',options:{hyperlink:{url:'https://www.esafety.gov.au'},color:GOLD,bold:true}}],{x:0.6,y:4.1,w:5,h:0.4,fontFace:B,fontSize:15,isTextBox:true,margin:0});
s.addText('Credits: images and slide design made with AI (Claude). Voice-over: [your name].',{x:0.6,y:4.55,w:7,h:0.35,fontFace:B,fontSize:11,color:MUTED,isTextBox:true,margin:0});

// 5 Outcome bad
s=base();
s.addText('Oh no…',{x:0.6,y:0.9,w:5.4,h:0.9,fontFace:H,fontSize:44,bold:true,color:RED,isTextBox:true,margin:0});
s.addText('The photo goes around the whole school. Your classmate feels really upset and you get in trouble. And it stays in your digital footprint.',{x:0.6,y:1.9,w:5.2,h:1.5,fontFace:B,fontSize:18,color:TXT,isTextBox:true,margin:0});
button(s,'↩ Try again',0.6,3.7,2.5,GOLD,3);
s.addImage({data:img('slide5-oh-no.png'),x:6.2,y:1.1,w:3.4,h:2.55});

// 6 Outcome good
s=base();
s.addText('Good choice!',{x:0.6,y:0.9,w:5.4,h:0.9,fontFace:H,fontSize:44,bold:true,color:GREEN,isTextBox:true,margin:0});
s.addText('You protected your classmate and kept your digital footprint positive.',{x:0.6,y:1.9,w:5.2,h:1.2,fontFace:B,fontSize:18,color:TXT,isTextBox:true,margin:0});
button(s,'Next →',0.6,3.4,2.5,GREEN,4);
s.addImage({data:img('slide6-good-choice.png'),x:6.2,y:1.1,w:3.4,h:2.55});

pres.writeFile({fileName:'Think-Before-You-Post.pptx'}).then(()=>console.log('ok'));
