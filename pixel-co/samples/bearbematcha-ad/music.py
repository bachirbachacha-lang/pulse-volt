"""Cute 15 s jingle for the Bear be matcha sample ad, synthesised from scratch (no samples).
120 BPM, F major, F - C - Dm - Bb. Marimba-style plucks, soft kick, shaker, sine bass,
plus glockenspiel 'pops' timed to the on-screen moments in ad.html."""
import numpy as np, wave, sys
SR=48000; DUR=15.0; N=int(SR*DUR); out=np.zeros((N,2)); rng=np.random.default_rng(3)
def note(m): return 440*2**((m-69)/12)
def add(sig,start,pan=0.,gain=1.):
    i=int(start*SR)
    if i>=N: return
    sig=sig[:N-i]*gain; out[i:i+len(sig),0]+=sig*np.sqrt(.5*(1-pan)); out[i:i+len(sig),1]+=sig*np.sqrt(.5*(1+pan))
def tt(d): return np.arange(int(d*SR))/SR
def marimba(m,d=.45):
    t=tt(d);f=note(m)
    return (np.sin(2*np.pi*f*t)*np.exp(-t*7)+.35*np.sin(2*np.pi*f*4*t)*np.exp(-t*22)+.15*np.sin(2*np.pi*f*10*t)*np.exp(-t*60))
def glock(m,d=1.2):
    t=tt(d);f=note(m)
    return np.sin(2*np.pi*f*t)*np.exp(-t*3)+.4*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*6)+.2*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*12)
def lp(x,c):
    a=np.exp(-2*np.pi*c/SR);y=np.empty_like(x);s=0.
    for i in range(len(x)): s=a*s+(1-a)*x[i];y[i]=s
    return y
CH=[(53,[65,69,72]),(48,[64,67,72]),(50,[65,69,74]),(46,[65,70,74])]
def chord(s): return CH[int(s//2)%4]
# intro 0-2: just a soft glock arpeggio + drop "boing" when the bear lands
for k,m in enumerate([77,81,84,89]): add(glock(m),.1+k*.22,pan=(-.3,.3)[k%2],gain=.18)
t=tt(.5);add(np.sin(2*np.pi*np.cumsum(220+300*np.exp(-t*9))/SR)*np.exp(-t*6),.62,gain=.35)
# marimba pattern from 2 s: 8ths over the chord
pat=[0,2,1,2,0,2,1,2]
for k in range(int(DUR/.25)):
    s=k*.25
    if s<2 or s>=14.5: continue
    root,ch=chord(s);m=ch[pat[k%8]]+(12 if (k%16)>=12 else 0)
    add(marimba(m),s,pan=-.25 if k%2 else .25,gain=.22 if k%2 else .3)
# sine bass on beats
for k in range(int(DUR/.5)):
    s=k*.5
    if 2<=s<14:
        root,_=chord(s);t=tt(.45);add(np.sin(2*np.pi*note(root-12)*t)*np.exp(-t*4)*np.minimum(1,t*200),s,gain=.45)
# soft kick + shaker
def kick():
    t=tt(.3);return np.sin(2*np.pi*np.cumsum(50+90*np.exp(-t*30))/SR)*np.exp(-t*12)
for k in range(int(DUR/.5)):
    s=k*.5
    if 2<=s<13: add(kick(),s,gain=.55)
for k in range(int(DUR/.125)):
    s=k*.125
    if 2<=s<13:
        n=int(.05*SR);nz=rng.standard_normal(n);add((nz-lp(nz,5000))*np.exp(-np.arange(n)/SR*70),s,pan=.4,gain=.05 if k%2 else .03)
# clap-snaps on 2 & 4
for k in range(int(DUR/.5)):
    s=k*.5
    if k%2 and 2<=s<13:
        n=int(.12*SR);nz=rng.standard_normal(n);add((nz-lp(nz,1500))*np.exp(-np.arange(n)/SR*30),s,pan=-.1,gain=.18)
# pops: drink tags (4.25 + i), add-on chips, phone ticks, final logo bell
for i in range(5): add(glock(84+[0,2,4,5,7][i],.8),4.25+i,pan=.2,gain=.22)
for i in range(6): add(glock(79+[0,4,7,12,7,4][i],.6),9.15+i*.17,pan=(-.3,.3)[i%2],gain=.16)
for i in range(6):
    t=tt(.05);add(np.sin(2*np.pi*1800*t)*np.exp(-t*90),11.45+i*.175,gain=.12)
add(glock(89,2.2),12.95,gain=.28);add(glock(84,2.2),13.0,gain=.22);add(glock(77,2.2),13.05,gain=.2)
# swooshes on scene cuts
for s in (1.75,3.75,8.8,10.8,12.75):
    n=int(.35*SR);nz=rng.standard_normal(n);sw=lp(nz,2500)*np.sin(np.linspace(0,np.pi,n))**2;add(sw,s,gain=.25)
# end pad 13-15
t=tt(2.0);pad=sum(np.sin(2*np.pi*note(m)*t)*(.5+.5*np.sin(2*np.pi*.5*t)) for m in (53,60,65,69))
add(pad*np.minimum(1,t*3)*np.exp(-t*.8)/4,13.0,gain=.4)
out=np.tanh(out*1.2);fl=int(.5*SR);out[-fl:]*=np.linspace(1,0,fl)[:,None]**2
out*=10**(-1/20)/np.max(np.abs(out))
with wave.open(sys.argv[1],'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((out*32767).astype('<i2').tobytes())
print('ok')
