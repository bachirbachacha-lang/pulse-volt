import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowDown, ArrowUp, Bot, CheckCircle2, Cpu, DatabaseBackup, Eye, EyeOff, FileText, FolderKanban, FolderPlus, Gauge, LayoutGrid, ListChecks, ListPlus, Loader2, Sparkles, XCircle, Zap } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProjectModal, TaskModal } from "../components/forms";
import { TaskRow } from "../components/TaskRow";
import { Gauge as Ring, Sparkline } from "../components/ui/charts";
import { useAction } from "../components/ui/overlay";
import { Badge, Button, Card, CardHeader, cx, EmptyState, PageHeader, ProgressBar, Spinner, Stat, StatusDot } from "../components/ui/primitives";
import { get, patch, post } from "../lib/api";
import { ago, bytes } from "../lib/format";
import { PROJECT_COLORS } from "../lib/modules";
import { useUI } from "../lib/ui-state";

const WIDGETS: Record<string, { title: string; icon: typeof Gauge; span: string }> = {
  "quick-actions": { title: "Quick actions", icon: Zap, span: "lg:col-span-3" },
  progress: { title: "Progress", icon: Gauge, span: "lg:col-span-3" },
  projects: { title: "Active projects", icon: FolderKanban, span: "lg:col-span-2" },
  tasks: { title: "Tasks", icon: ListChecks, span: "lg:col-span-1" },
  activity: { title: "Recent activity", icon: Activity, span: "lg:col-span-1" },
  "ai-jobs": { title: "AI jobs", icon: Sparkles, span: "lg:col-span-1" },
  system: { title: "System status", icon: Cpu, span: "lg:col-span-1" },
};
const ALL = Object.keys(WIDGETS);

function QuickActions({ onProject, onTask }: { onProject: () => void; onTask: () => void }) {
  const nav = useNavigate();
  const ui = useUI();
  const act = useAction();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const items: { label: string; icon: typeof Zap; run: () => void; busy?: boolean }[] = [
    { label: "New project", icon: FolderPlus, run: onProject },
    { label: "New task", icon: ListPlus, run: onTask },
    { label: "New note", icon: FileText, run: () => nav("/vault?new=1") },
    { label: "Ask AI", icon: Bot, run: () => ui.setAiOpen(true) },
    { label: "Back up now", icon: DatabaseBackup, busy, run: async () => { setBusy(true); await act(() => post("/api/backups"), "Backup saved"); setBusy(false); qc.invalidateQueries({ queryKey: ["security"] }); } },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((a) => (
        <Button key={a.label} variant="secondary" icon={a.icon} loading={a.busy} onClick={a.run} className="h-12 justify-start">
          {a.label}
        </Button>
      ))}
    </div>
  );
}

function ProgressWidget({ d }: { d: any }) {
  const c = d?.counts;
  if (!c) return <Spinner className="p-4" />;
  return (
    <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-6">
      <Stat label="Active projects" value={c.active_projects} />
      <Stat label="Open tasks" value={c.open_tasks} />
      <Stat label="Due today" value={c.due_today} tone={c.due_today ? "warn" : undefined} />
      <Stat label="Overdue" value={c.overdue} tone={c.overdue ? "danger" : undefined} />
      <Stat label="Done (7 days)" value={c.done_this_week} tone={c.done_this_week ? "ok" : undefined} />
      <Stat label="Notes" value={c.notes} />
    </div>
  );
}

