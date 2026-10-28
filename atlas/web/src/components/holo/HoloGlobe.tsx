import { useEffect, useRef } from "react";

/** Rotating holographic wireframe globe with orbit rings and a scanning arc (Canvas 2D). */
export function HoloGlobe({ size = 260, label = "Holographic globe" }: { size?: number; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c = size / 2;
    const R = size * 0.3;
    const tilt = 0.38;
    // Evenly spread surface points (Fibonacci sphere).
    const pts = Array.from({ length: 420 }, (_, i) => {
      const y = 1 - (i / 419) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      return [Math.cos(th) * r, y, Math.sin(th) * r] as const;
    });
    const project = (x: number, y: number, z: number, rot: number) => {
      const x1 = x * Math.cos(rot) + z * Math.sin(rot);
      const z1 = -x * Math.sin(rot) + z * Math.cos(rot);
      const y2 = y * Math.cos(tilt) - z1 * Math.sin(tilt);
      const z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
      return [c + x1 * R, c + y2 * R, z2] as const;
    };
    let raf = 0;
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      const rot = t * 0.004;
      // Glow core
      const g = ctx.createRadialGradient(c, c, R * 0.2, c, c, R * 1.35);
      g.addColorStop(0, "rgba(63,224,255,0.20)");
      g.addColorStop(0.7, "rgba(63,224,255,0.06)");
      g.addColorStop(1, "rgba(63,224,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c, c, R * 1.35, 0, Math.PI * 2);
      ctx.fill();
      // Latitude and longitude lines
      ctx.lineWidth = 0.8;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        for (let lon = 0; lon <= 360; lon += 6) {
          const la = (lat * Math.PI) / 180;
          const lo = (lon * Math.PI) / 180;
          const [px, py, pz] = project(Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo), rot);
          ctx.strokeStyle = `rgba(63,224,255,${pz > 0 ? 0.35 : 0.1})`;
          lon === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      for (let lon = 0; lon < 180; lon += 30) {
        ctx.beginPath();
        for (let lat = 0; lat <= 360; lat += 6) {
          const la = (lat * Math.PI) / 180;
          const lo = (lon * Math.PI) / 180;
          const [px, py] = project(Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo), rot);
          lat === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "rgba(63,224,255,0.18)";
        ctx.stroke();
      }
      // Surface points, brighter on the near side
      for (const [x, y, z] of pts) {
        const [px, py, pz] = project(x, y, z, rot);
        if (pz < -0.2) continue;
        ctx.fillStyle = `rgba(170,240,255,${0.25 + 0.6 * Math.max(0, pz)})`;
        ctx.fillRect(px - 0.8, py - 0.8, 1.6, 1.6);
      }
      // Orbit rings
      const ring = (rx: number, ry: number, ang: number, alpha: number, dash: number[]) => {
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(ang);
        ctx.setLineDash(dash);
        ctx.strokeStyle = `rgba(63,224,255,${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      };
      ring(R * 1.32, R * 0.42, -0.35 + t * 0.0015, 0.5, [6, 6]);
      ring(R * 1.18, R * 1.18, t * 0.003, 0.28, [2, 10]);
      // Scanning arc
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(t * 0.02);
      ctx.strokeStyle = "rgba(255,183,74,0.8)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(255,183,74,0.9)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.45, 0, Math.PI / 5);
      ctx.stroke();
      ctx.restore();
      // Satellite dot on the tilted orbit
      const sa = t * 0.012;
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(-0.35 + t * 0.0015);
      ctx.fillStyle = "#bff6ff";
      ctx.shadowColor = "#3fe0ff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(Math.cos(sa) * R * 1.32, Math.sin(sa) * R * 0.42, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    const loop = () => {
      t++;
      draw();
      raf = requestAnimationFrame(loop);
    };
    if (reduce) draw();
    else raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size]);
  return <canvas ref={ref} role="img" aria-label={label} style={{ width: size, height: size }} className="max-w-full" />;
}
