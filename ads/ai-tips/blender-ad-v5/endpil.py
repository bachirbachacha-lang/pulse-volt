from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os, math
W,H=780,1688; os.makedirs('endframes',exist_ok=True)
F=lambda s,w='Bold': ImageFont.truetype(f'/usr/share/fonts/opentype/inter/Inter-{w}.otf',s)
def eo(v): v=max(0,min(1,v)); return 1-(1-v)**4
def back(v): v=max(0,min(1,v)); c1=1.70158; c3=c1+1; return 1+c3*(v-1)**3+c1*(v-1)**2
bg=Image.new('RGB',(W,H),(9,8,26)); d=ImageDraw.Draw(bg)
for y in range(0,H,52): d.line([(0,y),(W,y)],fill=(22,20,44))
for x in range(0,W,52): d.line([(x,0),(x,H)],fill=(22,20,44))
glow=Image.new('RGB',(W,H),(0,0,0)); g=ImageDraw.Draw(glow); g.ellipse([120,420,660,980],fill=(42,33,112)); g.ellipse([450,1350,900,1750],fill=(70,28,20)); glow=glow.filter(ImageFilter.GaussianBlur(120))
bg=Image.blend(bg,Image.eval(glow,lambda p:p),0.0); bg=Image.fromarray(__import__('numpy').clip(__import__('numpy').array(bg,int)+__import__('numpy').array(glow,int),0,255).astype('uint8'))
cols=[(179,168,255),(244,241,255),(82,70,214),(124,108,255)]; starts=[(-400,-500),(400,-500),(-400,500),(400,500)]
for i in range(552,747):
    t=(i-552)/30; im=bg.copy(); d=ImageDraw.Draw(im)
    for k,(c,(sx,sy)) in enumerate(zip(cols,starts)):
        p=eo((t-.1-k*.07)/.7)
        if p<=0: continue
        cx=390+(-54 if k%2==0 else 54)+sx*(1-p); cy=660+(-54 if k<2 else 54)+sy*(1-p); s=46*(.3+.7*p)
        tile=Image.new('RGBA',(200,200),(0,0,0,0)); ImageDraw.Draw(tile).rounded_rectangle([100-s,100-s,100+s,100+s],radius=int(s*.48),fill=c+(int(255*p),))
        tile=tile.rotate(90*(1-p),resample=Image.BICUBIC); im.paste(tile,(int(cx-100),int(cy-100)),tile)
    def text(s,y,font,col,p,dy=40):
        if p<=0: return
        layer=Image.new('RGBA',(W,H),(0,0,0,0)); ld=ImageDraw.Draw(layer); w=ld.textlength(s,font=font); ld.text(((W-w)/2,y+dy*(1-p)),s,font=font,fill=col+(int(255*p),)); im.paste(layer,(0,0),layer)
    text('Pixel & Co.',790,F(82),(244,241,255),eo((t-.6)/.5))
    text('Websites that sell. Ready in days.',930,F(42,'Medium'),(179,168,255),eo((t-.9)/.5),30)
    p=back((t-1.2)/.55)
    if p>0:
        sc=.6+.4*p; pulse=1+.04*math.sin((t-1.8)*2*math.pi/1.0) if t>1.8 else 1; sc*=pulse
        f=F(int(40*sc)); s='Free sample first  ·  DM us'; w=d.textlength(s,font=f); pw,ph=w+96*sc,96*sc
        layer=Image.new('RGBA',(W,H),(0,0,0,0)); ld=ImageDraw.Draw(layer); ld.rounded_rectangle([(W-pw)/2,1095-ph/2,(W+pw)/2,1095+ph/2],radius=int(ph/2),fill=(124,108,255,int(255*min(1,p)))); ld.text(((W-w)/2,1095-int(40*sc)*.62),s,font=f,fill=(255,255,255,int(255*min(1,p)))); im.paste(layer,(0,0),layer)
    text('@pixelandco.design',1200,F(36,'Medium'),(156,151,199),eo((t-1.5)/.5),0)
    im.save(f'endframes/f{i:04d}.jpg',quality=92)
print('ok',len(os.listdir('endframes')))
