import os, subprocess, shutil, glob
D="/root/v5"; SAMP="/home/claude/wt/pixel-co/samples"; OUT=f"{D}/track"; shutil.rmtree(OUT,True); os.makedirs(OUT)
W,H=780,1688
def tgt(i): return f"{OUT}/f{i:04d}.jpg"
def video(i0,i1,src,s0,speed,fit=False):
    n=i1-i0+1; tmp=f"{D}/tmp_seg"; shutil.rmtree(tmp,True); os.makedirs(tmp)
    sc=f"scale={W}:-2:flags=lanczos,pad={W}:{H}:0:(oh-ih)/2:black" if fit else f"scale={W}:{H}:flags=lanczos"
    subprocess.run(["ffmpeg","-loglevel","error","-y","-ss",str(s0),"-i",f"{SAMP}/{src}","-vf",f"setpts=(PTS-STARTPTS)/{speed},fps=30,{sc}","-frames:v",str(n),"-q:v","2",f"{tmp}/s%04d.jpg"],check=True)
    got=sorted(glob.glob(tmp+"/s*.jpg"))
    for k in range(n): shutil.copyfile(got[min(k,len(got)-1)],tgt(i0+k))
subprocess.run(["ffmpeg","-loglevel","error","-y","-f","lavfi","-i",f"color=c=black:s={W}x{H}","-frames:v","1",f"{D}/black.jpg"],check=True)
for i in range(0,123): shutil.copyfile(f"{D}/black.jpg",tgt(i))
video(123,179,"watch-ultra/video/torq-ultra-phone.mp4",0.3,2.2)
video(180,237,"watch-ultra/video/torq-ultra-phone.mp4",6.3,2.8)
video(238,322,"detailing-cinematic/video/lustre-phone.mp4",1.45,2.3,fit=True)
video(323,379,"watch-luxe/video/torq-atelier-phone.mp4",0.3,2.4)
video(380,436,"watch-luxe/video/torq-atelier-phone.mp4",18.2,2.4)
video(437,493,"watch-atelier2/video/torq-atelier2-phone.mp4",0.3,2.4)
video(494,551,"detailing-cinematic/video/lustre-phone.mp4",9.0,2.3,fit=True)
for i in range(552,747): shutil.copyfile(f"{D}/endframes/f{i:04d}.jpg",tgt(i))
shutil.rmtree(f"{D}/tmp_seg",True); print("track frames",len(os.listdir(OUT)))
