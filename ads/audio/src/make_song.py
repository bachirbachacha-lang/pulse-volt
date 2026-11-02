"""Pixel & Co. 'One Link' - original instrumental, synthesised from scratch (no samples, no loops).
Run: python3 make_song.py <out_dir>  -> one-link-full.wav (~35s) and one-link-15s.wav
"""
import sys, wave
import numpy as np

SR = 44100
BPM = 110
BEAT = 60 / BPM
BAR = 4 * BEAT
EIGHTH = BEAT / 2
rng = np.random.default_rng(7)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def lowpass(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))

def highpass(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (cutoff / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X, len(x))

def saw(f, t): return 2 * ((t * f) % 1) - 1
def sq(f, t): return np.sign(np.sin(2 * np.pi * f * t))

def env(n, a=0.01, r=0.05):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    if nr < n: e[-nr:] *= np.linspace(1, 0, nr)
    return e

# ---- instruments ----
def kick():
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)

def clap():
    n = int(0.25 * SR); t = np.arange(n) / SR
    noise = rng.uniform(-1, 1, n)
    e = np.exp(-t / 0.06)
    for d in (0.0, 0.012, 0.024):  # three quick hits = clap feel
        e += 0.6 * np.exp(-np.maximum(t - d, 0) / 0.008) * (t >= d)
    return noise * e * 0.5

def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR); t = np.arange(n) / SR
    return rng.uniform(-1, 1, n) * np.exp(-t / (0.06 if open_ else 0.015))

