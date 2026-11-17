import sys, json, numpy as np, soundfile as sf
sys.path.insert(0,'/home/claude/wt/ads/crewup'); import sfx as S
SR=S.SR
def hit():
    t=S.t_axis(.6); f=110*np.exp(-t*6)+45; ph=2*np.pi*np.cumsum(f)/SR; return np.sin(ph)*np.exp(-t*7)*.9 + S.lowpass(S.noise(.6,3),.08)*S.env(.6,.002,30)*.4
def rise():
    t=S.t_axis(.35); f=300+900*t/.35; return np.sin(2*np.pi*np.cumsum(f)/SR)*np.sin(np.pi*t/.35)*.18
def tick(): return S.bell(1800,.12,40)*.35
def key():  return S.tap()*1.2
def typ():  return S.lowpass(S.noise(.05,int(np.random.rand()*99)),.5)*S.env(.05,.001,90)*.5
B={'pop':S.pop,'ding':S.ding,'msg':S.msg,'win':S.win,'hit':hit,'rise':rise,'tick':tick,'key':key,'type':typ}
cues=json.load(open(sys.argv[1])); dur=float(sys.argv[3]); out=np.zeros(int(dur*SR)+SR)
for t,n,g in cues:
    x=np.asarray(B[n](),float); i=int(t*SR)
    if i<0 or i>=len(out): continue
    x=x[:len(out)-i]; out[i:i+len(x)]+=x*g
out=out/ max(1e-6,np.abs(out).max())*0.7
sf.write(sys.argv[2],out.astype(np.float32),SR); print('fx ok',len(cues))
