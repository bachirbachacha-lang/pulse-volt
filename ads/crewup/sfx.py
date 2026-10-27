"""Builds a sound-effects track for a reel from the cues the page recorded.

Every sound is synthesized here (no samples from other brands or apps).
Usage: python3 sfx.py <frames_dir_with_sfx.json> <out.wav>
"""
import json
import sys
import wave

import numpy as np

SR = 44100


def t_axis(sec):
    return np.arange(int(SR * sec)) / SR


def env(sec, attack=.004, decay=8.0):
    t = t_axis(sec)
    return np.minimum(1, t / attack) * np.exp(-t * decay)


def bell(freq, sec=.5, decay=7.0):
    # soft bell: fundamental + a few inharmonic partials
    t = t_axis(sec)
    w = np.sin(2 * np.pi * freq * t) + .35 * np.sin(2 * np.pi * freq * 2.01 * t) + .12 * np.sin(2 * np.pi * freq * 3.02 * t)
    return w * env(sec, .003, decay)


def place(*parts):
    """parts: (offset_seconds, signal)"""
    n = max(int(o * SR) + len(p) for o, p in parts)
    out = np.zeros(n)
    for o, p in parts:
        i = int(o * SR)
        out[i:i + len(p)] += p
    return out


def noise(sec, seed=1):
    return np.random.default_rng(seed).uniform(-1, 1, int(SR * sec))


def lowpass(x, a=.15):
    # one-pole filter; `a` may be a number or a per-sample array (for sweeps)
    a = np.broadcast_to(a, x.shape)
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += a[i] * (v - acc)
        y[i] = acc
    return y


def ding():      # "ba-bum": two quick rising bell notes
    return place((0, .7 * bell(988, .45)), (.11, .8 * bell(1319, .6, 5.5)))


def buzz():      # phone vibration: two low rattly pulses
    t = t_axis(.16)
    pulse = (np.sign(np.sin(2 * np.pi * 165 * t)) * .5 + np.sin(2 * np.pi * 82 * t)) * np.minimum(1, t / .01) * np.minimum(1, (.16 - t) / .02)
    return .45 * place((0, pulse), (.22, pulse))


def tap():       # short screen tap
    t = t_axis(.05)
    click = noise(.05, 3) * np.exp(-t * 180)
    thump = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 60)
    return .8 * (lowpass(click, .5) + .6 * thump)


def pop():
    t = t_axis(.09)
    f = 420 + 900 * t / .09
    return .6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(.09, .003, 30)


def msg():       # incoming chat bubble
    return place((0, .45 * bell(1568, .25, 16)), (.06, .4 * bell(2093, .3, 14)))


def swoosh(sec=.35, seed=5):
    t = t_axis(sec)
    shape = np.sin(np.pi * t / sec) ** 2
    return .28 * lowpass(noise(sec, seed), .08 + .25 * (t / sec)) * shape * 3


def swipe():
    return .6 * swoosh(.25, 7)


def shutter():
    t = t_axis(.06)
    c = lowpass(noise(.06, 9), .6) * np.exp(-t * 90)
    return .55 * place((0, c), (.07, .8 * c))


def win():       # bright little arpeggio
    notes = [784, 988, 1175, 1568]
    return .6 * place(*[(i * .07, .7 * bell(f, .6, 5)) for i, f in enumerate(notes)])


def fail():      # descending "nope"
    t = t_axis(.22)
    a = np.sign(np.sin(2 * np.pi * 220 * t)) * env(.22, .005, 9)
    b = np.sign(np.sin(2 * np.pi * 165 * t)) * env(.22, .005, 7)
    return .22 * place((0, a), (.16, b))


def logo():      # soft chord + riser for the end card
    chord = sum(bell(f, 1.4, 2.6) for f in (523, 659, 784, 1047)) * .3
    return place((0, swoosh(.5, 11)), (.25, chord))


GEN = {'ding': ding, 'buzz': buzz, 'tap': tap, 'pop': pop, 'msg': msg, 'swoosh': swoosh,
       'swipe': swipe, 'shutter': shutter, 'win': win, 'fail': fail, 'logo': logo}


def main(frames_dir, out_wav):
    data = json.load(open(f'{frames_dir}/sfx.json'))
    dur = data['dur']
    mix = np.zeros(int(SR * (dur + 2)))
    cache = {}
    for cue in data['cues']:
        sig = cache.setdefault(cue['type'], GEN[cue['type']]())
        i = int(cue['t'] * SR)
        end = min(len(mix), i + len(sig))
        mix[i:end] += sig[:end - i]
    mix = mix[:int(SR * dur)]
    peak = np.max(np.abs(mix)) or 1
    mix = mix / peak * .85
    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    stereo = np.repeat(pcm[:, None], 2, axis=1)
    with wave.open(out_wav, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(stereo.tobytes())


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
