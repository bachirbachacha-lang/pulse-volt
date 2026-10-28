import { useQuery } from "@tanstack/react-query";
import { Bot, ChevronsLeft, ChevronsRight, Keyboard, Menu, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { get } from "../../lib/api";
import { DEMO } from "../../lib/demo";
import { DemoBanner } from "../DemoBanner";
import { MODULES } from "../../lib/modules";
import { isTyping, useUI } from "../../lib/ui-state";
import { Button, cx, StatusDot } from "../ui/primitives";
import { HoloBackground } from "../holo/HoloBackground";
import { AIPanel } from "./AIPanel";
import { CommandPalette } from "./CommandPalette";
import { ShortcutsHelp } from "./ShortcutsHelp";

const isMac = typeof navigator !== "undefined" && /Mac|iPad|iPhone/.test(navigator.platform);
export const MOD = isMac ? "⌘" : "Ctrl";

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-14 items-center gap-2.5 px-4">
      <svg viewBox="0 0 40 40" className="size-9 shrink-0 drop-shadow-[0_0_8px_rgb(63_224_255/0.8)]" aria-hidden>
        <circle className="spin-slow" cx="20" cy="20" r="17" fill="none" stroke="var(--color-accent)" strokeWidth="1.2" strokeDasharray="3 4" />
        <circle className="spin-rev" cx="20" cy="20" r="12.5" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="18 6 4 6" opacity=".85" />
        <circle cx="20" cy="20" r="7" fill="none" stroke="var(--color-gold)" strokeWidth="1.2" opacity=".9" />
        <circle className="pulse-soft" cx="20" cy="20" r="3.6" fill="#bff6ff" />
      </svg>
      {!collapsed && (
        <div className="leading-tight">
          <p className="hud-title glow-text text-lg leading-none tracking-[0.35em] text-fg">ATLAS</p>
          <p className="hud-title text-[10px] tracking-[0.3em] text-accent/70">Command center</p>
        </div>
      )}
    </div>
  );
}