def pad(notes, dur):
    n = int(dur * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for m in notes:
        for d in (-0.08, 0, 0.08):
            s += saw(hz(m) * 2 ** (d / 12), t)
    return s / (3 * len(notes)) * env(n, 0.08, 0.25)

def pluck(m, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    return (0.6 * saw(hz(m), t) + 0.4 * sq(hz(m), t)) * np.exp(-t / 0.12) * env(n, 0.003, 0.02)

def bass(m, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    return (0.5 * saw(hz(m), t) + 0.8 * np.sin(2 * np.pi * hz(m) * t)) * env(n, 0.005, 0.04)

def lead(m, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(t / 0.15, 1)
    ph = np.cumsum(hz(m) * vib) / SR
    tone = 0.5 * np.sign(np.sin(2 * np.pi * ph)) * 0.35 + 0.65 * np.sin(2 * np.pi * ph) + 0.2 * np.sin(4 * np.pi * ph)
    e = env(n, 0.01, 0.06) * (0.65 + 0.35 * np.exp(-t / 0.1))
    return tone * e

# ---- music ----
CH = {  # pad voicing, bass root, arp notes
    'C':  ([60, 64, 67], 36, [72, 67, 64, 67]),
    'G':  ([59, 62, 67], 43, [71, 67, 62, 67]),
    'Am': ([60, 64, 69], 45, [72, 69, 64, 69]),
    'F':  ([60, 65, 69], 41, [72, 69, 65, 69]),
}
_ = None
# lead melodies, 8 eighth-notes per bar (MIDI or None; '-' = hold previous)
HOOK = {  # "Where's the menu? / What's the price?"
    0: [67, 69, 72, '-', _, _, _, _],
    1: [67, 69, 74, '-', _, _, _, _],
}
CHORUS = [
    [76, _, 76, _, 79, 79, 76, 74],    # One link, one tap, they or-der
    [74, '-', 71, '-', 74, '-', _, _], # on What-sApp
    [72, 72, 76, _, 81, 79, 76, _],    # your me-nu, your pri-ces
    [77, 76, 72, '-', 69, '-', _, _],  # all in one spot
    [76, _, 79, _, 84, '-', 79, _],    # Pix-el and Co.
    [74, _, 71, _, 67, '-', _, _],     # we build it for you
    [72, 72, 76, 76, 79, _, 76, _],    # free sam-ple first, see
    [77, _, 76, _, 74, _, 72, '-'],    # what we can do
]

def bar(chord, parts, mel=None):
    return dict(chord=chord, parts=set(parts.split()), mel=mel)

def arrangement(full=True):
    A = []
    A.append(bar('Am', 'pad hat', HOOK[0]))
    A.append(bar('F', 'pad hat', HOOK[1]))
    if full:  # verse
        for c in 'C G Am F'.split():
            A.append(bar(c, 'pad arp bass kick clap hat'))
        chorus = CHORUS
    else:
        chorus = CHORUS[:4]
    for i, c in enumerate(['C', 'G', 'Am', 'F'] * 2):
        if i >= len(chorus): break
        A.append(bar(c, 'pad arp bass kick clap hat ohat lead', chorus[i]))
    A.append(bar('C', 'pad end'))
    return A

def render(A):
    total = int((len(A) * BAR + 2.0) * SR)
    tr = {k: np.zeros(total) for k in 'drums pad arp bass lead'.split()}
    duck = np.ones(total)
    def add(k, sig, t0, g=1.0):
        i = int(t0 * SR); j = min(total, i + len(sig))
        tr[k][i:j] += g * sig[:j - i]
    for b, B in enumerate(A):
        t0 = b * BAR; P = B['parts']; padn, root, arp = CH[B['chord']]
        if 'pad' in P: add('pad', pad(padn, BAR * (2 if 'end' in P else 1) + 0.2), t0, 0.5)
        if 'end' in P:
            add('drums', kick(), t0, 0.9); add('drums', hat(True), t0, 0.15)
            add('bass', bass(root, BAR * 0.9), t0, 0.5)
        for s in range(8):
            ts = t0 + s * EIGHTH
            if 'kick' in P and s in (0, 4, 5 if b % 2 else 99):
                add('drums', kick(), ts, 0.9)
                i = int(ts * SR); k = np.arange(min(int(0.25 * SR), total - i)) / SR
                duck[i:i + len(k)] = np.minimum(duck[i:i + len(k)], 1 - 0.55 * np.exp(-k / 0.09))
            if 'clap' in P and s in (2, 6): add('drums', clap(), ts, 0.55)
            if 'hat' in P: add('drums', hat(), ts + (0.012 if s % 2 else 0), 0.16 if s % 2 else 0.1)
            if 'ohat' in P and s % 2: add('drums', hat(True), ts, 0.07)
            if 'arp' in P: add('arp', pluck(arp[s % 4], EIGHTH), ts, 0.22)
            if 'bass' in P and s not in (3,):
                add('bass', bass(root + (12 if s == 7 else 0), EIGHTH * 0.85), ts, 0.45)
        if B['mel']:
            mel = B['mel']; s = 0
            while s < 8:
                m = mel[s]
                if m is None or m == '-': s += 1; continue
                ln = 1
                while s + ln < 8 and mel[s + ln] == '-': ln += 1
                add('lead', lead(m, ln * EIGHTH * 0.92), t0 + s * EIGHTH, 0.32)
                s += ln
    tr['pad'] = lowpass(tr['pad'], 1800) * duck
    tr['arp'] = lowpass(tr['arp'], 3200) * (0.6 + 0.4 * duck)
    tr['bass'] = lowpass(tr['bass'], 500) * duck
    tr['lead'] = lowpass(tr['lead'], 6000)
    tr['drums'] = highpass(tr['drums'], 30)
    # echo on lead + arp
    for k, g in (('lead', 0.28), ('arp', 0.2)):
        d = int(3 * EIGHTH * SR); x = tr[k].copy()
        for rep in (1, 2, 3):
            x[d * rep:] += (g ** rep) * tr[k][:-d * rep]
        tr[k] = x
    L = tr['drums'] + tr['bass'] + tr['pad'] + 0.8 * tr['arp'] + tr['lead']
    hs = int(0.013 * SR)  # small delay on the right = wider pad/arp
    wide = tr['pad'] + 0.8 * tr['arp']
    R = L - wide + np.concatenate([np.zeros(hs), wide[:-hs]])
    st = np.stack([L, R], 1)
    st = np.tanh(1.3 * st / np.max(np.abs(st)))
    return st / np.max(np.abs(st)) * 0.89

def write(path, st):
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype('<i2').tobytes())

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    write(f'{out}/one-link-full.wav', render(arrangement(True)))
    write(f'{out}/one-link-15s.wav', render(arrangement(False)))
