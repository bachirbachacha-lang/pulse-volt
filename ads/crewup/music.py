"""Puts the owner's song under a finished reel.

Picks the loudest stretch of the song that is as long as the video, nudges it so a
beat lands on the video's big moment (the logo reveal), fades in/out, and mixes the
reel's own sound effects on top (song ducked under them).

Usage: python3 music.py <video.mp4> <song> <out.mp4> [--hit SECONDS] [--start SECONDS] [--no-sfx]
  --hit    time in the video where a beat should land (default: the logo cue, else 75% in)
  --start  force where the song starts (seconds into the song); skips the auto pick
  --no-sfx drop the reel's sound effects, song only
"""
import argparse
import json
import os
import subprocess

import numpy as np

SR = 22050


def decode(path, sr=SR, channels=1):
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', str(channels), '-ar', str(sr), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(out, dtype=np.int16).astype(np.float32) / 32768


def beats(x, sr=SR, hop=512):
    """Onset strength by spectral flux, tempo by autocorrelation, beat grid by phase search."""
    win = np.hanning(2048)
    frames = np.lib.stride_tricks.sliding_window_view(x, 2048)[::hop] * win
    mag = np.abs(np.fft.rfft(frames, axis=1))
    flux = np.maximum(0, np.diff(np.log1p(mag), axis=0)).sum(axis=1)
    flux = (flux - flux.mean()) / (flux.std() + 1e-9)
    fps = sr / hop
    ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
    lo, hi = int(fps * 60 / 180), int(fps * 60 / 70)          # 70-180 BPM
    period = lo + int(np.argmax(ac[lo:hi]))
    phase = max(range(period), key=lambda p: flux[p::period].sum())
    grid = np.arange(phase, len(flux), period) / fps
    return 60 * fps / period, grid, flux, fps


def rms_track(x, sr=SR, step=.25):
    n = int(sr * step)
    return np.sqrt(np.add.reduceat(x * x, np.arange(0, len(x) - n, n)) / n), step


def pick_start(song, dur, hit):
    bpm, grid, flux, fps = beats(song)
    env, step = rms_track(song)
    w = int(dur / step)
    if len(env) <= w:
        return 0.0, bpm
    score = np.convolve(env, np.ones(w), 'valid')
    s = float(np.argmax(score) * step)
    # shift so the beat nearest to (s + hit) lands exactly on hit
    target = s + hit
    b = grid[np.argmin(np.abs(grid - target))]
    # snap to the strongest real onset within 120 ms of that grid beat
    i0, i1 = int((b - .12) * fps), int((b + .12) * fps) + 1
    if 0 <= i0 < i1 <= len(flux):
        b = (i0 + int(np.argmax(flux[i0:i1]))) / fps + 1024 / SR
    s = max(0.0, s + (b - target))
    return s, bpm


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video'); ap.add_argument('song'); ap.add_argument('out')
    ap.add_argument('--hit', type=float); ap.add_argument('--start', type=float)
    ap.add_argument('--no-sfx', action='store_true')
    ap.add_argument('--cues', help='sfx.json from the render, used for the default --hit')
    a = ap.parse_args()

    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', a.video],
                               check=True, capture_output=True, text=True).stdout)
    hit = a.hit
    if hit is None and a.cues and os.path.exists(a.cues):
        logo = [c['t'] for c in json.load(open(a.cues))['cues'] if c['type'] == 'logo']
        hit = logo[0] if logo else None
    if hit is None:
        hit = dur * .75
    if a.start is not None:
        start, bpm = a.start, None
    else:
        start, bpm = pick_start(decode(a.song), dur, hit)
    print(f'song starts at {start:.2f}s' + (f', ~{bpm:.0f} BPM' if bpm else '') + f', beat on {hit:.2f}s of the video')

    has_audio = 'audio' in subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', a.video],
                                          capture_output=True, text=True).stdout
    fade = f'afade=t=in:d=0.4,afade=t=out:st={max(0, dur - 1.2):.2f}:d=1.2'
    if has_audio and not a.no_sfx:
        # song ducks a little whenever an effect plays
        fc = (f'[1:a]atrim=start={start:.3f}:duration={dur:.3f},asetpts=PTS-STARTPTS,{fade},volume=0.8[m];'
              f'[0:a]asplit=2[sfx][key];[m][key]sidechaincompress=threshold=0.05:ratio=4:attack=5:release=250[md];'
              f'[md][sfx]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]')
    else:
        fc = f'[1:a]atrim=start={start:.3f}:duration={dur:.3f},asetpts=PTS-STARTPTS,{fade}[a]'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.video, '-i', a.song, '-filter_complex', fc,
                    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
                    '-movflags', '+faststart', a.out], check=True)
    print('wrote', a.out)


if __name__ == '__main__':
    main()
