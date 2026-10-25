import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { get, patch, post } from "../lib/api";
import { PROJECT_COLORS } from "../lib/modules";
import { Modal, useToast } from "./ui/overlay";
import { Button, ErrorNote, Field, Input, Select, Textarea } from "./ui/primitives";

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: () => get<any[]>("/api/projects") });
}

export function ProjectModal({ open, onClose, project, onSaved }: { open: boolean; onClose: () => void; project?: any; onSaved?: (p: any) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const ws = useQuery({ queryKey: ["workspaces"], queryFn: () => get<any[]>("/api/workspaces"), enabled: open });
  const [f, setF] = useState({ name: "", description: "", status: "active", color: "cyan", workspace_id: "" as number | "", workspace_subpath: "" });
  const [err, setErr] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setErr(null);
      setF(project ? { name: project.name, description: project.description, status: project.status, color: project.color, workspace_id: project.workspace_id ?? "", workspace_subpath: project.workspace_subpath ?? "" } : { name: "", description: "", status: "active", color: "cyan", workspace_id: "", workspace_subpath: "" });
    }
  }, [open, project]);
  const save = async () => {
    setSaving(true);
    try {
      const body = { ...f, workspace_id: f.workspace_id || null };
      const p = project ? await patch(`/api/projects/${project.id}`, body) : await post("/api/projects", body);
      qc.invalidateQueries();
      toast(project ? "Project saved" : "Project created");
      onSaved?.(p);
      onClose();
    } catch (e) {
      setErr(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={project ? "Edit project" : "New project"} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} disabled={!f.name.trim()} onClick={save}>{project ? "Save" : "Create project"}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), void save())}>
        <Field label="Name" htmlFor="p-name"><Input id="p-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Scalp Elixir store" /></Field>
        <Field label="Description" htmlFor="p-desc" hint="The AI assistant reads this when you chat about the project."><Textarea id="p-desc" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="p-status">
            <Select id="p-status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option value="active">Active</option><option value="paused">Paused</option><option value="done">Done</option><option value="archived">Archived</option>
            </Select>
          </Field>
          <Field label="Colour">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
              {Object.entries(PROJECT_COLORS).map(([k, v]) => (
                <button key={k} type="button" role="radio" aria-checked={f.color === k} aria-label={k} onClick={() => setF({ ...f, color: k })} className="size-8 rounded-lg border-2 transition-transform aria-checked:scale-110" style={{ background: v, borderColor: f.color === k ? "white" : "transparent" }} />
              ))}
            </div>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Linked workspace (optional)" htmlFor="p-ws" hint="Connects the project to code in Code Lab.">
            <Select id="p-ws" value={f.workspace_id} onChange={(e) => setF({ ...f, workspace_id: Number(e.target.value) || "" })}>
              <option value="">None</option>
              {(ws.data ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </Field>
          <Field label="Folder inside it" htmlFor="p-sub"><Input id="p-sub" value={f.workspace_subpath} onChange={(e) => setF({ ...f, workspace_subpath: e.target.value })} placeholder="e.g. pixel-co/site" disabled={!f.workspace_id} /></Field>
        </div>
        <ErrorNote error={err} />
      </form>
    </Modal>
  );
}

export function TaskModal({ open, onClose, task, defaultProjectId }: { open: boolean; onClose: () => void; task?: any; defaultProjectId?: number | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const projects = useProjects();
  const [f, setF] = useState({ title: "", notes: "", status: "todo", priority: "medium", due_date: "", project_id: "" as number | "" });
  const [err, setErr] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setErr(null);
    setF(task ? { title: task.title, notes: task.notes, status: task.status, priority: task.priority, due_date: task.due_date ?? "", project_id: task.project_id ?? "" } : { title: "", notes: "", status: "todo", priority: "medium", due_date: "", project_id: defaultProjectId ?? "" });
  }, [open, task, defaultProjectId]);
  const save = async () => {
    setSaving(true);
    try {
      const body = { ...f, due_date: f.due_date || null, project_id: f.project_id || null };
      if (task) await patch(`/api/tasks/${task.id}`, body);
      else await post("/api/tasks", body);
      qc.invalidateQueries();
      toast(task ? "Task saved" : "Task added");
      onClose();
    } catch (e) {
      setErr(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "New task"} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} disabled={!f.title.trim()} onClick={save}>{task ? "Save" : "Add task"}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), void save())}>
        <Field label="Task" htmlFor="t-title"><Input id="t-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="What needs doing?" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project" htmlFor="t-proj">
            <Select id="t-proj" value={f.project_id} onChange={(e) => setF({ ...f, project_id: Number(e.target.value) || "" })}>
              <option value="">No project</option>
              {(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Due date" htmlFor="t-due"><Input id="t-due" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
          <Field label="Priority" htmlFor="t-pri">
            <Select id="t-pri" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select>
          </Field>
          <Field label="Status" htmlFor="t-status">
            <Select id="t-status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="todo">To do</option><option value="doing">In progress</option><option value="done">Done</option></Select>
          </Field>
        </div>
        <Field label="Notes" htmlFor="t-notes"><Textarea id="t-notes" rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <ErrorNote error={err} />
      </form>
    </Modal>
  );
}
