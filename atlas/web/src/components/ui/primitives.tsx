import { Loader2, type LucideIcon } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary: "border border-accent/70 bg-accent/15 text-accent-strong font-semibold shadow-[0_0_18px_-4px_rgb(63_224_255/0.7),inset_0_0_12px_rgb(63_224_255/0.15)] hover:bg-accent/25 hover:text-white",
  secondary: "bg-raised/70 text-fg hover:bg-hover hover:border-accent/40 border border-line",
  outline: "border border-line-strong text-fg hover:bg-hover",
  ghost: "text-fg-2 hover:bg-hover hover:text-fg",
  danger: "bg-danger-strong/90 text-white hover:bg-danger-strong font-medium",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-md",
  icon: "h-10 w-10 rounded-lg",
  "icon-sm": "h-8 w-8 rounded-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "secondary", size = "md", icon: Icon, loading, className, children, disabled, type = "button", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cx("inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-colors duration-150 disabled:opacity-45", variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon ? <Icon className="size-4" aria-hidden /> : null}
      {children}
    </button>
  );
});

export function Card({ className, children, as: As = "section", ...rest }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cx("hud rounded-[var(--radius-card)]", className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({ title, icon: Icon, actions, subtitle }: { title: ReactNode; icon?: LucideIcon; actions?: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="flex items-center gap-2 border-b border-line px-4 py-3">
      {Icon ? <Icon className="size-4 text-accent drop-shadow-[0_0_6px_rgb(63_224_255/0.8)]" aria-hidden /> : <span className="size-1.5 rotate-45 bg-accent shadow-[0_0_8px_rgb(63_224_255)]" aria-hidden />}
      <div className="min-w-0 flex-1">
        <h2 className="hud-title truncate text-[13px] text-accent-strong">{title}</h2>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

const tones = {
  neutral: "bg-raised text-fg-2 border-line",
  accent: "bg-accent-soft text-accent border-accent/30",
  ok: "bg-ok/10 text-ok border-ok/30",
  warn: "bg-warn/10 text-warn border-warn/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  info: "bg-info/10 text-info border-info/30",
  gold: "bg-gold/10 text-gold border-gold/30",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4", tones[tone], className)}>
      {children}
    </span>
  );
}

/** Marks a feature that exists in the UI but is not built yet. */
export function Planned({ label = "Planned" }: { label?: string }) {
  return <Badge tone="neutral" title="Not built yet. Shown so you know it's on the roadmap.">{label}</Badge>;
}

export function NeedsSetup({ what }: { what: string }) {
  return <Badge tone="warn" title={what}>Needs setup</Badge>;
}

const fieldBase = "w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(fieldBase, "h-10", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(fieldBase, "py-2 leading-relaxed", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(fieldBase, "h-10 pr-8", className)} {...rest}>
      {children}
    </select>
  );
});

export function Field({ label, hint, error, children, htmlFor, className }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-fg-2">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-danger" role="alert">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cx("inline-flex items-center gap-2 text-sm text-muted", className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, children, action }: { icon?: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      {Icon && (
        <div className="grid size-12 place-items-center rounded-full border border-accent/30 bg-accent-soft shadow-[0_0_18px_-4px_rgb(63_224_255/0.6)]">
          <Icon className="size-5 text-accent" aria-hidden />
        </div>
      )}
      <div>
        <p className="font-medium">{title}</p>
        {children && <div className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, icon: Icon, actions }: { title: string; description?: ReactNode; icon?: LucideIcon; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start gap-3">
      {Icon && (
        <div className="grid size-11 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent-soft shadow-[0_0_20px_-4px_rgb(63_224_255/0.7)]">
          <Icon className="size-5 text-accent" aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="hud-title glow-text text-2xl text-fg">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: string; icon?: LucideIcon; badge?: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cx("flex gap-1 overflow-x-auto border-b border-line", className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            "hud-title -mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-[13px] transition-colors",
            value === t.id ? "border-accent text-accent-strong [text-shadow:0_0_10px_rgb(63_224_255/0.7)]" : "border-transparent text-muted hover:text-fg",
          )}
        >
          {t.icon && <t.icon className="size-4" aria-hidden />}
          {t.label}
          {t.badge}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, label, tone = "accent" }: { value: number; label?: string; tone?: "accent" | "ok" | "warn" | "danger" }) {
  const v = Math.max(0, Math.min(100, value));
  const color = { accent: "bg-accent shadow-[0_0_10px_rgb(63_224_255)]", ok: "bg-ok shadow-[0_0_10px_rgb(63_240_176)]", warn: "bg-warn", danger: "bg-danger" }[tone];
  return (
    <div role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
      <div className={cx("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function StatusDot({ tone, pulse }: { tone: "ok" | "warn" | "danger" | "muted" | "accent"; pulse?: boolean }) {
  const c = { ok: "bg-ok", warn: "bg-warn", danger: "bg-danger", muted: "bg-muted", accent: "bg-accent" }[tone];
  return (
    <span className="relative inline-flex size-2 shrink-0" aria-hidden>
      {pulse && <span className={cx("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", c)} />}
      <span className={cx("relative inline-flex size-2 rounded-full", c)} />
    </span>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "ok" | "warn" | "danger" }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-[rgb(3_14_26/0.55)] px-3 py-2.5 shadow-[inset_0_0_18px_-8px_rgb(63_224_255/0.35)]">
      <p className="hud-title truncate text-[11px] text-muted">{label}</p>
      <p className={cx("glow-text mt-0.5 font-mono text-lg font-semibold tabular-nums", tone === "ok" && "text-ok", tone === "warn" && "text-warn", tone === "danger" && "text-danger")}>{value}</p>
      {hint && <p className="truncate text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
      {error instanceof Error ? error.message : String(error)}
    </p>
  );
}
