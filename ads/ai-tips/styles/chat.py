import os, json, subprocess, math
from PIL import Image, ImageDraw, ImageFont
W,H,FPS,DUR=1080,1920,30,15.0
FM=ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Medium.otf',46); FS=ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-SemiBold.otf',36)
FB=lambda s:ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Black.otf',s)
menu=Image.open('/root/tip1/menu.png').convert('RGB'); menu=menu.resize((520,int(520*menu.height/menu.width)))
samp=Image.open('/root/fresh/out/n2.png').convert('RGB'); samp=samp.resize((520,int(520*samp.height/samp.width)))
def rr_img(im,r=34):
    m=Image.new('L',im.size,0); ImageDraw.Draw(m).rounded_rectangle([0,0,im.width-1,im.height-1],radius=r,fill=255); return im,m
msgs=[(0.4,'me','I need a website for my café'),(1.3,'typ',2.4),(2.4,'th','Send me your menu'),(3.4,'meimg',menu),(4.6,'typ',6.2),(6.2,'th',"Here's your free sample:"),(6.9,'thimg',samp),(9.4,'me',"wait... it's already done??")]
def wrap(t,f,maxw):
    d=ImageDraw.Draw(Image.new('RGB',(1,1)));ws=t.split();L=[];c=''
    for w in ws:
        s=(c+' '+w).strip()
        if d.textlength(s,font=f)>maxw and c:L.append(c);c=w
        else:c=s
    L.append(c);return L
def bubble(kind,content):
    if kind in('me','th'):
        lines=wrap(content,FM,660);d=ImageDraw.Draw(Image.new('RGB',(1,1)));w=int(max(d.textlength(l,font=FM) for l in lines))+68;h=len(lines)*60+50
        im=Image.new('RGBA',(w,h),(0,0,0,0));dr=ImageDraw.Draw(im);col=(10,132,255) if kind=='me' else (38,38,41)
        dr.rounded_rectangle([0,0,w-1,h-1],radius=44,fill=col)
        for i,l in enumerate(lines):dr.text((34,22+i*60),l,font=FM,fill=(255,255,255))
        return im
    if kind in('meimg','thimg'):
        pic,m=rr_img(content);im=Image.new('RGBA',(pic.width+24,pic.height+24),(0,0,0,0));dr=ImageDraw.Draw(im)
        dr.rounded_rectangle([0,0,im.width-1,im.height-1],radius=44,fill=(10,132,255) if kind=='meimg' else (38,38,41));im.paste(pic,(12,12),m);return im
B=[(t,k,bubble(k,c) if k!='typ' else c) for t,k,c in msgs]
os.makedirs('fr',exist_ok=True);N=int(DUR*FPS);sfx=[]
for t,k,c in msgs:
    if k!='typ':sfx.append([t,'msg' if k.startswith('th') else 'pop',.9])
sfx+= [[11.0,'hit',1],[13.0,'win',.8]]; json.dump(sfx,open('sfx.json','w'))
def header(im):
    d=ImageDraw.Draw(im);d.rectangle([0,0,W,250],fill=(17,17,17));d.line([(0,250),(W,250)],fill=(34,34,34),width=2)
    cx=540;s=26;g=8;d.ellipse([cx-50,70,cx+50,170],fill=(12,12,17))
    for q,(dx,dy) in enumerate([(0,0),(1,0),(0,1),(1,1)]):
        x=cx-s-g/2+dx*(s+g);y=120-s-g/2+dy*(s+g);d.rounded_rectangle([x,y,x+s,y+s],radius=7,fill=[(179,168,255),(244,241,255),(82,70,214),(124,108,255)][q])
    tw=d.textlength('Pixel & Co.',font=FS);d.text((cx-tw/2,186),'Pixel & Co.',font=FS,fill=(255,255,255))
for f in range(N):
    tt=f/FPS;im=Image.new('RGB',(W,H),(0,0,0))
    # layout: stack shown bubbles from y=290, scroll up after 7.6s
    y=290;scroll=0 if tt<7.6 else min(1,(tt-7.6)/.7);scroll=(1-(1-scroll)**3)*900
    layer=Image.new('RGBA',(W,H+1400),(0,0,0,0))
    for (t,k,b),(t0,_,c) in zip(B,msgs):
        if k=='typ':
            if t<=tt<c:
                dr=ImageDraw.Draw(layer);dr.rounded_rectangle([36,y,36+190,y+100],radius=44,fill=(38,38,41))
                for q in range(3):
                    dy=-10*max(0,math.sin((tt-t)*9-q*.9));dr.ellipse([70+q*42,y+40+dy,90+q*42,y+60+dy],fill=(142,142,147))
                y+=118
            continue
        if tt<t:continue
        u=min(1,(tt-t)/.3);e=1+2.70158*(u-1)**3+1.70158*(u-1)**2 if u<1 else 1
        sc=max(.05,.6+.4*e);bw,bh=b.size;bb=b.resize((max(1,int(bw*sc)),max(1,int(bh*sc))))
        x=W-36-bb.width if k.startswith('me') else 36
        layer.alpha_composite(bb,(int(x if k.startswith('th') else W-36-bb.width),int(y+bh-bb.height)))
        y+=bh+20
    im.paste(layer.crop((0,int(scroll),W,int(scroll)+H)),(0,0),layer.crop((0,int(scroll),W,int(scroll)+H)))
    header(im)
    if tt>=11.0:
        dim=min(1,(tt-11)/.3);im=Image.blend(im,Image.new('RGB',(W,H),(0,0,0)),.85*dim);d=ImageDraw.Draw(im)
        if tt<11.35:im=Image.blend(im,Image.new('RGB',(W,H),(124,108,255)),.7*(1-(tt-11)/.35));d=ImageDraw.Draw(im)
        if tt<12.85:
            for i,(s,c) in enumerate([("Ready in",(255,255,255)),("days.",(124,108,255))]):
                f_=FB(150);w_=d.textlength(s,font=f_);d.text(((W-w_)/2,720+i*170),s,font=f_,fill=c)
        elif tt>=13.0:
            f_=FB(150);w_=d.textlength("DM us.",font=f_);d.text(((W-w_)/2,740),"DM us.",font=f_,fill=(255,255,255))
            f2=FB(52);w2=d.textlength("@pixelandco.design",font=f2);d.text(((W-w2)/2,930),"@pixelandco.design",font=f2,fill=(156,151,199))
    im.save(f'fr/f{f:04d}.jpg',quality=92)
print('frames',N)
