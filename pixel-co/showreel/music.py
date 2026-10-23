"""Synthesise the 15 s showreel score from scratch: no samples, only oscillators, noise and envelopes.
120 BPM, A minor (Am - F - C - G). Section map matches the scene cuts in reel.html:
0-2 intro (pad + tick), 2 drop (kick, bass, arp), 10-12 build (snare roll + riser), 12 impact, 12-15 outro."""
import numpy as np, wave, sys

SR = 48000
DUR = 15.0
BEAT = 0.5
N = int(SR * DUR)
t = np.arange(N) / SR
out = np.zeros((N, 2))
rng = np.random.default_rng(7)

def note(m): return 440.0 * 2 ** ((m - 69) / 12)
def env(n, a, d, s=0.0, r=0.0, hold=None):
    """ADSR as samples."""
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    hold = n - a - d - r if hold is None else int(hold * SR)
    hold = max(hold, 0)
    e = np.concatenate([np.linspace(0, 1, a, False), np.linspace(1, s, d, False), np.full(hold, s), np.linspace(s, 0, r)])
    return np.pad(e, (0, max(0, n - len(e))))[:n]
def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    out[i:i + len(sig), 0] += sig * np.sqrt(0.5 * (1 - pan))
    out[i:i + len(sig), 1] += sig * np.sqrt(0.5 * (1 + pan))
def saw(f, n, ph=0.0):
    x = (np.arange(n) / SR * f + ph) % 1.0
    return 2 * x - 1
def lowpass(sig, cut):
    """One-pole lowpass; `cut` may be a per-sample array (filter sweeps)."""
    cut = np.broadcast_to(np.asarray(cut, float), sig.shape)
    a = np.exp(-2 * np.pi * cut / SR)
    y = np.empty_like(sig); acc = 0.0
    for i in range(len(sig)):
        acc = a[i] * acc + (1 - a[i]) * sig[i]; y[i] = acc
    return y

