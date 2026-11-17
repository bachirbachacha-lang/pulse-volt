from PIL import Image, ImageDraw, ImageFont
F=lambda s,w='Bold': ImageFont.truetype(f'/usr/share/fonts/opentype/inter/Inter-{w}.otf',s)
def card(name,w,h,bg,draw,radius=44):
    im=Image.new('RGBA',(w,h),(0,0,0,0)); d=ImageDraw.Draw(im); d.rounded_rectangle([0,0,w-1,h-1],radius=radius,fill=bg); draw(d,w,h); im.save(f'cards/{name}.png')
def big(d,w,h,num,unit,label,col,unitcol):
    d.text((40,34),label,font=F(26,'SemiBold'),fill=(255,255,255,170))
    d.text((40,80),num,font=F(92),fill=col); nw=d.textlength(num,font=F(92)); d.text((48+nw,128),unit,font=F(34,'SemiBold'),fill=unitcol)
card('c_torq_bpm',420,210,(26,24,32,255),lambda d,w,h:big(d,w,h,'128','bpm','HEART RATE',(255,255,255,255),(255,90,54,255)))
card('c_torq_steps',420,210,(26,24,32,255),lambda d,w,h:big(d,w,h,'9,420','steps','TODAY',(255,255,255,255),(255,140,60,255)))
def colour(d,w,h):
    d.text((36,30),'PICK YOUR COLOUR',font=F(24,'SemiBold'),fill=(255,255,255,170))
    for i,c in enumerate([(20,20,22),(230,60,40),(60,90,220),(225,200,150)]): d.ellipse([36+i*86,78,36+i*86+64,142],fill=c+(255,),outline=(255,255,255,255) if i==1 else None,width=4)
card('c_torq_colour',400,180,(26,24,32,255),colour)
def book(d,w,h):
    d.text((40,42),'Book a wash',font=F(40),fill=(5,34,43,255)); d.text((40,96),'Ceramic coating · 5 yr',font=F(26,'Medium'),fill=(5,34,43,170))
card('c_book',440,150,(41,224,255,255),book)
def day(d,w,h):
    d.text((w/2-d.textlength('FRI',font=F(24,'SemiBold'))/2,24),'FRI',font=F(24,'SemiBold'),fill=(5,34,43,180)); d.text((w/2-d.textlength('7',font=F(64))/2,52),'7',font=F(64),fill=(5,34,43,255))
card('c_day',150,140,(41,224,255,255),day,radius=34)
def pkg(d,w,h):
    d.text((36,30),'DETAILING',font=F(24,'SemiBold'),fill=(41,224,255,255)); d.text((36,66),'Full interior + exterior',font=F(32),fill=(255,255,255,255)); d.text((36,112),'3 h · pick-up available',font=F(24,'Medium'),fill=(255,255,255,160))
card('c_pkg',480,160,(15,58,70,255),pkg)
def size(d,w,h):
    for i,s in enumerate(['42','44','46']):
        x=28+i*118; sel=i==1
        d.rounded_rectangle([x,28,x+96,124],radius=26,fill=(203,184,154,255) if sel else None,outline=None if sel else (80,78,74,255),width=3)
        d.text((x+48-d.textlength(s+' mm',font=F(26,'SemiBold'))/2,62),s+' mm',font=F(26,'SemiBold'),fill=(14,14,16,255) if sel else (242,238,232,255))
card('c_size',400,152,(26,25,28,255),size)
def bag(d,w,h):
    d.text((40,36),'Added to bag',font=F(36),fill=(14,14,16,255)); d.text((40,86),'TORQ Atelier · Black / Gold',font=F(24,'Medium'),fill=(14,14,16,170))
card('c_bag',440,140,(203,184,154,255),bag)
def strap(d,w,h):
    d.text((36,30),'STRAP',font=F(24,'SemiBold'),fill=(203,184,154,255)); d.text((36,64),'Black leather',font=F(34),fill=(242,238,232,255))
    for i,c in enumerate([(20,20,22),(90,60,40),(200,200,205)]): d.ellipse([290+i*42,66,290+i*42+32,98],fill=c+(255,))
card('c_strap',430,130,(26,25,28,255),strap)
print('cards ok')
