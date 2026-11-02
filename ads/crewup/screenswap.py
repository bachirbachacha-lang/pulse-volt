#!/usr/bin/env python3
"""Put CrewUp app screens onto a REAL phone filmed showing a plain green image.

Per frame: soft green key -> screen corners (lines fitted to the green edges). The phone's real 3D pose is
solved from those corners (camera focal length estimated from the clip), so frames where part of the screen
is out of shot are tracked by fitting the pose to whatever green edges are still visible, starting from the
neighbouring frame. The UI is warped onto the screen, real glare and anything
covering the screen (fingers) stay on top, green spill on the bezel is removed, and the UI gets the
clip's softness, motion blur and grain so it sits in the footage.

usage: python3 screenswap.py in.mov out.mp4 --ui 0:x/tex/lock_faisal_169.png --ui 4:x/tex/cam_faisal_169.png
       [--banner 1.0:x/tex/ban_nudge.png:300] [--debug dbg.mp4]
UI images must have the phone screen's aspect (390x693 pt screens = 16:9 phones, 390x820 pt = modern).
"""
import argparse, os, subprocess, tempfile, glob
import cv2
import numpy as np
from scipy.optimize import least_squares


def soft_key(img):
    f = img.astype(np.float32)
    b, g, r = f[..., 0], f[..., 1], f[..., 2]
    return np.clip((g - np.maximum(r, b) - 22) / 45, 0, 1)


def green_blob(k):
    m = (k > .5).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n < 2:
        return None
    j = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
    if st[j, cv2.CC_STAT_AREA] < 3000:
        return None
    return (lab == j).astype(np.uint8)


def order(q):
    """TL, TR, BR, BL with the long sides vertical and 'up' toward the top of the picture."""
    c = q.mean(0)
    q = q[np.argsort(np.arctan2(q[:, 1] - c[1], q[:, 0] - c[0]))]  # clockwise on screen (y down)
    e = [np.linalg.norm(q[(i + 1) % 4] - q[i]) for i in range(4)]
    s = 1 if e[0] + e[2] > e[1] + e[3] else 0  # q[s]->q[s+1] is a short edge
    if (q[s % 4][1] + q[(s + 1) % 4][1]) > (q[(s + 2) % 4][1] + q[(s + 3) % 4][1]):
        s += 2
    return np.array([q[(s + i) % 4] for i in range(4)], np.float32)


def intersect(l1, l2):
    (p, d), (q, e) = l1, l2
    A = np.array([[d[0], -e[0]], [d[1], -e[1]]])
    if abs(np.linalg.det(A)) < 1e-6:
        return (p + q) / 2
    t = np.linalg.solve(A, q - p)
    return p + t[0] * d


