#!/usr/bin/env bash
# cut15.sh <final25.mp4> <song.wav> <out15.mp4>
# 15 s cut-down of a 25 s "ski slopes" ad: video 2.20-10.77 (logo, drop, first product) + 18.39-24.90 (end card),
# both cuts sit on the beat grid, so the song can run continuously from 2.20 s.
set -e
IN="$1"; SONG="$2"; OUT="$3"
ffmpeg -loglevel error -y -i "$IN" -i "$SONG" -filter_complex "
[0:v]trim=2.2:10.77,setpts=PTS-STARTPTS[a];[0:v]trim=18.39:24.9,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1[v];
[1:a]atrim=2.2:17.28,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.15,afade=t=out:st=14.4:d=0.68[au]" \
 -map "[v]" -map "[au]" -c:v libx264 -crf 17 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest "$OUT"
echo "wrote $OUT"
