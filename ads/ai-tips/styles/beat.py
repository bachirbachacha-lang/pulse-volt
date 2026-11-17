import os, math, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H,FPS,DUR=1080,1920,30,15.2
B=lambda k:0.30+0.9513*k
FB=lambda s:ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Black.otf',s)
C={'k':(10,10,14),'c':(236,232,224),'v':(124,108,255),'o':(255,90,54)}
T=lambda bg:(244,241,236) if bg in 'kvo' else (12,12,14)
seq=[]  # (start, text, bg, accent?, img)
words=[("Your",'k'),("business",'k'),("is on",'k'),("Instagram.",'v')]
for i,(w,bg) in enumerate(words): seq.append((B(i),w,bg,None))
half=0.9513/2; t=B(4); post=[("But",'c'),("customers",'c'),("Google",'c'),("you.",'o'),("And",'k'),("find",'k'),("nothing.",'k'),("Fix that.",'v'),
 ("Websites",'k','s01'),("that",'k','s03'),("sell.",'k','s09'),("Menus.",'c'),("Orders.",'c'),("Bookings.",'c'),("Ready",'v'),("in days.",'v'),("Pixel & Co.",'k'),("DM us.",'v')]
for p in post: seq.append((t,p[0],p[1],p[2] if len(p)>2 else None)); t+=half if len(seq)<18 else 0.9513*0.5
ends=[s[0] for s in seq[1:]]+[DUR]
IM={}
for k,src in [('s01',1),('s03',2),('s09',3)]:
    im=Image.open(f'/root/fresh/out/n{src}.png').convert('RGB').resize((W,int(W*1688/780))); IM[k]=im.crop((0,(im.height-H)//2,W,(im.height-H)//2+H)).filter(ImageFilter.GaussianBlur(3))
os.makedirs('fr',exist_ok=True); N=int(DUR*FPS)
for f in range(N):
    tt=f/FPS; j=max([i for i,s in enumerate(seq) if s[0]<=tt],default=-1)
    if j<0: Image.new('RGB',(W,H),C['k']).save(f'fr/f{f:04d}.jpg',quality=92); continue
    st,txt,bg,img=seq[j]; u=min(1,(tt-st)/0.12); e=1-(1-u)**3
    im=IM[img].copy() if img else Image.new('RGB',(W,H),C[bg])
    if img: im=Image.blend(im,Image.new('RGB',(W,H),(0,0,0)),0.45)
    d=ImageDraw.Draw(im); size=int((360 if len(txt)<6 else 290 if len(txt)<9 else 230)*(1.3-0.3*e))
    fnt=FB(size); tw=d.textlength(txt,font=fnt)
    if tw>W-120: size=int(size*(W-120)/tw); fnt=FB(size); tw=d.textlength(txt,font=fnt)
    col=T('k') if img else T(bg)
    d.text(((W-tw)/2,H/2-size*0.62),txt,font=fnt,fill=col)
    if txt=="Pixel & Co.":
        s=120; g=12; x0=W/2-s-g/2; y0=H/2-size-2*s-60
        for q,(dx,dy) in enumerate([(0,0),(1,0),(0,1),(1,1)]):
            p=min(1,max(0,(tt-st-q*0.05)/0.25)); pe=1-(1-p)**3; cc=[(179,168,255),(244,241,255),(82,70,214),(124,108,255)][q]
            ox=(dx-.5)*500*(1-pe); oy=(dy-.5)*700*(1-pe)
            d.rounded_rectangle([x0+dx*(s+g)+ox,y0+dy*(s+g)+oy,x0+dx*(s+g)+s+ox,y0+dy*(s+g)+s+oy],radius=28,fill=cc)
    if txt=="DM us.": d.text((W/2-d.textlength('@pixelandco.design',font=FB(48))/2,H/2+170),'@pixelandco.design',font=FB(48),fill=(244,241,236))
    if u<1 and j>0: im=Image.blend(Image.new('RGB',(W,H),(255,255,255)),im,0.55+0.45*e)
    im.save(f'fr/f{f:04d}.jpg',quality=92)
subprocess.run(['ffmpeg','-loglevel','error','-y','-framerate','30','-i','fr/f%04d.jpg','-vf',"scale=w='trunc(1080*(1+0.03*exp(-mod(t-0.3\\,0.9513)*9))/2)*2':h=-2:eval=frame,crop=1080:1920,noise=alls=4:allf=t,format=yuv420p",'-c:v','libx264','-crf','19','-movflags','+faststart','beat_typo.mp4'],check=True)
print('ok',len(seq))
