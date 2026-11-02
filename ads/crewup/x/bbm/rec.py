# Pulls the phone-screen frames for x/bbm.html out of the real v4 site recording
# (pixel-co/samples/bearbematcha-v4/video/bearbematcha-v4-phone.mp4, 1080x2338, 30 fps).
#
# It also fixes one thing the recording gets wrong: the site writes prices as "مشروب · ٢٦ ر.س", and in Arabic
# the "·" lands right next to the digits, where it looks like an Arabic zero (٢٦ reads as ٢٦٠ = 260, ٤٤ as 440).
# The reel must show the real prices, so the separator dot is painted out (bottom order bar + "add to order" button).
# The dot is found on every frame, not at fixed places, because the button moves while the page scrolls.
#
#   python3 rec.py            -> writes x/bbm/rec/fNNNN.jpg (NNNN = source frame number; not committed, ~70 MB)
#                                and x/bbm/rec/adNN.jpg (their 15 s story ad, 4.4-5.9 s, every 2nd frame of 60 fps)
import os, subprocess, sys
import numpy as np, cv2
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '../../../../pixel-co/samples/bearbematcha-v4/video/bearbematcha-v4-phone.mp4'))
AD = os.path.normpath(os.path.join(HERE, '../../../../pixel-co/samples/bearbematcha-ad/bearbematcha-ad-1080x1920.mp4'))
OUT = os.path.join(HERE, 'rec')
# source frame ranges used by the reel (shots A hero, B menu carousel, C build your drink, E WhatsApp preview)
RANGES = [(0, 60), (330, 395), (650, 750), (980, 1045)]
W, H = 1080, 2338


def longest_run(row):
    best = cur = 0
    for v in row:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best


def small_blobs(mask, y0, x0):
    lab, k = nd.label(mask)
    out = []
    for i, sl in enumerate(nd.find_objects(lab)):
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start; a = int((lab[sl] == i + 1).sum())
        if 5 <= h <= 11 and 5 <= w <= 11 and 22 <= a <= 60:
            out.append(((sl[1].start + sl[1].stop) / 2 + x0, (sl[0].start + sl[0].stop) / 2 + y0))
    return out


def paint(rgb, dark, cx, cy):
    yy, xx = np.ogrid[:H, :W]
    d2 = (xx - cx) ** 2 + (yy - cy) ** 2
    ring = (d2 >= 10 ** 2) & (d2 <= 14 ** 2) & dark
    col = np.median(rgb[ring], axis=0) if ring.any() else np.array([75, 42, 30])
    rgb[d2 <= 7.5 ** 2] = col


def fix_dots(rgb):
    R, G, B = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    dark = (R < 110) & (G < 70) & (B < 55)          # the ink-brown pills
    cream = (R > 225) & (G > 210) & (B > 170)       # their cream text
    fixed = 0
    # 1) the sticky order bar ("١ مشروب · ٢٦ ر.س") sits at a fixed place at the bottom
    if dark[2160:2170, 600:1000].mean() > .9 and dark[2255:2265, 600:1000].mean() > .9:
        for cx, cy in small_blobs(cream[2195:2230, 780:822], 2195, 780):
            paint(rgb, dark, cx, cy); fixed += 1
    # 2) the "add to order" button: the only full-width ink pill (a dark run over 900 px in its padding rows)
    rows = np.where(dark.sum(1) > 500)[0]
    rows = rows[rows < 2120]
    if len(rows):
        groups, s, p = [], rows[0], rows[0]
        for r in rows[1:]:
            if r != p + 1:
                groups.append((s, p)); s = r
            p = r
        groups.append((s, p))
        for y0, y1 in groups:
            if y1 - y0 < 60 or max(longest_run(dark[y]) for y in range(y0, y1 + 1, 4)) < 900:
                continue
            mid = (y0 + y1) / 2
            # the separator sits at mid letter height, between the price digits and the word (x 440..560);
            # letter dots below the line (the dot of "ب") are lower, the "." of ر.س is further left
            # (only the rightmost such blob: the price digits to its left can break into small pieces too)
            cand = [(cx, cy) for cx, cy in small_blobs(cream[y0:y1 + 1, 440:561], y0, 440) if cy < mid - 1]
            if cand:
                cx, cy = max(cand)
                paint(rgb, dark, cx, cy); fixed += 1
    return fixed


def main():
    os.makedirs(OUT, exist_ok=True)
    need = set(n for a, b in RANGES for n in range(a, b + 1))
    last = max(need)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', SRC, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    n, fixes = 0, 0
    while n <= last:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        if n in need:
            rgb = np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy()
            fixes += fix_dots(rgb)
            cv2.imwrite(os.path.join(OUT, f'f{n:04d}.jpg'), rgb[..., ::-1], [cv2.IMWRITE_JPEG_QUALITY, 90])
        n += 1
    p.kill()
    print(f'{len(need)} frames -> {OUT}, {fixes} separator dots painted out')
    # the story ad on the second phone: birthday card sliding over to Whimsical (their real ad, 30 fps)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '4.4', '-t', '1.5', '-i', AD, '-vf', 'fps=30', '-q:v', '3',
                    os.path.join(OUT, 'ad%02d.jpg')], check=True)
    print('ad frames:', len([f for f in os.listdir(OUT) if f.startswith('ad')]))


if __name__ == '__main__':
    main()