function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Modules" className="flex-1 overflow-y-auto px-2 py-2">
      <ul className="space-y-0.5">
        {MODULES.map((m, i) => (
          <li key={m.id}>
            {i === 9 && <div className="mx-2 my-2 border-t border-line" aria-hidden />}
            <NavLink
              to={m.path}
              end={m.path === "/"}
              onClick={onNavigate}
              title={collapsed ? `${m.label}  (g ${m.key})` : undefined}
              className={({ isActive }) =>
                cx(
                  "group flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-all",
                  isActive ? "bg-gradient-to-r from-accent/25 to-transparent text-white shadow-[inset_2px_0_0_var(--color-accent),0_0_20px_-8px_rgb(63_224_255/0.8)]" : "text-fg-2 hover:bg-hover hover:text-fg",
                  collapsed && "justify-center px-0",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <m.icon className={cx("size-[18px] shrink-0", isActive ? "text-accent drop-shadow-[0_0_6px_rgb(63_224_255)]" : "text-muted group-hover:text-accent/80")} aria-hidden />
                  {!collapsed && <span className="flex-1 truncate">{m.label}</span>}
                  {!collapsed && <span className="hidden font-mono text-[10px] text-muted/70 group-hover:inline">g {m.key}</span>}
                  {collapsed && <span className="sr-only">{m.label}</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ProviderStatus({ collapsed }: { collapsed: boolean }) {
  const { data } = useQuery({ queryKey: ["providers"], queryFn: () => get("/api/ai/providers"), refetchInterval: 60_000 });
  const ready = (data?.providers ?? []).filter((p: any) => p.configured);
  return (
    <NavLink to="/integrations" className={cx("mx-2 mb-2 flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-fg-2 hover:bg-hover", collapsed && "justify-center px-0")} title="AI providers">
      <StatusDot tone={ready.length ? "ok" : "warn"} />
      {!collapsed && <span className="truncate">{data ? (ready.length ? `AI: ${ready.map((p: any) => p.label.split(" ")[0]).join(", ")}` : "No AI provider set up") : "Checking AI…"}</span>}
    </NavLink>
  );
}

export function AppShell() {
  const ui = useUI();
  const nav = useNavigate();
  const loc = useLocation();
  const gPending = useRef<number | null>(null);

  useEffect(() => ui.setMobileNavOpen(false), [loc.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.setPaletteOpen(!ui.paletteOpen);
        return;
      }
      if (mod && e.key.toLowerCase() === "j") {
        e.preventDefault();
        ui.setAiOpen((v) => !v);
        return;
      }
      if (mod || e.altKey || isTyping(e)) return;
      if (gPending.current) {
        const m = MODULES.find((x) => x.key === e.key);
        window.clearTimeout(gPending.current);
        gPending.current = null;
        if (m) {
          e.preventDefault();
          nav(m.path);
        }
        return;
      }
      if (e.key === "g") {
        gPending.current = window.setTimeout(() => (gPending.current = null), 1200);
      } else if (e.key === "?") {
        ui.setHelpOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        ui.setPaletteOpen(true);
      } else if (e.key === "[") {
        ui.setSidebarCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ui, nav]);

  const current = MODULES.find((m) => (m.path === "/" ? loc.pathname === "/" : loc.pathname.startsWith(m.path)));

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <HoloBackground />
      {DEMO && <div className="relative z-10"><DemoBanner /></div>}
      <div className="relative z-10 flex min-h-0 flex-1">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-ink">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className={cx("hidden shrink-0 flex-col border-r border-accent/20 bg-[rgb(2_10_20/0.72)] shadow-[20px_0_60px_-30px_rgb(63_224_255/0.35)] backdrop-blur-md transition-[width] duration-200 lg:flex", ui.sidebarCollapsed ? "w-[68px]" : "w-64")}>
        <Logo collapsed={ui.sidebarCollapsed} />
        <Sidebar collapsed={ui.sidebarCollapsed} />
        <ProviderStatus collapsed={ui.sidebarCollapsed} />
        <button onClick={() => ui.setSidebarCollapsed((v) => !v)} className="flex h-10 items-center justify-center gap-2 border-t border-line text-xs text-muted hover:text-fg" aria-label={ui.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {ui.sidebarCollapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> Collapse <span className="kbd">[</span></>}
        </button>
      </aside>

      {/* Mobile / tablet drawer */}
      {ui.mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => ui.setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-accent/30 bg-[#030f1c]/95 pt-[env(safe-area-inset-top)] shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between pr-2">
              <Logo collapsed={false} />
              <Button variant="ghost" size="icon" icon={X} aria-label="Close menu" onClick={() => ui.setMobileNavOpen(false)} />
            </div>
            <Sidebar collapsed={false} onNavigate={() => ui.setMobileNavOpen(false)} />
            <ProviderStatus collapsed={false} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-accent/15 bg-[rgb(2_10_20/0.6)] px-3 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-4">
          <Button variant="ghost" size="icon" icon={Menu} className="lg:hidden" aria-label="Open menu" onClick={() => ui.setMobileNavOpen(true)} />
          <p className="hud-title hidden min-w-0 truncate text-[13px] text-accent/80 md:block">{current?.label}</p>
          <button onClick={() => ui.setPaletteOpen(true)} className="mx-auto flex h-10 w-full max-w-md items-center gap-2 rounded-md border border-accent/25 bg-[rgb(0_8_16/0.6)] px-3 text-sm text-muted shadow-[inset_0_0_14px_-6px_rgb(63_224_255/0.5)] transition-colors hover:border-accent/50 hover:text-fg-2" aria-label="Search and commands">
            <Search className="size-4" aria-hidden />
            <span className="flex-1 truncate text-left">Search or run a command…</span>
            <span className="kbd hidden sm:inline-flex">{MOD} K</span>
          </button>
          <Button variant="ghost" size="icon" icon={Keyboard} className="hidden sm:inline-flex" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" onClick={() => ui.setHelpOpen(true)} />
          <Button variant={ui.aiOpen ? "primary" : "secondary"} size="md" icon={Bot} onClick={() => ui.setAiOpen((v) => !v)} aria-pressed={ui.aiOpen} title={`AI panel (${MOD} J)`}>
            <span className="hidden sm:inline">AI</span>
          </Button>
        </header>

        <div className="flex min-h-0 flex-1">
          <main id="main" className="min-w-0 flex-1 overflow-y-auto">
            <div className={"mx-auto w-full max-w-[1500px] px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:px-6"}>
              <Outlet />
            </div>
          </main>
          <AIPanel />
        </div>
      </div>

      </div>
      <CommandPalette />
      <ShortcutsHelp />
    </div>
  );
}
