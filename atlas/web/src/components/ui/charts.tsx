import { useId, useMemo, useRef, useState } from "react";

/** Tiny trend line for stat tiles (no axes). */
export function Sparkline({ values, max, color = "var(--color-series-1)", height = 36, label }: { values: number[]; max?: number; color?: string; height?: number; label: string }) {
  const id = useId();
  if (values.length < 2) return <div style={{ height }} aria-label={`${label}: not enough data yet`} />;
  const w = 200;
  const top = max ?? Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - 2 - (v / top) * (height - 4)] as const);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} role="img" aria-label={`${label}, latest ${values.at(-1)?.toFixed(1)}`}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d}L${w},${height}L0,${height}Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export interface Series {
  name: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

/** Line chart with one y-axis, crosshair + tooltip listing every series, and a legend. */
export function LineChart({ x, series, height = 260, format = (v: number) => v.toFixed(2), xFormat = (s: string) => s }: { x: string[]; series: Series[]; height?: number; format?: (v: number) => string; xFormat?: (s: string) => string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const pad = { l: 56, r: 12, t: 12, b: 26 };
  const { min, max, ticks } = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    if (lo === hi) (lo -= 1), (hi += 1);
    const span = hi - lo;
    lo -= span * 0.05;
    hi += span * 0.05;
    const step = niceStep((hi - lo) / 4);
    const t: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) t.push(v);
    return { min: lo, max: hi, ticks: t };
  }, [series]);
  const n = x.length;
  const sx = (i: number) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - pad.l - pad.r));
  const sy = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (height - pad.t - pad.b);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join("");
  const xTicks = n > 1 ? [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1] : [0];

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
  };

  return (
    <figure className="w-full">
      {series.length > 1 && (
        <figcaption className="mb-2 flex flex-wrap gap-4 text-xs text-fg-2">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <svg width="16" height="4" aria-hidden><line x1="0" y1="2" x2="16" y2="2" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} /></svg>
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <div className="relative">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${height}`}
          className="block h-auto w-full touch-none"
          role="img"
          tabIndex={0}
          aria-label={`Line chart: ${series.map((s) => `${s.name} from ${format(s.values[0])} to ${format(s.values.at(-1)!)}`).join("; ")}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} stroke="var(--color-line)" strokeWidth="1" />
              <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)" fontFamily="var(--font-mono)">{format(t)}</text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} x={sx(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="11" fill="var(--color-muted)">{xFormat(x[i] ?? "")}</text>
          ))}
          {series.map((s) => (
            <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "5 4" : undefined} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          ))}
          {hover !== null && (
            <g>
              <line x1={sx(hover)} x2={sx(hover)} y1={pad.t} y2={height - pad.b} stroke="var(--color-line-strong)" strokeWidth="1" />
              {series.map((s) => (
                <circle key={s.name} cx={sx(hover)} cy={sy(s.values[hover])} r="4" fill={s.color} stroke="var(--color-card)" strokeWidth="2" />
              ))}
            </g>
          )}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-2 rounded-lg border border-line bg-raised px-3 py-2 text-xs shadow-xl" style={{ left: `${(sx(hover) / W) * 100}%`, transform: `translateX(${sx(hover) > W / 2 ? "calc(-100% - 12px)" : "12px"})` }}>
            <p className="mb-1 text-muted">{x[hover]}</p>
            {series.map((s) => (
              <p key={s.name} className="flex items-center gap-2">
                <svg width="12" height="4" aria-hidden><line x1="0" y1="2" x2="12" y2="2" stroke={s.color} strokeWidth="2" /></svg>
                <span className="font-mono font-semibold text-fg">{format(s.values[hover])}</span>
                <span className="text-fg-2">{s.name}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </figure>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}

/** HUD ring gauge for a single percentage: tick ring, glowing arc, centred readout. */
export function Gauge({ value, label, size = 76 }: { value: number | null; label: string; size?: number }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const c = size / 2;
  const r = size / 2 - 9;
  const circ = 2 * Math.PI * r;
  const tone = v > 90 ? "var(--color-danger)" : v > 75 ? "var(--color-warn)" : "var(--color-accent)";
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2 - Math.PI / 2;
    const r1 = size / 2 - 2;
    const r2 = size / 2 - (i % 3 === 0 ? 6 : 4);
    return { x1: c + Math.cos(a) * r1, y1: c + Math.sin(a) * r1, x2: c + Math.cos(a) * r2, y2: c + Math.sin(a) * r2, on: i / 36 < v / 100 };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${value == null ? "unknown" : v.toFixed(0) + "%"}`}>
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.on ? tone : "var(--color-line-strong)"} strokeWidth="1.2" opacity={t.on ? 0.9 : 0.5} />
      ))}
      <circle cx={c} cy={c} r={r} fill="rgb(63 224 255 / 0.05)" stroke="var(--color-line)" strokeWidth="4" />
      <circle cx={c} cy={c} r={r} fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(v / 100) * circ} ${circ}`} transform={`rotate(-90 ${c} ${c})`} style={{ transition: "stroke-dasharray .5s", filter: `drop-shadow(0 0 4px ${tone})` }} />
      <circle className="spin-slow" cx={c} cy={c} r={r - 7} fill="none" stroke="var(--color-accent)" strokeWidth="0.8" strokeDasharray="2 5" opacity="0.5" />
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontSize={size > 90 ? 18 : 14} fontWeight="600" fill="var(--color-fg)" fontFamily="var(--font-mono)" style={{ filter: "drop-shadow(0 0 6px rgb(63 224 255 / 0.6))" }}>{value == null ? "—" : `${Math.round(v)}%`}</text>
    </svg>
  );
}
