import { useQuery } from "@tanstack/react-query";
import { FolderKanban, FolderPlus, ListPlus, Pin } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProjectModal, TaskModal } from "../components/forms";
import { TaskRow } from "../components/TaskRow";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, ProgressBar, Select, Spinner, Tabs } from "../components/ui/primitives";
import { get } from "../lib/api";
import { ago } from "../lib/format";
import { PROJECT_COLORS } from "../lib/modules";

const STATUS_TONE = { active: "accent", paused: "warn", done: "ok", archived: "neutral" } as const;

export default function Projects() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"projects" | "tasks">(params.get("newTask") || params.get("task") ? "tasks" : "projects");
  const [status, setStatus] = useState("");
  const [taskFilter, setTaskFilter] = useState("open");
  const [newOpen, setNewOpen] = useState(false);
  const [taskEdit, setTaskEdit] = useState<any | null | undefined>(undefined);
  const projects = useQuery({ queryKey: ["projects", status], queryFn: () => get<any[]>(`/api/projects${status ? `?status=${status}` : ""}`) });
  const tasks = useQuery({ queryKey: ["tasks", taskFilter], queryFn: () => get<any[]>(`/api/tasks?status=${taskFilter}`), enabled: tab === "tasks" });

  useEffect(() => {
    if (params.get("new")) setNewOpen(true);
    if (params.get("newTask")) setTaskEdit(null);
    if (params.get("new") || params.get("newTask")) setParams({}, { replace: true });
  }, [params, setParams]);

  return (
    <>
      <PageHeader
        title="Project Manager"
        icon={FolderKanban}
        description="Every project keeps its tasks, notes, AI chats and linked code together."
        actions={<><Button icon={ListPlus} onClick={() => setTaskEdit(null)}>New task</Button><Button variant="primary" icon={FolderPlus} onClick={() => setNewOpen(true)}>New project</Button></>}
      />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: "projects", label: "Projects" }, { id: "tasks", label: "All tasks" }]} />

      {tab === "projects" ? (
        <>
          <div className="mb-4 flex items-center gap-2">
            <label htmlFor="pstatus" className="text-sm text-muted">Show</label>
            <Select id="pstatus" value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
              <option value="">Current (not archived)</option><option value="active">Active</option><option value="paused">Paused</option><option value="done">Done</option><option value="archived">Archived</option>
            </Select>
          </div>
          {projects.isLoading ? <Spinner /> : !projects.data?.length ? (
            <Card><EmptyState icon={FolderKanban} title="No projects here" action={<Button variant="primary" icon={FolderPlus} onClick={() => setNewOpen(true)}>New project</Button>}>Create one for each thing you're working on: a store, a website, a school assignment, a game.</EmptyState></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.data.map((p) => {
                const pct = p.task_total ? Math.round((p.task_done / p.task_total) * 100) : 0;
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} className="group rounded-[var(--radius-card)] border border-line bg-card p-4 transition-colors hover:border-line-strong hover:bg-raised/40">
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: PROJECT_COLORS[p.color], boxShadow: `0 0 12px ${PROJECT_COLORS[p.color]}66` }} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate font-semibold">{p.name}</h2>
                          {p.pinned && <Pin className="size-3.5 text-gold" aria-label="Pinned" />}
                        </div>
                        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">{p.description || "No description"}</p>
                      </div>
                      <Badge tone={STATUS_TONE[p.status as keyof typeof STATUS_TONE]}>{p.status}</Badge>
                    </div>
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs text-muted"><span>{p.task_done} of {p.task_total} tasks done{p.task_doing ? ` · ${p.task_doing} in progress` : ""}</span><span className="font-mono">{pct}%</span></div>
                      <ProgressBar value={pct} label={`${p.name} progress`} tone={pct === 100 && p.task_total ? "ok" : "accent"} />
                    </div>
                    <p className="mt-3 text-xs text-muted">{p.workspace_name ? `Code: ${p.workspace_name}${p.workspace_subpath ? "/" + p.workspace_subpath : ""} · ` : ""}Updated {ago(p.last_activity ?? p.updated_at)}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardHeader title="Tasks across all projects" actions={<Select aria-label="Filter tasks" value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)} className="h-8 w-auto py-0 text-xs"><option value="open">Open</option><option value="doing">In progress</option><option value="todo">To do</option><option value="done">Done</option></Select>} />
          {tasks.isLoading ? <Spinner className="p-4" /> : tasks.data?.length ? <ul className="p-2">{tasks.data.map((t) => <TaskRow key={t.id} t={t} onEdit={setTaskEdit} />)}</ul> : <EmptyState title="No tasks match" />}
        </Card>
      )}
      <ProjectModal open={newOpen} onClose={() => setNewOpen(false)} />
      <TaskModal open={taskEdit !== undefined} task={taskEdit ?? undefined} onClose={() => setTaskEdit(undefined)} />
    </>
  );
}
