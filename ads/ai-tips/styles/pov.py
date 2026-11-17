import sys, json, subprocess, os
from PIL import Image, ImageDraw, ImageFont
F=ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Bold.otf',50)
def box(text,path,hl=False):
    W=1080; d=ImageDraw.Draw(Image.new('RGBA',(1,1)))
    words=text.split(); lines=[];cur=''
    for w in words:
        t=(cur+' '+w).strip()
        if d.textlength(t,font=F)>880 and cur: lines.append(cur); cur=w
        else: cur=t
    lines.append(cur); lh=66; pad=22
    im=Image.new('RGBA',(W,len(lines)*lh+pad*2+10),(0,0,0,0)); dr=ImageDraw.Draw(im)
    for i,l in enumerate(lines):
        tw=dr.textlength(l,font=F); x=(W-tw)/2; y=pad+i*lh
        dr.rounded_rectangle([x-24,y-10,x+tw+24,y+lh-2],radius=16,fill=(124,108,255,255) if hl else (255,255,255,255))
        dr.text((x,y-2),l,font=F,fill=(255,255,255,255) if hl else (10,10,10,255))
    im.save(path)
spec=json.load(open(sys.argv[1])); name=spec['name']; os.makedirs(name,exist_ok=True)
inputs=['-ss',str(spec['ss']),'-t',str(spec['dur']),'-i',spec['src']]; fc=f"[0:v]setpts=PTS/{spec.get('speed',1)},fps=30,scale=1080:-2,crop=1080:1920:0:{spec.get('cy',0)},"
fc+="scale=w='trunc(1080*(1+0.035*if(gt(t\\,4.0)\\,exp(-mod(t-0.3\\,0.9513)*10)\\,0))/2)*2':h=-2:eval=frame,crop=1080:1920,eq=contrast=1.04:saturation=1.08[v0];"
last='v0'
for i,(t0,t1,txt) in enumerate(spec['caps']):
    p=f"{name}/c{i}.png"; box(txt,p,hl=txt.startswith('*')) if True else None
    if txt.startswith('*'): box(txt[1:],p,hl=True)
    inputs+=['-loop','1','-t',str(spec['dur']),'-i',p]
    fc+=f"[{i+1}:v]format=rgba,fade=t=in:st={t0}:d=0.12:alpha=1[c{i}];[{last}][c{i}]overlay=0:{spec.get('capy',330)}:enable='between(t,{t0},{t1})'[v{i+1}];"; last=f'v{i+1}'
fc+=f"[{last}]noise=alls=3:allf=t,format=yuv420p[out]"
subprocess.run(['ffmpeg','-loglevel','error','-y',*inputs,'-filter_complex',fc,'-map','[out]','-t',str(spec['dur']),'-c:v','libx264','-crf','19','-preset','medium','-movflags','+faststart',f'{name}.mp4'],check=True)
print('ok',name)
