import sys,wave,numpy as np,json
w=wave.open(sys.argv[1]);sr=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
hop=256;win=1024
frames=np.lib.stride_tricks.sliding_window_view(x,win)[::hop]*np.hanning(win)
S=np.abs(np.fft.rfft(frames,axis=1))
lg=np.log1p(100*S)
flux=np.maximum(0,np.diff(lg,axis=0)).sum(1);flux=np.concatenate([[0],flux])
flux=(flux-flux.mean())/(flux.std()+1e-9)
t=np.arange(len(flux))*hop/sr
# tempo via autocorrelation
ac=np.correlate(flux,flux,'full')[len(flux)-1:]
lags=np.arange(len(ac))*hop/sr
m=(lags>60/180)&(lags<60/60)
best=lags[m][np.argmax(ac[m])];bpm=60/best
# beat phase
period=best;cands=np.linspace(0,period,200,endpoint=False)
score=[np.interp(np.arange(c,t[-1],period),t,flux).sum() for c in cands];ph=cands[int(np.argmax(score))]
beats=np.arange(ph,t[-1],period)
# strong onsets
from numpy.lib.stride_tricks import sliding_window_view as sw
pk=[i for i in range(2,len(flux)-2) if flux[i]==flux[i-2:i+3].max() and flux[i]>2.2]
rms=np.sqrt((frames**2).mean(1))
# energy per second
eps=[float(rms[(t>=s)&(t<s+1)].mean()) for s in range(int(t[-1])+1)]
print('duration',round(t[-1],2),'bpm',round(bpm,1),'phase',round(ph,3))
print('beats',[round(b,2) for b in beats])
print('strong hits',[round(t[i],2) for i in pk])
print('energy/s',[round(e,3) for e in eps])
json.dump({'bpm':bpm,'beats':beats.tolist(),'hits':[float(t[i]) for i in pk],'energy':eps},open(sys.argv[2],'w'))