def edge_points(blob, W, H):
    cs, _ = cv2.findContours(blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    pts = max(cs, key=cv2.contourArea).reshape(-1, 2).astype(np.float32)
    keep = (pts[:, 0] > 3) & (pts[:, 1] > 3) & (pts[:, 0] < W - 4) & (pts[:, 1] < H - 4)
    return pts[keep]


def snap(quad, pts, tol=12, min_pts=25):
    """Re-fit every edge of a predicted quad to nearby green contour points; keep edges that are not visible."""
    lines = []
    for i in range(4):
        p0, p1 = quad[i], quad[(i + 1) % 4]
        d = p1 - p0
        L = np.linalg.norm(d) + 1e-6
        d = d / L
        nrm = np.array([-d[1], d[0]])
        rel = pts - p0
        t, dist = rel @ d, np.abs(rel @ nrm)
        sel = pts[(t > .1 * L) & (t < .9 * L) & (dist < tol)]
        if len(sel) >= min_pts:
            vx, vy, x0, y0 = cv2.fitLine(sel, cv2.DIST_HUBER, 0, .01, .01).ravel()
            lines.append((np.array([x0, y0]), np.array([vx, vy])))
        else:
            lines.append((p0, d))
    return np.array([intersect(lines[i - 1], lines[i]) for i in range(4)], np.float32)


def measure(blob, W, H):
    """Corners when the whole screen is in shot, else None."""
    ys, xs = np.nonzero(blob)
    if xs.min() <= 2 or ys.min() <= 2 or xs.max() >= W - 3 or ys.max() >= H - 3:
        return None
    cs, _ = cv2.findContours(blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    hull = cv2.convexHull(max(cs, key=cv2.contourArea))
    per = cv2.arcLength(hull, True)
    for e in np.linspace(.005, .06, 50):
        a = cv2.approxPolyDP(hull, e * per, True)
        if len(a) == 4:
            q = order(a.reshape(4, 2).astype(np.float32))
            return order(snap(q, edge_points(blob, W, H), tol=8))
    return None


def seg_dist(P, q):
    """distance of every point to the nearest edge of quad q"""
    d = np.full(len(P), 1e9)
    for i in range(4):
        a, b = q[i], q[(i + 1) % 4]
        ab = b - a
        t = np.clip(((P - a) @ ab) / (ab @ ab + 1e-9), 0, 1)
        d = np.minimum(d, np.linalg.norm(P - (a + t[:, None] * ab), axis=1))
    return d


class Pose:
    """Screen = flat rectangle (aspect from the UI) seen by a pinhole camera; pose = rvec + tvec."""
    def __init__(self, W, H, aspect):
        self.W, self.H = W, H
        w = 60.0
        h = w * aspect
        self.obj = np.float64([[-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0]])
        self.set_f(1000)

    def set_f(self, f):
        self.f = f
        self.K = np.float64([[f, 0, self.W / 2], [0, f, self.H / 2], [0, 0, 1]])

    def project(self, x):
        return cv2.projectPoints(self.obj, x[:3], x[3:], self.K, None)[0].reshape(4, 2).astype(np.float32)

    def solve(self, q, near=None):
        ok, rs, ts, _ = cv2.solvePnPGeneric(self.obj, q.astype(np.float64), self.K, None, flags=cv2.SOLVEPNP_IPPE)
        xs = [np.concatenate([r.ravel(), t.ravel()]) for r, t in zip(rs, ts)]
        score = [np.abs(self.project(x) - q).mean() + (np.linalg.norm(x[:3] - near[:3]) * 50 if near is not None else 0) for x in xs]
        return xs[int(np.argmin(score))]

    def calibrate(self, quads):
        def err(f):
            self.set_f(f)
            return np.median([np.abs(self.project(self.solve(q)) - q).mean() for q in quads])
        best = min(range(400, 3001, 50), key=err)
        best = min(range(best - 50, best + 51, 5), key=err)
        self.set_f(best)
        return best, err(best)

    def iou(self, q, blob_small, k=4):
        m = np.zeros(blob_small.shape, np.uint8)
        cv2.fillPoly(m, [(q / k).astype(np.int32)], 1)
        inter = (m & blob_small).sum()
        return inter / max(1, (m | blob_small).sum())

    def track(self, x_prev, pts, blob):
        """fit the pose to the visible green, starting from the neighbouring frame; returns (pose, score)"""
        x0 = x_prev.copy()
        if blob is None:
            return x0, 9.0
        k = 4
        small = cv2.resize(blob, (self.W // k, self.H // k), interpolation=cv2.INTER_NEAREST)
        by, bx = np.nonzero(blob)
        c = np.array([bx.mean(), by.mean()], np.float32)
        q0 = self.project(x0)
        m = np.zeros((self.H, self.W), np.uint8)
        cv2.fillPoly(m, [q0.astype(np.int32)], 1)
        if m.sum() > 500:  # move the guess onto the visible green
            ys, xs = np.nonzero(m)
            q0 = q0 + (c - np.array([xs.mean(), ys.mean()], np.float32))
        # coarse 2D search (rotation + scale about the green's centre) so big moves don't trap the fit
        best = (self.iou(q0, small, k), q0)
        for ang in range(-30, 31, 6):
            for sc in (.85, .92, 1.0, 1.08, 1.17):
                R = cv2.getRotationMatrix2D((float(c[0]), float(c[1])), ang, sc)
                q = (q0 @ R[:, :2].T + R[:, 2]).astype(np.float32)
                v = self.iou(q, small, k)
                if v > best[0]:
                    best = (v, q)
        x0 = self.solve(best[1], near=x0)
        if pts is None or len(pts) < 30:
            return x0, 1 - best[0]
        P = pts[np.linspace(0, len(pts) - 1, min(len(pts), 500)).astype(int)]
        xr = x0.copy()

        def res(x):
            reg = np.concatenate([(x[:3] - xr[:3]) * 10, (x[3:] - xr[3:]) * .1])
            return np.concatenate([seg_dist(P, self.project(x)), reg])
        r = least_squares(res, x0, loss='huber', f_scale=2.0, max_nfev=300)
        x = r.x if np.median(seg_dist(P, self.project(r.x))) < np.median(seg_dist(P, self.project(x0))) else x0
        score = np.median(seg_dist(P, self.project(x))) / 10 + (1 - self.iou(self.project(x), small, k))
        return x, score



def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('out')
    ap.add_argument('--ui', action='append', required=True, help='start_seconds:image.png')
    ap.add_argument('--banner', action='append', default=[], help='start_seconds:banner.png:y_pt (390 pt wide screen)')
    ap.add_argument('--debug', help='also write a video with the tracked corners drawn')
    ap.add_argument('--grain', type=float, default=3.0)
    a = ap.parse_args()

    tmp = tempfile.mkdtemp(prefix='swap_')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.src, '-map', '0:v:0', f'{tmp}/f%05d.png'], check=True)
    fps = eval(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', a.src],
                              capture_output=True, text=True).stdout.strip())
    files = sorted(glob.glob(f'{tmp}/f*.png'))
    frames = [cv2.imread(f) for f in files]
    N, (H, W) = len(frames), frames[0].shape[:2]
    keys = [soft_key(f) for f in frames]
    blobs = [green_blob(k) for k in keys]

    # 1) exact corners where the whole screen is visible
    Q = [measure(b, W, H) if b is not None else None for b in blobs]

    # 2) camera focal length from the full-screen frames, then the screen's 3D pose in every frame
    full = [i for i in range(N) if Q[i] is not None]
    if not full:
        raise SystemExit('the whole green screen is never fully in shot; film a take that shows all four corners')
    probe = cv2.imread(a.ui[0].split(':', 1)[1])
    ui_aspect = probe.shape[0] / probe.shape[1]
    pose = Pose(W, H, ui_aspect)
    f, e = pose.calibrate([Q[i] for i in full[::max(1, len(full) // 40)]])
    print(f'focal length {f}px (corner error {e:.2f}px), aspect {ui_aspect:.3f}')
    pts_of = lambda i: edge_points(blobs[i], W, H) if blobs[i] is not None else None
    # track forwards from every full-screen frame and backwards from the next one; keep the better fit
    F, Bk = [None] * N, [None] * N
    for i in range(N):
        if Q[i] is not None:
            F[i] = (pose.solve(Q[i], near=F[i - 1][0] if i and F[i - 1] else None), 0.0)
        elif i and F[i - 1] is not None:
            F[i] = pose.track(F[i - 1][0], pts_of(i), blobs[i])
    for i in range(N - 1, -1, -1):
        if Q[i] is not None:
            Bk[i] = (pose.solve(Q[i], near=Bk[i + 1][0] if i < N - 1 and Bk[i + 1] else None), 0.0)
        elif i < N - 1 and Bk[i + 1] is not None:
            Bk[i] = pose.track(Bk[i + 1][0], pts_of(i), blobs[i])
    out_q = []
    for i in range(N):
        if Q[i] is not None:
            out_q.append(Q[i])
            continue
        c = [x for x in (F[i], Bk[i]) if x is not None]
        out_q.append(order(pose.project(min(c, key=lambda x: x[1])[0])) if c else None)
    known = [i for i in range(N) if out_q[i] is not None]
    for i in range(N):
        if out_q[i] is None:
            out_q[i] = out_q[min(known, key=lambda j: abs(j - i))]
    # light temporal smoothing (kills sub-pixel jitter, keeps fast moves)
    Qs = np.array(out_q)
    sm = Qs.copy()
    for i in range(1, N - 1):
        sm[i] = .25 * Qs[i - 1] + .5 * Qs[i] + .25 * Qs[i + 1]

    # 4) UI schedule
    def load(p):
        im = cv2.imread(p, cv2.IMREAD_UNCHANGED)
        if im.shape[2] == 4:
            a4 = im[..., 3:4].astype(np.float32) / 255
            im = (im[..., :3].astype(np.float32) * a4 + 9 * (1 - a4)).astype(np.uint8)
        return im
    uis = sorted((float(s.split(':', 1)[0]), load(s.split(':', 1)[1])) for s in a.ui)
    bans = []
    for s in a.banner:
        t0, path, y = s.split(':')
        bans.append((float(t0), cv2.imread(path, cv2.IMREAD_UNCHANGED), float(y)))

    def ui_at(t):
        img = [u for t0, u in uis if t >= t0][-1].copy() if any(t >= t0 for t0, _ in uis) else uis[0][1].copy()
        sc = img.shape[1] / 390.0
        for t0, b, y in bans:
            if t < t0 or not (t >= max(t0 for t0, _ in uis if t0 <= t)):
                continue
            if any(t0 < u0 <= t for u0, _ in uis):
                continue  # the screen changed after the banner arrived
            k = min(1, (t - t0) / .35)
            e = 1 - (1 - k) ** 3
            bw = int(370 * sc); bh = int(b.shape[0] * bw / b.shape[1])
            bb = cv2.resize(b, (bw, bh), interpolation=cv2.INTER_AREA)
            x0 = int(10 * sc); y0 = int((y - 60 * (1 - e)) * sc - bh / 2)
            y1, y2 = max(0, y0), min(img.shape[0], y0 + bh)
            if y2 <= y1:
                continue
            al = bb[y1 - y0:y2 - y0, :, 3:4].astype(np.float32) / 255 * e
            img[y1:y2, x0:x0 + bw] = (img[y1:y2, x0:x0 + bw] * (1 - al) + bb[y1 - y0:y2 - y0, :, :3] * al).astype(np.uint8)
        return img

    # 5) composite
    rng = np.random.default_rng(7)
    outd = f'{tmp}/out'; os.makedirs(outd)
    dbgd = f'{tmp}/dbg'; os.makedirs(dbgd)
    for i, f in enumerate(frames):
        t = i / fps
        q = sm[i]
        ui = ui_at(t).astype(np.float32)
        uh, uw = ui.shape[:2]
        M = cv2.getPerspectiveTransform(np.float32([[0, 0], [uw, 0], [uw, uh], [0, uh]]), q)
        warped = cv2.warpPerspective(ui, M, (W, H), flags=cv2.INTER_AREA if np.linalg.norm(q[1] - q[0]) < uw * .5 else cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        inside = cv2.dilate(cv2.warpPerspective(np.ones((uh, uw), np.float32), M, (W, H), flags=cv2.INTER_LINEAR), np.ones((51, 51), np.uint8))
        # motion blur along the screen's movement (180 degree shutter)
        if 0 < i < N - 1:
            v = ((sm[i + 1] - sm[i - 1]) / 4).mean(0)
            L = float(np.hypot(*v))
            if L > 1.5:
                n = int(min(31, L * 2)) | 1
                kern = np.zeros((n, n), np.float32)
                c = n // 2
                cv2.line(kern, (int(c - v[0] / L * c), int(c - v[1] / L * c)), (int(c + v[0] / L * c), int(c + v[1] / L * c)), 1, 1)
                kern /= kern.sum()
                warped = cv2.filter2D(warped, -1, kern)
                inside = cv2.filter2D(inside, -1, kern)
        warped = cv2.GaussianBlur(warped, (0, 0), .6)
        k = keys[i]
        alpha = (np.clip(k * 1.15, 0, 1) * np.clip(inside * 1.5, 0, 1))[..., None]
        src = f.astype(np.float32)
        # keep the real screen's brightness changes and the white glare that sits on the glass
        g = src[..., 1]
        sel = (k > .8) & (inside > .5)
        if sel.sum() > 500:
            gm = np.median(g[sel])
            mrb = np.minimum(src[..., 0], src[..., 2])
            base = np.median(mrb[sel])
            shade = np.clip(g / max(gm, 1), .75, 1.2)[..., None] ** .7
            glare = np.clip(mrb - base - 6, 0, 255)[..., None] * .9
        else:
            shade, glare = 1.0, 0.0
        screen = np.clip(warped * shade + glare, 0, 255)
        near = cv2.dilate((inside > .5).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        mrb2 = np.maximum(src[..., 0], src[..., 2])
        gfix = near & (src[..., 1] > mrb2)
        src[..., 1][gfix] = (mrb2 + .15 * (src[..., 1] - mrb2))[gfix]
        out = src * (1 - alpha) + screen * alpha
        # green spill on the bezel right around the screen
        ring = (cv2.dilate((inside > .5).astype(np.uint8), np.ones((13, 13), np.uint8)) > 0) & (alpha[..., 0] < .98)
        b_, g_, r_ = out[..., 0], out[..., 1], out[..., 2]
        mx = np.maximum(b_, r_)
        spill = ring & (g_ > mx)
        out[..., 1][spill] = (mx + .2 * (g_ - mx))[spill]
        out += rng.normal(0, a.grain, out.shape).astype(np.float32) * alpha
        cv2.imwrite(f'{outd}/f{i:05d}.png', np.clip(out, 0, 255).astype(np.uint8))
        if a.debug:
            d = f.copy()
            col = (0, 255, 255) if Q[i] is not None else (255, 0, 255)
            cv2.polylines(d, [q.astype(np.int32)], True, col, 2)
            cv2.circle(d, tuple(q[0].astype(int)), 6, (0, 0, 255), -1)
            cv2.imwrite(f'{dbgd}/f{i:05d}.png', d)
    enc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', f'{outd}/f%05d.png', *enc, a.out], check=True)
    if a.debug:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', f'{dbgd}/f%05d.png', *enc, a.debug], check=True)
    meas = sum(q is not None for q in Q)
    print(f'{N} frames: {meas} with the whole screen in shot, {N - meas} tracked from the visible edges')


if __name__ == '__main__':
    main()