# chords: one per bar (2 s), MIDI notes
BARS = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [55, 60, 64]), (55, [55, 59, 62])]
def bar_at(sec): return BARS[int(sec // 2) % 4]

# ---- pad: detuned saws, slow filter, whole piece
for b in range(8):
    root, ch = bar_at(b * 2)
    n = int(2.0 * SR)
    sig = np.zeros(n)
    for m in ch:
        for det in (-0.12, 0.0, 0.11):
            sig += saw(note(m + 12) * 2 ** (det / 12), n, rng.random())
    sig = lowpass(sig / 9, np.linspace(700, 1800, n) if b < 6 else np.linspace(1800, 3200, n))
    add(sig * env(n, 0.25, 0.4, 0.7, 0.4), b * 2, pan=0.0, gain=0.22 if b else 0.7)

# ---- intro ticks (clock feel under the easing curve)
for k in range(8):
    n = int(0.03 * SR)
    add(np.sin(2 * np.pi * 2400 * np.arange(n) / SR) * env(n, 0.001, 0.028), k * 0.25, pan=(-.4, .4)[k % 2], gain=0.3)

# ---- kick from 2 s (pitch-swept sine), muted under the riser bar
def kick():
    n = int(0.45 * SR); tt = np.arange(n) / SR
    f = 45 + 140 * np.exp(-tt * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(np.sin(ph) * 2.2 * np.exp(-tt * 7))
K = kick()
for k in range(int(DUR / BEAT)):
    s = k * BEAT
    if 2 <= s < 11.0 or s >= 12:
        add(K, s, gain=0.85 if s < 12 else 0.6 * max(0, 1 - (s - 12) / 2.5))

# ---- clap on 2 and 4 (filtered noise bursts)
def clap():
    n = int(0.25 * SR); nz = rng.standard_normal(n)
    e = sum(env(n, 0.001, 0.012) * (np.arange(n) >= int(o * SR)) for o in (0, 0.01, 0.02)) + env(n, 0.001, 0.2) * 0.6
    return (nz - lowpass(nz, 900)) * e * 0.6
for k in range(int(DUR / BEAT)):
    s = k * BEAT
    if k % 2 == 1 and (2 <= s < 10 or 12 <= s < 14): add(clap(), s, pan=0.1, gain=0.5)

# ---- hats: 16ths, open hat on the off-beat
def hat(open_=False):
    n = int((0.18 if open_ else 0.04) * SR); nz = rng.standard_normal(n)
    return (nz - lowpass(nz, 6000)) * env(n, 0.001, 0.17 if open_ else 0.035)
for k in range(int(DUR / 0.125)):
    s = k * 0.125
    if 2 <= s < 12:
        add(hat(k % 4 == 2), s, pan=0.35 if k % 2 else -0.25, gain=0.11 if k % 4 == 2 else (0.06 if k % 2 else 0.08))

# ---- bass: sidechained saw an octave down, 8ths, follows the chord root
for k in range(int(DUR / 0.25)):
    s = k * 0.25
    if not (2 <= s < 11.5) and not (12 <= s < 14): continue
    root, _ = bar_at(s)
    n = int(0.24 * SR)
    sig = saw(note(root - 12), n) * 0.6 + np.sin(2 * np.pi * note(root - 24) * np.arange(n) / SR)
    duck = 1 - 0.85 * np.exp(-((s % BEAT) / BEAT) * 4) if k % 2 == 0 else 1
    add(lowpass(sig, 420) * env(n, 0.004, 0.08, 0.6, 0.05) * duck, s, gain=0.42)

# ---- arp: 16th plucks over the chord, brighter each bar, ping-pong pan + delay
arp = np.zeros((N, 2))
for k in range(int(DUR / 0.125)):
    s = k * 0.125
    if not (4 <= s < 12): continue
    _, ch = bar_at(s)
    m = (ch + [c + 12 for c in ch])[k % 6] + 12
    n = int(0.12 * SR)
    sig = np.sign(np.sin(2 * np.pi * note(m) * np.arange(n) / SR)) * 0.5 + saw(note(m), n) * 0.5
    sig = lowpass(sig, 1500 + 400 * (s - 4)) * env(n, 0.002, 0.1)
    i = int(s * SR); L = min(n, N - i); p = -0.5 if k % 2 else 0.5
    arp[i:i + L, 0] += sig[:L] * np.sqrt(0.5 * (1 - p)); arp[i:i + L, 1] += sig[:L] * np.sqrt(0.5 * (1 + p))
d = int(0.375 * SR)  # dotted-8th delay, feedback 0.35
for _ in range(3):
    arp[d:] += arp[:-d][:, ::-1] * 0.35
out += arp * 0.16

# ---- build: snare roll accelerating + noise riser 10-12
roll_times = []
s = 10.0; step = 0.25
while s < 12.0:
    roll_times.append(s); s += step
    if s > 11.0: step = 0.0625
    elif s > 10.5: step = 0.125
for i, s in enumerate(roll_times):
    n = int(0.08 * SR); nz = rng.standard_normal(n)
    add((nz - lowpass(nz, 1500)) * env(n, 0.001, 0.07), s, gain=0.18 + 0.32 * (s - 10) / 2)
n = int(2.0 * SR); nz = rng.standard_normal(n)
riser = lowpass(nz, np.geomspace(300, 9000, n)) * np.linspace(0, 1, n) ** 2
add(riser, 10.0, gain=0.55)
# rising sine sweep
tt = np.arange(n) / SR; f = np.geomspace(110, 880, n)
add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.linspace(0, 1, n) ** 3, 10.0, gain=0.18)

# ---- impacts on the cuts: sub boom + white crash
def impact(big=False):
    n = int((2.5 if big else 0.8) * SR); tt = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 70 * np.exp(-tt * 10)) / SR) * np.exp(-tt * (1.6 if big else 5))
    nz = rng.standard_normal(n); crash = (nz - lowpass(nz, 3000)) * np.exp(-tt * (2.2 if big else 9))
    return np.tanh(boom * 1.6) + crash * (0.5 if big else 0.25)
for s in (2, 4, 6, 8, 10):
    add(impact(), s, gain=0.45)
add(impact(True), 12.0, gain=0.9)

# ---- final chord swell at 12: big Am with an added 9th, long tail
n = int(3.0 * SR)
sig = np.zeros(n)
for m in (45, 57, 60, 64, 71, 76):
    for det in (-0.08, 0.08):
        sig += saw(note(m) * 2 ** (det / 12), n, rng.random())
sig = lowpass(sig / 12, np.linspace(4000, 600, n))
add(sig * env(n, 0.02, 0.5, 0.6, 1.6), 12.0, gain=0.42)

# ---- master: soft clip, fade the last 0.6 s, normalise to -1 dBFS
out = np.tanh(out * 1.1)
fade = np.ones(N); fl = int(0.6 * SR); fade[-fl:] = np.linspace(1, 0, fl) ** 2
out *= fade[:, None]
out *= 10 ** (-1 / 20) / np.max(np.abs(out))
path = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
with wave.open(path, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype("<i2").tobytes())
print("wrote", path, out.shape)
