"""Text-to-speech voice-over for a silent video: one line per on-screen caption, each placed at its own time.

Voice: Kokoro-82M (open model, Apache-2.0, fine for commercial use), run locally, no API key.
Setup once:  pip install kokoro-onnx soundfile
             download kokoro-v1.0.onnx and voices-v1.0.bin from
             https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 into MODEL_DIR
Use:  python3 vo.py MODEL_DIR VOICE lines.json in.mp4 out.mp4
      lines.json = [[start seconds, "text", speed], ...]; VOICE e.g. af_heart (warm female), am_michael (calm male)
The mix is cleaned (high-pass, presence, gentle compression) and levelled to -15 LUFS / -1.5 dBTP for TikTok and Reels.
"""
import json, subprocess, sys, tempfile
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

model_dir, voice, lines_path, video, out = sys.argv[1:6]
lines = json.load(open(lines_path))
k = Kokoro(f'{model_dir}/kokoro-v1.0.onnx', f'{model_dir}/voices-v1.0.bin')
tmp = tempfile.mkdtemp()
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]))
args, chain, labels = [], '', ''
for i, (t0, text, speed) in enumerate(lines):
    a, sr = k.create(text, voice=voice, speed=speed, lang='en-us')
    a = np.asarray(a, dtype=np.float32)
    on = np.where(np.abs(a) > np.abs(a).max() * .02)[0]                       # trim the silence around the words
    a = a[max(0, on[0] - int(.02 * sr)):min(len(a), on[-1] + int(.08 * sr))]
    f = int(.008 * sr); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
    sf.write(f'{tmp}/l{i}.wav', a, sr)
    end = t0 + len(a) / sr
    print(f'{t0:6.2f}-{end:6.2f}  {text}')
    if i + 1 < len(lines) and end > lines[i + 1][0]: print(f'  warning: overlaps the next line by {end - lines[i + 1][0]:.2f} s')
    ms = int(t0 * 1000)
    args += ['-i', f'{tmp}/l{i}.wav']; chain += f'[{i}:a]aresample=48000,adelay={ms}|{ms}[a{i}];'; labels += f'[a{i}]'
chain += (f'{labels}amix=inputs={len(lines)}:normalize=0,pan=stereo|c0=c0|c1=c0,highpass=f=70,equalizer=f=3500:t=q:w=1.2:g=2.5,'
          f'acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,apad=whole_dur={dur},atrim=0:{dur}[m]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', *args, '-filter_complex', chain, '-map', '[m]', f'{tmp}/raw.wav'], check=True)
probe = subprocess.run(['ffmpeg', '-hide_banner', '-i', f'{tmp}/raw.wav', '-af', 'loudnorm=I=-15:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
m = json.loads(probe[probe.rindex('{'):probe.rindex('}') + 1])
norm = (f"loudnorm=I=-15:TP=-1.5:LRA=9:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
        f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{tmp}/raw.wav', '-af', norm, '-ar', '48000', f'{tmp}/vo.wav'], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', f'{tmp}/vo.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out], check=True)
print('wrote', out)
