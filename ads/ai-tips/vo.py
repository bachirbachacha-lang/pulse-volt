import json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k=Kokoro('/root/kokoro/kokoro-v1.0.onnx','/root/kokoro/voices-v1.0.bin')
L=[("hook","Three Claude Code features most people never use."),
("n1","Number one. Claude dot M D."),
("t1","Put a file called CLAUDE dot M D in your project. Claude reads it at the start of every session, so it remembers your rules and how you like things done."),
("n2","Number two. Plan mode."),
("t2","Press Shift Tab to switch into plan mode. Claude reads your code and writes a plan first, and changes nothing until you approve it."),
("n3","Number three. Skills."),
("t3","A skill is a folder with a SKILL dot M D file inside. Write your process once, and Claude follows it every time that task comes up."),
("cta","Save this for later, and follow Pixel and Co for more.")]
out=[];t=0.4
for key,text in L:
    a,sr=k.create(text,voice='am_michael',speed=1.08,lang='en-us');a=np.asarray(a,np.float32)
    on=np.where(np.abs(a)>np.abs(a).max()*.02)[0];a=a[max(0,on[0]-int(.02*sr)):on[-1]+int(.08*sr)]
    sf.write(f'{key}.wav',a,sr);d=len(a)/sr;out.append({"key":key,"text":text,"t":round(t,2),"d":round(d,2)});t+=d+(0.35 if key[0] in 'nh' else 0.55)
json.dump({"lines":out,"dur":round(t+1.6,2)},open('lines.json','w'),indent=1)
for o in out: print(o['t'],o['d'],o['key'])
print('TOTAL',round(t+1.6,2))
