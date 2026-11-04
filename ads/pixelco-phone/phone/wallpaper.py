import sys, math
from PIL import Image, ImageDraw, ImageFilter, ImageFont
out = sys.argv[1]
W, H = 1179, 2556
img = Image.new("RGB", (W, H), (9, 8, 10))
glow = Image.new("RGB", (W, H), (0, 0, 0))
g = ImageDraw.Draw(glow)
# three glowing orange arcs, echoing the "Together we can make" frames
for i, cy in enumerate([520, 1280, 2040]):
    r = 1500
    cx = -r + 520 + i * 40
    for w, col in [(46, (120, 38, 8)), (18, (255, 110, 40)), (5, (255, 214, 170))]:
        g.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col, width=w)
glow = glow.filter(ImageFilter.GaussianBlur(22))
img = Image.blend(img, glow, 1.0)
sharp = Image.new("RGB", (W, H), (0, 0, 0))
s = ImageDraw.Draw(sharp)
for i, cy in enumerate([520, 1280, 2040]):
    r = 1500; cx = -r + 520 + i * 40
    s.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 190, 140), width=4)
img = Image.fromarray(__import__("numpy").maximum(__import__("numpy").array(img), __import__("numpy").array(sharp)))
d = ImageDraw.Draw(img)
def font(size, w="SemiBold"):
    for p in [f"/usr/share/fonts/opentype/inter/InterDisplay-{w}.otf", f"/usr/share/fonts/opentype/inter/Inter-{w}.otf"]:
        try: return ImageFont.truetype(p, size)
        except OSError: pass
    return ImageFont.load_default()
d.text((W / 2, 1280), "Pixel & Co.", font=font(120), fill=(244, 240, 236), anchor="mm")
d.text((W / 2, 1400), "DESIGN  ·  MOTION  ·  WEB", font=font(40, "Medium"), fill=(200, 160, 130), anchor="mm")
# status bar
d.text((150, 120), "9:41", font=font(56), fill=(245, 245, 245), anchor="mm")
for k in range(4):
    h = 14 + k * 7
    d.rounded_rectangle([880 + k * 22, 138 - h, 894 + k * 22, 138], 3, fill=(245, 245, 245))
d.rounded_rectangle([985, 98, 1070, 142], 12, outline=(245, 245, 245), width=4)
d.rounded_rectangle([993, 106, 1050, 134], 6, fill=(245, 245, 245))
# home indicator
d.rounded_rectangle([W / 2 - 200, H - 40, W / 2 + 200, H - 26], 7, fill=(235, 235, 235))
img.save(out)
print("saved", out)
