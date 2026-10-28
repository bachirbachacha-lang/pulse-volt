import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, cx } from "./primitives";

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>("[data-autofocus], input, textarea, select, button:not([data-close])");
      el?.focus();
    }, 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((x) => !x.hasAttribute("disabled"));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) (e.preventDefault(), f[f.length - 1].focus());
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) (e.preventDefault(), f[0].focus());
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cx("hud flex max-h-[92dvh] w-full flex-col rounded-t-lg bg-[#041322] shadow-2xl sm:rounded-lg", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
          <h2 className="hud-title flex-1 text-accent-strong">{title}</h2>
          <Button data-close variant="ghost" size="icon-sm" icon={X} aria-label="Close" onClick={onClose} />
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------- Confirm ----------
interface ConfirmOpts {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  /** If set, the user must type this text to confirm (for very destructive actions). */
  typeToConfirm?: string;
}
type ConfirmFn = (o: ConfirmOpts) => Promise<boolean>;
const ConfirmCtx = createContext<ConfirmFn>(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const [typed, setTyped] = useState("");
  const confirm = useCallback<ConfirmFn>((o) => new Promise((resolve) => (setTyped(""), setState({ ...o, resolve }))), []);
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const blocked = Boolean(state?.typeToConfirm && typed !== state.typeToConfirm);
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(state)}
        onClose={() => close(false)}
        title={state?.title ?? ""}
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
            <Button data-autofocus variant={state?.danger ? "danger" : "primary"} disabled={blocked} onClick={() => close(true)}>
              {state?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          {state?.danger && <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />}
          <div className="space-y-3 text-sm text-fg-2">
            {state?.body}
            {state?.typeToConfirm && (
              <label className="block">
                <span className="text-xs text-muted">Type <code className="text-fg">{state.typeToConfirm}</code> to confirm</span>
                <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-surface px-3 text-fg focus:border-accent/60 focus:outline-none" />
              </label>
            )}
          </div>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

// ---------- Toasts ----------
type ToastTone = "ok" | "error" | "info";
interface Toast {
  id: number;
  tone: ToastTone;
  text: string;
}
const ToastCtx = createContext<(text: string, tone?: ToastTone) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: ToastTone = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {toasts.map((t) => {
          const Icon = t.tone === "ok" ? CheckCircle2 : t.tone === "error" ? XCircle : Info;
          return (
            <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className="hud pointer-events-auto flex max-w-sm items-start gap-2 rounded-md bg-[#041322] px-4 py-3 text-sm shadow-xl">
              <Icon className={cx("mt-0.5 size-4 shrink-0", t.tone === "ok" && "text-ok", t.tone === "error" && "text-danger", t.tone === "info" && "text-info")} aria-hidden />
              <span>{t.text}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

/** Wraps an async action with error toasts. */
export function useAction() {
  const toast = useToast();
  return useCallback(
    async <T,>(fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
      try {
        const r = await fn();
        if (success) toast(success, "ok");
        return r;
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), "error");
        return undefined;
      }
    },
    [toast],
  );
}
