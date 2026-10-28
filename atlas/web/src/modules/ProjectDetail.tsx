import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, Code2, FileText, ListPlus, MessageSquare, Palette, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ProjectModal, TaskModal } from "../components/forms";
import { TaskRow } from "../components/TaskRow";
import { useAction, useConfirm } from "../components/ui/overlay";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorNote, ProgressBar, Spinner } from "../components/ui/primitives";
import { del, get, patch } from "../lib/api";
import { ago } from "../lib/format";
import { PROJECT_COLORS } from "../lib/modules";
import { useUI } from "../lib/ui-state";

const COLUMNS = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "done", label: "Done" },
] as const;

export default function ProjectDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const ui = useUI();
  const act = useAction();
  const confirm = useConfirm();
  const { data, isLoading, error } = useQuery({ queryKey: ["project", Number(id)], queryFn: () => get(`/api/projects/${id}`) });
  const [editOpen, setEditOpen] = useState(false);
  const [taskEdit, setTaskEdit] = useState<any | null | undefined>(undefined);
  const p = data?.project;

  useEffect(() => {
    if (p) ui.setContextProject({ id: p.id, name: p.name });
    return () => ui.setContextProject(null);
  }, [p?.id, p?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const tid = Number(params.get("task"));
    if (tid && data?.tasks) {
      const t = data.tasks.find((x: any) => x.id === tid);
      if (t) setTaskEdit(t);
    }
  }, [params, data?.tasks]);

  if (isLoading) return <Spinner />;
  if (error || !p) return <ErrorNote error={error ?? "Project not found"} />;

  const pct = p.task_total ? Math.round((p.task_done / p.task_total) * 100) : 0;
  const remove = async () => {
    if (await confirm({ title: `Delete “${p.name}”?`, body: <>This deletes the project and its <b>{p.task_total} tasks</b>. Notes and chats are kept but unlinked. This cannot be undone.</>, confirmLabel: "Delete project", danger: true, typeToConfirm: p.name })) {
      const ok = await act(() => del(`/api/projects/${p.id}`), "Project deleted");
      if (ok) (qc.invalidateQueries(), nav("/projects"));
    }
  };
  const move = (t: any, status: string) => act(async () => (await patch(`/api/tasks/${t.id}`, { status }), qc.invalidateQueries()));

  return (
    <>
      <Link to="/projects" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Projects</Link>
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <span className="mt-2 size-3.5 rounded-full" style={{ background: PROJECT_COLORS[p.color], boxShadow: `0 0 14px ${PROJECT_COLORS[p.color]}` }} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-fg">{p.name}</h1>
            <Badge tone={p.status === "active" ? "accent" : p.status === "done" ? "ok" : p.status === "paused" ? "warn" : "neutral"}>{p.status}</Badge>
          </div>
          {p.description && <p className="mt-1 max-w-3xl whitespace-pre-wrap text-sm text-fg-2">{p.description}</p>}
          <div className="mt-3 flex max-w-md items-center gap-3"><ProgressBar value={pct} label="Project progress" /><span className="font-mono text-xs text-muted">{pct}%</span></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={Bot} onClick={() => ui.setAiOpen(true)}>Ask AI</Button>
          <Button icon={p.pinned ? PinOff : Pin} onClick={() => act(async () => (await patch(`/api/projects/${p.id}`, { pinned: !p.pinned }), qc.invalidateQueries()))}>{p.pinned ? "Unpin" : "Pin"}</Button>
          <Button icon={Pencil} onClick={() => setEditOpen(true)}>Edit</Button>
          <Button variant="ghost" icon={Trash2} aria-label="Delete project" onClick={remove} />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Tasks</h2>
        <Button size="sm" icon={ListPlus} onClick={() => setTaskEdit(null)}>Add task</Button>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {COLUMNS.map((c) => {
          const items = data.tasks.filter((t: any) => t.status === c.id);
          return (
            <Card key={c.id} className="min-h-40">
              <CardHeader title={`${c.label} (${items.length})`} />
              {items.length ? (
                <ul className="p-2">
                  {items.map((t: any) => (
                    <div key={t.id}>
                      <TaskRow t={t} onEdit={setTaskEdit} showProject={false} />
                      <div className="-mt-1 mb-1 flex gap-1 pl-10">
                        {COLUMNS.filter((x) => x.id !== c.id).map((x) => (
                          <button key={x.id} onClick={() => move(t, x.id)} className="rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-fg">→ {x.label}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-sm text-muted">Empty</p>
              )}
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Notes & docs" icon={FileText} actions={<Link to={`/vault?new=1&project=${p.id}`} className="text-xs text-accent">New note</Link>} />
          {data.notes.length ? (
            <ul className="divide-y divide-line">{data.notes.map((n: any) => <li key={n.id}><Link to={n.kind === "note" ? `/vault?note=${n.id}` : `/engineering?doc=${n.id}`} className="block px-4 py-2.5 text-sm hover:bg-hover/60">{n.title}<span className="block text-xs text-muted">{n.kind} · {ago(n.updated_at)}</span></Link></li>)}</ul>
          ) : <p className="p-4 text-sm text-muted">No notes linked yet.</p>}
        </Card>
        <Card>
          <CardHeader title="AI chats" icon={MessageSquare} />
          {data.conversations.length ? (
            <ul className="divide-y divide-line">{data.conversations.map((c: any) => <li key={c.id}><Link to={`/assistant/${c.id}`} className="block px-4 py-2.5 text-sm hover:bg-hover/60">{c.title}<span className="block text-xs text-muted">{c.provider} · {ago(c.updated_at)}</span></Link></li>)}</ul>
          ) : <p className="p-4 text-sm text-muted">Chats you start from this page (AI panel) are saved here.</p>}
        </Card>
        <Card>
          <CardHeader title="Linked" icon={Code2} />
          <div className="space-y-2 p-4 text-sm">
            {p.workspace_id ? (
              <Link to={`/code?ws=${p.workspace_id}&path=${encodeURIComponent(p.workspace_subpath ?? "")}`} className="flex items-center gap-2 text-accent"><Code2 className="size-4" />Open {p.workspace_name}{p.workspace_subpath ? `/${p.workspace_subpath}` : ""} in Code Lab</Link>
            ) : <p className="text-muted">No code folder linked. <button className="text-accent underline" onClick={() => setEditOpen(true)}>Link one</button></p>}
            {data.boards.map((b: any) => <Link key={b.id} to={`/design?board=${b.id}`} className="flex items-center gap-2 text-fg-2 hover:text-fg"><Palette className="size-4" />{b.name}</Link>)}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Project activity" />
        {data.activity.length ? (
          <ol className="max-h-80 space-y-1 overflow-y-auto p-3">{data.activity.map((a: any) => <li key={a.id} className="text-sm text-fg-2"><span className="mr-2 font-mono text-xs text-muted">{ago(a.ts)}</span>{a.message}</li>)}</ol>
        ) : <EmptyState title="No activity yet" />}
      </Card>

      <ProjectModal open={editOpen} onClose={() => setEditOpen(false)} project={p} />
      <TaskModal open={taskEdit !== undefined} task={taskEdit ?? undefined} defaultProjectId={p.id} onClose={() => setTaskEdit(undefined)} />
    </>
  );
}