function ProjectsWidget({ onNew }: { onNew: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["projects"], queryFn: () => get<any[]>("/api/projects") });
  const active = (data ?? []).filter((p) => p.status === "active");
  if (isLoading) return <Spinner className="p-4" />;
  if (!active.length) return <EmptyState icon={FolderKanban} title="No active projects" action={<Button variant="primary" icon={FolderPlus} onClick={onNew}>Create your first project</Button>}>Projects hold your tasks, notes, chats and linked code.</EmptyState>;
  return (
    <ul className="divide-y divide-line">
      {active.slice(0, 8).map((p) => {
        const pctDone = p.task_total ? (p.task_done / p.task_total) * 100 : 0;
        return (
          <li key={p.id}>
            <Link to={`/projects/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-hover/60">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: PROJECT_COLORS[p.color] }} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <span className="shrink-0 font-mono text-xs text-muted">{p.task_done}/{p.task_total}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <ProgressBar value={pctDone} label={`${p.name} progress`} tone={pctDone === 100 ? "ok" : "accent"} />
                  <span className="w-16 shrink-0 text-right text-[11px] text-muted">{ago(p.last_activity ?? p.updated_at)}</span>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function TasksWidget({ onEdit }: { onEdit: (t: any) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["tasks", "open"], queryFn: () => get<any[]>("/api/tasks?status=open&limit=12") });
  if (isLoading) return <Spinner className="p-4" />;
  if (!data?.length) return <EmptyState icon={CheckCircle2} title="Nothing open">You're all caught up.</EmptyState>;
  return <ul className="p-2">{data.map((t) => <TaskRow key={t.id} t={t} onEdit={onEdit} />)}</ul>;
}

function ActivityWidget() {
  const { data, isLoading } = useQuery({ queryKey: ["activity"], queryFn: () => get<any[]>("/api/activity?limit=15"), refetchInterval: 20_000 });
  if (isLoading) return <Spinner className="p-4" />;
  if (!data?.length) return <EmptyState icon={Activity} title="No activity yet">Everything you do in Atlas shows up here.</EmptyState>;
  return (
    <ol className="space-y-0.5 p-2">
      {data.map((a) => (
        <li key={a.id} className="flex gap-3 rounded-lg px-2 py-1.5 text-sm">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent/70" aria-hidden />
          <div className="min-w-0">
            <p className="text-fg-2">{a.message}</p>
            <p className="text-xs text-muted">{ago(a.ts)} · {a.module}{a.project_name ? ` · ${a.project_name}` : ""}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function AIJobsWidget({ d }: { d: any }) {
  if (!d) return <Spinner className="p-4" />;
  return (
    <div className="space-y-3 p-3">
      <ul className="space-y-1.5">
        {d.providers.map((p: any) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <StatusDot tone={p.configured ? "ok" : "muted"} />
            <span className="flex-1">{p.label}</span>
            <span className="text-xs text-muted">{p.configured ? "Ready" : "Not set up"}</span>
          </li>
        ))}
      </ul>
      <div className="border-t border-line pt-3">
        {d.aiJobs.length ? (
          <ul className="space-y-1.5">
            {d.aiJobs.map((j: any) => (
              <li key={j.id} className="flex items-center gap-2 text-sm">
                {j.status === "running" || j.status === "queued" ? <Loader2 className="size-3.5 animate-spin text-accent" aria-label={j.status} /> : j.status === "succeeded" ? <CheckCircle2 className="size-3.5 text-ok" aria-label="succeeded" /> : <XCircle className="size-3.5 text-danger" aria-label={j.status} />}
                <span className="min-w-0 flex-1 truncate" title={j.error ?? j.title}>{j.title}</span>
                <span className="shrink-0 text-xs text-muted">{ago(j.finished_at ?? j.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No AI background jobs yet. Image generation and AI digests show up here.</p>
        )}
        {d.runningScripts.length > 0 && <p className="mt-2 text-xs text-accent">{d.runningScripts.length} script(s) running in Code Lab</p>}
      </div>
    </div>
  );
}

function SystemWidget() {
  const { data } = useQuery({ queryKey: ["metrics"], queryFn: () => get("/api/system/metrics"), refetchInterval: 4000 });
  if (!data) return <Spinner className="p-4" />;
  const memPct = (data.memory.used / data.memory.total) * 100;
  const disk = data.disks[0];
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-around">
        <div className="text-center"><Ring value={data.cpu.usage} label="CPU" /><p className="text-xs text-muted">CPU</p></div>
        <div className="text-center"><Ring value={memPct} label="Memory" /><p className="text-xs text-muted">Memory</p></div>
        {disk && <div className="text-center"><Ring value={(disk.used / disk.total) * 100} label="Disk" /><p className="text-xs text-muted">Disk</p></div>}
      </div>
      <Sparkline values={data.history.map((h: any) => h.cpu)} max={100} label="CPU usage history" />
      <p className="text-xs text-muted">{data.cpu.cores} cores · {bytes(data.memory.used)} / {bytes(data.memory.total)} RAM · up {Math.round(data.host.uptimeSec / 3600)} h</p>
      <Link to="/system" className="text-xs text-accent underline">Open System Monitor</Link>
    </div>
  );
}

export default function MissionControl() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => get("/api/settings") });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => get("/api/dashboard"), refetchInterval: 15_000 });
  const [customize, setCustomize] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [taskEdit, setTaskEdit] = useState<any | null | undefined>(undefined);
  const act = useAction();
  const visible: string[] = (settings.data?.widgets ?? ALL).filter((w: string) => WIDGETS[w]);
  const order = customize ? [...visible, ...ALL.filter((w) => !visible.includes(w))] : visible;

  const saveWidgets = (w: string[]) => act(async () => (await patch("/api/settings", { widgets: w }), qc.invalidateQueries({ queryKey: ["settings"] })));
  const move = (id: string, dir: -1 | 1) => {
    const arr = [...visible];
    const i = arr.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    void saveWidgets(arr);
  };
  const toggle = (id: string) => void saveWidgets(visible.includes(id) ? visible.filter((x) => x !== id) : [...visible, id]);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = settings.data?.userName;

  const body = (id: string): ReactNode => {
    switch (id) {
      case "quick-actions": return <QuickActions onProject={() => setProjectOpen(true)} onTask={() => setTaskEdit(null)} />;
      case "progress": return <ProgressWidget d={dash.data} />;
      case "projects": return <ProjectsWidget onNew={() => setProjectOpen(true)} />;
      case "tasks": return <TasksWidget onEdit={setTaskEdit} />;
      case "activity": return <ActivityWidget />;
      case "ai-jobs": return <AIJobsWidget d={dash.data} />;
      case "system": return <SystemWidget />;
    }
  };

  return (
    <>
      <PageHeader
        title={`${greet}${name ? `, ${name}` : ""}`}
        description={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        actions={<Button variant={customize ? "primary" : "secondary"} icon={LayoutGrid} onClick={() => setCustomize((v) => !v)}>{customize ? "Done" : "Customize"}</Button>}
      />
      {customize && <p className="mb-4 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-fg-2">Show, hide and reorder widgets. Changes save automatically.</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        {order.map((id) => {
          const w = WIDGETS[id];
          const on = visible.includes(id);
          return (
            <Card key={id} className={cx(w.span, customize && !on && "opacity-50")}>
              <CardHeader
                title={w.title}
                icon={w.icon}
                actions={
                  customize ? (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" icon={ArrowUp} aria-label={`Move ${w.title} up`} disabled={!on} onClick={() => move(id, -1)} />
                      <Button variant="ghost" size="icon-sm" icon={ArrowDown} aria-label={`Move ${w.title} down`} disabled={!on} onClick={() => move(id, 1)} />
                      <Button variant="ghost" size="icon-sm" icon={on ? EyeOff : Eye} aria-label={on ? `Hide ${w.title}` : `Show ${w.title}`} onClick={() => toggle(id)} />
                    </div>
                  ) : id === "tasks" ? (
                    <Button variant="ghost" size="sm" icon={ListPlus} onClick={() => setTaskEdit(null)}>Add</Button>
                  ) : id === "projects" ? (
                    <Link to="/projects" className="text-xs text-accent">All projects</Link>
                  ) : id === "ai-jobs" && !dash.data?.providers.some((p: any) => p.configured) ? (
                    <Badge tone="warn">Setup needed</Badge>
                  ) : null
                }
              />
              {(!customize || on) && body(id)}
            </Card>
          );
        })}
      </div>
      <ProjectModal open={projectOpen} onClose={() => setProjectOpen(false)} />
      <TaskModal open={taskEdit !== undefined} task={taskEdit ?? undefined} onClose={() => setTaskEdit(undefined)} />
    </>
  );
}
