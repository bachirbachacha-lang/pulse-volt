import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Eye, FileDown, Library, Pencil, Pin, PinOff, Plus, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProjects } from "../components/forms";
import { Markdown } from "../components/ui/Markdown";
import { Modal, useAction, useConfirm, useToast } from "../components/ui/overlay";
import { Badge, Button, Card, cx, EmptyState, ErrorNote, Field, Input, PageHeader, Select, Spinner, Textarea } from "../components/ui/primitives";
import { del, get, patch, post } from "../lib/api";
import { ago } from "../lib/format";

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ws = useQuery({ queryKey: ["workspaces"], queryFn: () => get<any[]>("/api/workspaces"), enabled: open });
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState({ workspace_id: "" as number | "", path: "", recursive: false, tags: "imported" });
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Import notes from a folder" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!f.workspace_id} onClick={async () => { setBusy(true); setErr(null); try { const r = await post("/api/notes/import", f); qc.invalidateQueries({ queryKey: ["notes"] }); toast(`Imported ${r.imported} notes`); onClose(); } catch (e) { setErr(e); } finally { setBusy(false); } }}>Import</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-muted">Copies Markdown (.md) and text files into the vault. Your original files are not changed.</p>
        <Field label="Workspace" htmlFor="imp-ws"><Select id="imp-ws" value={f.workspace_id} onChange={(e) => setF({ ...f, workspace_id: Number(e.target.value) || "" })}><option value="">Choose…</option>{(ws.data ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
        <Field label="Folder or file inside it" htmlFor="imp-path" hint="e.g. docs/context"><Input id="imp-path" value={f.path} onChange={(e) => setF({ ...f, path: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.recursive} onChange={(e) => setF({ ...f, recursive: e.target.checked })} className="accent-[var(--color-accent)]" />Include sub-folders</label>
        <Field label="Tags" htmlFor="imp-tags"><Input id="imp-tags" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></Field>
        <ErrorNote error={err} />
      </div>
    </Modal>
  );
}

export default function KnowledgeVault() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const act = useAction();
  const confirm = useConfirm();
  const projects = useProjects();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const notes = useQuery({ queryKey: ["notes", "vault", q, tag], queryFn: () => get<any[]>(`/api/notes?kind=note${q ? `&q=${encodeURIComponent(q)}` : ""}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`) });
  const tags = useQuery({ queryKey: ["notes", "tags"], queryFn: () => get<any[]>("/api/notes/tags") });
  const selected = Number(params.get("note")) || null;
  const note = useQuery({ queryKey: ["note", selected], queryFn: () => get(`/api/notes/${selected}`), enabled: Boolean(selected) });
  const [draft, setDraft] = useState<any>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (note.data) (setDraft({ title: note.data.title, body: note.data.body, tags: note.data.tags, project_id: note.data.project_id ?? "" }), setEditing(false));
  }, [note.data]);

  useEffect(() => {
    if (!params.get("new")) return;
    const projectId = Number(params.get("project")) || null;
    void act(async () => {
      const n = await post("/api/notes", { title: "Untitled note", body: "", project_id: projectId });
      qc.invalidateQueries({ queryKey: ["notes"] });
      setParams({ note: String(n.id) }, { replace: true });
      setEditing(true);
    });
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = draft && note.data && (draft.title !== note.data.title || draft.body !== note.data.body || draft.tags !== note.data.tags || (draft.project_id || null) !== note.data.project_id);
  const save = () => act(async () => { await patch(`/api/notes/${selected}`, { ...draft, project_id: draft.project_id || null }); qc.invalidateQueries({ queryKey: ["notes"] }); qc.invalidateQueries({ queryKey: ["note", selected] }); }, "Saved");
  const exportMd = () => {
    const blob = new Blob([`# ${draft.title}\n\n${draft.body}`], { type: "text/markdown" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${draft.title.replace(/[^\w-]+/g, "_")}.md` });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader title="Knowledge Vault" icon={Library} description="Notes, research and imported documents, searchable everywhere (including by the AI)." actions={<><Button icon={FileDown} onClick={() => setImportOpen(true)}>Import folder</Button><Button variant="primary" icon={Plus} onClick={() => setParams({ new: "1" })}>New note</Button></>} />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="flex max-h-[calc(100dvh-12rem)] min-h-[300px] flex-col">
          <div className="space-y-2 border-b border-line p-3">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" className="pl-9" aria-label="Search notes" /></div>
            {!!tags.data?.length && (
              <div className="flex flex-wrap gap-1">
                {tags.data.slice(0, 14).map((t) => <button key={t.tag} onClick={() => setTag(tag === t.tag ? "" : t.tag)} className={cx("rounded-md border px-1.5 py-0.5 text-[11px]", tag === t.tag ? "border-accent/50 bg-accent-soft text-fg" : "border-line text-muted hover:text-fg")}>{t.tag} {t.count}</button>)}
              </div>
            )}
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-2">
            {notes.isLoading ? <Spinner className="p-3" /> : (notes.data ?? []).map((n) => (
              <li key={n.id}>
                <button onClick={() => setParams({ note: String(n.id) })} className={cx("w-full rounded-lg px-3 py-2 text-left", selected === n.id ? "bg-accent-soft" : "hover:bg-hover")}>
                  <span className="flex items-center gap-1.5 text-sm">{n.pinned && <Pin className="size-3 text-gold" aria-label="Pinned" />}<span className="truncate">{n.title}</span></span>
                  <span className="line-clamp-2 text-xs text-muted">{n.excerpt.replace(/[#*_`>]/g, "") || "Empty"}</span>
                  <span className="text-[11px] text-muted">{ago(n.updated_at)}{n.project_name ? ` · ${n.project_name}` : ""}</span>
                </button>
              </li>
            ))}
            {!notes.isLoading && !notes.data?.length && <EmptyState icon={Library} title={q || tag ? "No matches" : "Your vault is empty"}>{!q && !tag && "Write notes or import Markdown files from a workspace."}</EmptyState>}
          </ul>
        </Card>

        <Card className="min-h-[60vh]">
          {!selected || !draft ? <EmptyState icon={Library} title="Select a note" /> : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="h-9 min-w-40 flex-1 font-medium" aria-label="Title" />
                {dirty && <Badge tone="warn">Unsaved</Badge>}
                <Button size="sm" icon={editing ? Eye : Pencil} onClick={() => setEditing(!editing)}>{editing ? "Preview" : "Edit"}</Button>
                <Button size="sm" variant="primary" icon={Save} disabled={!dirty} onClick={save}>Save</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
                <Input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="tags, comma separated" className="h-8 max-w-xs text-xs" aria-label="Tags" />
                <Select value={draft.project_id} onChange={(e) => setDraft({ ...draft, project_id: Number(e.target.value) || "" })} className="h-8 w-auto py-0 text-xs" aria-label="Project"><option value="">No project</option>{(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
                <div className="ml-auto flex gap-1">
                  <Button size="icon-sm" variant="ghost" icon={note.data.pinned ? PinOff : Pin} aria-label={note.data.pinned ? "Unpin" : "Pin"} onClick={() => act(async () => (await patch(`/api/notes/${selected}`, { pinned: !note.data.pinned }), qc.invalidateQueries({ queryKey: ["notes"] }), qc.invalidateQueries({ queryKey: ["note", selected] })))} />
                  <Button size="icon-sm" variant="ghost" icon={Bot} aria-label="Ask AI about this note" onClick={() => nav(`/assistant?q=${encodeURIComponent(`Summarise my note "${draft.title}" and suggest next steps.`)}`)} />
                  <Button size="icon-sm" variant="ghost" icon={FileDown} aria-label="Download as Markdown" onClick={exportMd} />
                  <Button size="icon-sm" variant="ghost" icon={Trash2} aria-label="Delete note" onClick={async () => { if (await confirm({ title: `Delete “${draft.title}”?`, danger: true, confirmLabel: "Delete" })) { await act(() => del(`/api/notes/${selected}`), "Deleted"); qc.invalidateQueries({ queryKey: ["notes"] }); setParams({}); } }} />
                </div>
              </div>
              {editing ? (
                <Textarea autoFocus value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") (e.preventDefault(), void save()); }} className="min-h-[55vh] rounded-none border-0 font-mono text-[13px]" placeholder="Write in Markdown…" aria-label="Note body" />
              ) : (
                <div className="p-5">{draft.body ? <Markdown>{draft.body}</Markdown> : <p className="text-sm text-muted">Empty note. Click Edit.</p>}</div>
              )}
              <p className="border-t border-line px-3 py-2 text-[11px] text-muted">Created {ago(note.data.created_at)} · updated {ago(note.data.updated_at)}</p>
            </>
          )}
        </Card>
      </div>
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
