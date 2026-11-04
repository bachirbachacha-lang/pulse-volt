#!/usr/bin/env bash
# compose.sh <3d video or "preview:<dir>"> <overlay dir> <song.wav> <out.mp4>
# Beat kick (+1.8% zoom decaying on every beat after the drop), light grain, overlay, song with fade.
set -e
IN="$1"; OV="$2"; SONG="$3"; OUT="$4"
if [[ "$IN" == preview:* ]]; then D="${IN#preview:}"; SRC=(-framerate 15 -pattern_type glob -i "$D/p*.jpg"); else SRC=(-i "$IN"); fi
ffmpeg -loglevel error -y "${SRC[@]}" -framerate 30 -i "$OV/o%04d.png" -i "$SONG" -filter_complex "
[0:v]scale=1080:1920:flags=lanczos,fps=30,setpts=N/30/TB,
scale=w='trunc(1080*(1+0.018*if(gt(t\,4.11)\,exp(-mod(t-0.3\,0.9513)*9)\,0))/2)*2':h=-2:eval=frame:flags=bicubic,crop=1080:1920,
noise=alls=5:allf=t,format=yuva420p[bg];
[bg][1:v]overlay=0:0:shortest=1,format=yuv420p[v];
[2:a]atrim=0:24.9,asetpts=PTS-STARTPTS,afade=t=out:st=24.2:d=0.7[a]" \
 -map "[v]" -map "[a]" -c:v libx264 -crf 17 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest "$OUT"
echo "wrote $OUT"
