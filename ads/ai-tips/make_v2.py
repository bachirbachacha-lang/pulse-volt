import json, sys, os, subprocess, numpy as np, soundfile as sf, torch, torchaudio as ta
from scipy.signal import resample_poly
from chatterbox.tts import ChatterboxTTS
from faster_whisper import WhisperModel
names=sys.argv[1:]; R='/root/tip1'
m=ChatterboxTTS.from_pretrained(device="cpu"); W=WhisperModel("base.en",device="cpu",compute_type="int8")
import re
def norm(x): return [w for w in re.sub(r"[^a-z0-9 ]"," ",x.lower().replace("1","one").replace("2","two").replace("3","three").replace("number ","").replace("claude","cloud").replace("clawed","cloud").replace("&"," and ")).split() if w]
def ok(text,heard):
    e,h=norm(text),norm(heard)
    if not h or h[0]!=e[0] and (len(h)<2 or h[1]!=e[0]): return False
    if e[-1] not in h[-3:]: return False
    return abs(len(h)-len(e))<=max(2,len(e)*0.12)
def say1(text,path,seed):
    torch.manual_seed(seed); w=m.generate(text,audio_prompt_path='/root/tip1/ref/mid.wav',exaggeration=0.4,cfg_weight=0.5); a=w.squeeze().numpy()
    on=np.where(np.abs(a)>np.abs(a).max()*.02)[0]; a=a[max(0,on[0]-480):on[-1]+2400]; sf.write(path,a,m.sr)
    s,_=W.transcribe(resample_poly(a,16000,m.sr).astype('float32')); return len(a)/m.sr," ".join(x.text.strip() for x in s)
def say(text,path,seed):
    for k in range(4):
        d,h=say1(text,path,seed+97*k)
        if ok(text,h): return d,h
        print('  retry',k,'|',h,flush=True)
    return d,h
for name in names:
    sp=json.load(open(f'{R}/specs/{name}.json')); d=f'{R}/out2/{name}'; os.makedirs(d,exist_ok=True)
    items=[("hook",sp['hook']['vo'])]
    for i,t in enumerate(sp['tips']): items+= [(f"n{i+1}",t['n']),(f"t{i+1}",t['vo'])]
    items.append(("cta",sp['cta']['vo']))
    lines=[];t=0.4
    for j,(k,txt) in enumerate(items):
        dur,heard=say(txt,f'{d}/{k}.wav',7+j)
        print(name,k,round(dur,1),'|',heard,flush=True)
        lines.append({"key":k,"text":txt,"t":round(t,2),"d":round(dur,2)}); t+=dur+(0.4 if k[0] in 'nh' else 0.6)
    sp['timing']={"lines":lines,"dur":round(t+1.8,2)}
    html=open(f'{R}/t.html').read().replace('__SPEC__',json.dumps(sp))
    open(f'{R}/{name}_v2.html','w').write(html)
    args=[];f=''
    for i,l in enumerate(lines): args+=['-i',f"{d}/{l['key']}.wav"]; ms=int(l['t']*1000); f+=f"[{i}]aresample=48000,adelay={ms}|{ms}[a{i}];"
    f+=''.join(f"[a{i}]" for i in range(len(lines)))+f"amix=inputs={len(lines)}:normalize=0,highpass=f=70,equalizer=f=3500:t=q:w=1.2:g=2,acompressor=threshold=-20dB:ratio=2.5:attack=5:release=80,loudnorm=I=-15:TP=-1.5,apad,atrim=0:{sp['timing']['dur']}[out]"
    subprocess.run(['ffmpeg','-loglevel','error','-y',*args,'-filter_complex',f,'-map','[out]','-ar','48000',f'{d}/vo.wav'],check=True)
    subprocess.run(['rm','-rf',f'{d}/frames']); env=dict(os.environ,PAGE=f'{name}_v2.html')
    subprocess.run(['node',f'{R}/rec.js',f'{d}/frames'],env=env,check=True,stdout=subprocess.DEVNULL)
    subprocess.run(['python3',f'{R}/fx.py',f'{d}/frames/sfx.json',f'{d}/fx.wav',str(sp['timing']['dur'])],check=True)
    subprocess.run(['ffmpeg','-loglevel','error','-y','-i',f'{d}/vo.wav','-i',f'{d}/fx.wav','-filter_complex','[1]aresample=48000,volume=0.32[f];[0][f]amix=inputs=2:normalize=0,alimiter=limit=0.9[o]','-map','[o]',f'{d}/mix.wav'],check=True)
    subprocess.run(['ffmpeg','-loglevel','error','-y','-framerate','30','-i',f'{d}/frames/f%05d.jpg','-i',f'{d}/mix.wav','-vf','noise=alls=2:allf=t,format=yuv420p','-c:v','libx264','-crf','19','-preset','slow','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',f'{R}/out2/{name}.mp4'],check=True)
    print('DONE',name,flush=True)
