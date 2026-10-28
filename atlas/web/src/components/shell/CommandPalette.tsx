import { useQueryClient } from "@tanstack/react-query";
import { Command } from "cmdk";
import { Bot, DatabaseBackup, FileText, FolderPlus, Keyboard, ListPlus, MessageSquarePlus, PanelRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../../lib/api";
import { MODULES } from "../../lib/modules";
import { useUI } from "../../lib/ui-state";
import { useToast } from "../ui/overlay";
import { Badge } from "../ui/primitives";

interface Hit {
  type: string;
  id: number;
  title: string;
  snippet: string;
  href: string;
}

const item = "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-fg-2 aria-selected:bg-hover aria-selected:text-fg";

export function CommandPalette() {
  const ui = useUI();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

  useEffect(() => {
    if (!ui.paletteOpen) setQ("");
  }, [ui.paletteOpen]);

  useEffect(() => {
    if (q.trim().length < 2) return setHits([]);
    const t = setTimeout(() => {
      get<{ hits: Hit[] }>(`/api/search?q=${encodeURIComponent(q)}`).then((r) => setHits(r.hits)).catch(() => setHits([]));
    }, 160);
    return () => clearTimeout(t);
  }, [q]);

  if (!ui.paletteOpen) return null;
  const go = (path: string) => {
    ui.setPaletteOpen(false);
    nav(path);
  };
  const actions = [
    { label: "New project", icon: FolderPlus, run: () => go("/projects?new=1") },
    { label: "New task", icon: ListPlus, run: () => go("/projects?newTask=1") },
    { label: "New note", icon: FileText, run: () => go("/vault?new=1") },
    { label: "New AI chat", icon: MessageSquarePlus, run: () => go("/assistant") },
    { label: ui.aiOpen ? "Hide AI panel" : "Show AI panel", icon: PanelRight, run: () => (ui.setPaletteOpen(false), ui.setAiOpen((v) => !v)) },
    {
      label: "Back up database now",
      icon: DatabaseBackup,
      run: async () => {
        ui.setPaletteOpen(false);
        try {
          await post("/api/backups");
          qc.invalidateQueries();
          toast("Backup saved");
        } catch (e) {
          toast(e instanceof Error ? e.message : "Backup failed", "error");
        }
      },
    },
    { label: "Keyboard shortcuts", icon: Keyboard, run: () => (ui.setPaletteOpen(false), ui.setHelpOpen(true)) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-3 pt-[12vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && ui.setPaletteOpen(false)}>
      <Command label="Command palette" className="hud w-full max-w-xl overflow-hidden rounded-lg bg-[#041322] shadow-2xl" shouldFilter={true} loop onKeyDown={(e) => e.key === "Escape" && ui.setPaletteOpen(false)}>
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="size-4 text-muted" aria-hidden />
          <Command.Input autoFocus value={q} onValueChange={setQ} placeholder="Search projects, tasks, notes, chats… or type a command" className="h-12 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-muted" />
          <kbd className="kbd">Esc</kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted">{q.length >= 2 ? "Nothing found." : "Type to search."}</Command.Empty>
          {hits.length > 0 && (
            <Command.Group heading="Results" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted">
              {hits.map((h) => (
                <Command.Item key={`${h.type}-${h.id}`} value={`${h.type} ${h.title} ${h.snippet} ${h.id}`} onSelect={() => go(h.href)} className={item}>
                  <Badge tone="accent" className="w-20 justify-center">{h.type}</Badge>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-fg">{h.title}</span>
                    {h.snippet && <span className="block truncate text-xs text-muted">{h.snippet}</span>}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted">
            {actions.map((a) => (
              <Command.Item key={a.label} value={a.label} onSelect={a.run} className={item}>
                <a.icon className="size-4 text-accent" aria-hidden />
                {a.label}
              </Command.Item>
            ))}
            {q.trim().length > 2 && (
              <Command.Item value={`ask ai ${q}`} onSelect={() => go(`/assistant?q=${encodeURIComponent(q)}`)} className={item}>
                <Bot className="size-4 text-accent" aria-hidden />
                Ask AI: “{q}”
              </Command.Item>
            )}
          </Command.Group>
          <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted">
            {MODULES.map((m) => (
              <Command.Item key={m.id} value={`go ${m.label} ${m.description}`} onSelect={() => go(m.path)} className={item}>
                <m.icon className="size-4 text-muted" aria-hidden />
                <span className="flex-1">{m.label}</span>
                <span className="font-mono text-[11px] text-muted">g {m.key}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
