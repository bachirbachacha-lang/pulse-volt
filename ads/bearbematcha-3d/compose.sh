#!/usr/bin/env bash
# compose.sh <3d.webm (VP9 with alpha)> <layers dir with bg/ fg/> <song.wav> <out.mp4>
# bg (opaque) -> 3D drink render (alpha, scaled to 1080x1920) -> fg (text) ; beat zoom kick after the drop; grain; song.
set -e
IN="$1"; LAY="$2"; SONG="$3"; OUT="$4"
ffmpeg -loglevel error -y -framerate 30 -start_number 1 -i "$LAY/bg/bg%04d.jpg" -c:v libvpx-vp9 -i "$IN" -framerate 30 -start_number 1 -i "$LAY/fg/fg%04d.png" -i "$SONG" -filter_complex "
[1:v]scale=1080:1920:flags=lanczos,format=yuva420p,fps=30,setpts=N/30/TB,tpad=start=${PAD:-0}:color=0x00000000[d];
[0:v]setpts=N/30/TB[b];
[d]split[dA][dB];[dB]lutyuv=a='clip((val-${END_ACUT:-48})*255/(255-${END_ACUT:-48})\,0\,255)',scale=trunc(iw*${END_SCALE:-0.8}/2)*2:-2:flags=lanczos[dBs];
[b][dA]overlay=0:0:shortest=0:enable='lt(t,18.39)'[b1];
[b1][dBs]overlay=x=(W-w)/2:y=(H-h)/2+${END_DY:-60}:shortest=0:enable='gte(t,18.39)',
scale=w='trunc(1080*(1+0.016*if(gt(t\,4.11)\,exp(-mod(t-0.3\,0.9513)*9)\,0))/2)*2':h=-2:eval=frame:flags=bicubic,crop=1080:1920,
noise=alls=4:allf=t[m];
[2:v]setpts=N/30/TB[f];
[m][f]overlay=0:0,format=yuv420p,trim=0:24.9[v];
[3:a]atrim=0:24.9,asetpts=PTS-STARTPTS,afade=t=out:st=24.2:d=0.7[a]" \
 -map "[v]" -map "[a]" -c:v libx264 -crf 17 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest "$OUT"
echo "wrote $OUT"
