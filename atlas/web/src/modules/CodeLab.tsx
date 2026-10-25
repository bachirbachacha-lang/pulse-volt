import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, ChevronDown, ChevronRight, Code2, ExternalLink, File, FileCode2, Folder, FolderPlus, GitBranch, GitCommit, Globe, Play, RefreshCw, Save, Square, Terminal, Trash2 } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Modal, useAction, useConfirm, useToast } from "../components/ui/overlay";
import { Badge, Button, Card, cx, EmptyState, ErrorNote, Field, Input, PageHeader, Select, Spinner, Tabs, Textarea } from "../components/ui/primitives";
import { del, get, post, put } from "../lib/api";
import { ago, bytes } from "../lib/format";

const CodeEditor = lazy(() => import("../components/CodeEditor"));

function AddWorkspace({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (id: number) => void }) {
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [err, setErr] = useState<unknown>(null);
  const qc = useQueryClient();
  const submit = async () => {
    setErr(null);
    if (!(await confirm({ title: "Give Atlas access to this folder?", body: <><p>Atlas will be able to read files in <code>{path}</code>, and (only when you confirm each time) save files, run its package.json scripts and make git commits.</p><p className="mt-2">Secret files like <code>.env</code> and keys stay blocked.</p></>, confirmLabel: "Allow access" }))) return;
    try {
      const ws = await post("/api/workspaces", { name, path }, true);
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      onAdded(ws.id);
      setName("");
      setPath("");
      onClose();
    } catch (e) {
      setErr(e);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add a workspace" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name || !path} onClick={submit}>Add workspace</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-muted">A workspace is a folder on this computer that Atlas may open: a website, a game, a script collection. Add each project folder separately.</p>
        <Field label="Name" htmlFor="ws-name"><Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. pulse-volt" /></Field>
        <Field label="Folder path" htmlFor="ws-path" hint="Full path, e.g. /Users/you/Projects/pulse-volt or ~/Projects/pulse-volt"><Input id="ws-path" value={path} onChange={(e) => setPath(e.target.value)} className="font-mono" /></Field>
        <ErrorNote error={err} />
      </div>
    </Modal>
  );
}

function TreeNode({ wsId, entry, depth, selected, onOpen }: { wsId: number; entry: any; depth: number; selected: string; onOpen: (p: string) => void }) {
  const [open, setOpen] = useState(false);
  const children = useQuery({ queryKey: ["tree", wsId, entry.path], queryFn: () => get(`/api/workspaces/${wsId}/tree?path=${encodeURIComponent(entry.path)}`), enabled: open && entry.type === "dir" });
  const pad = { paddingLeft: 8 + depth * 14 };
  if (entry.type === "dir")
    return (
      <li>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex h-8 w-full items-center gap-1.5 rounded-md pr-2 text-left text-sm text-fg-2 hover:bg-hover" style={pad}>
          {open ? <ChevronDown className="size-3.5 shrink-0 text-muted" /> : <ChevronRight className="size-3.5 shrink-0 text-muted" />}
          <Folder className="size-4 shrink-0 text-gold/80" aria-hidden />
          <span className="truncate">{entry.name}</span>
        </button>
        {open && (children.isLoading ? <Spinner className="py-1 pl-8 text-xs" /> : <ul>{children.data?.entries.map((e: any) => <TreeNode key={e.path} wsId={wsId} entry={e} depth={depth + 1} selected={selected} onOpen={onOpen} />)}</ul>)}
      </li>
    );
  return (
    <li>
      <button onClick={() => onOpen(entry.path)} className={cx("flex h-8 w-full items-center gap-1.5 rounded-md pr-2 text-left text-sm hover:bg-hover", selected === entry.path ? "bg-accent-soft text-fg" : "text-fg-2")} style={{ paddingLeft: 8 + depth * 14 + 20 }}>
        <File className="size-4 shrink-0 text-muted" aria-hidden />
        <span className="truncate">{entry.name}</span>
      </button>
    </li>
  );
}

function EditorTab({ wsId, path, onAskAI }: { wsId: number; path: string; onAskAI: () => void }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const file = useQuery({ queryKey: ["file", wsId, path], queryFn: () => get(`/api/workspaces/${wsId}/file?path=${encodeURIComponent(path)}`), enabled: Boolean(path) });
  const [draft, setDraft] = useState<string | null>(null);
  const [mtime, setMtime] = useState<string | null>(null);
  useEffect(() => {
    setDraft(null);
    setMtime(file.data?.mtime ?? null);
  }, [file.data]);
  const dirty = draft !== null && draft !== file.data?.content;
  const save = useCallback(async () => {
    if (!dirty || draft === null) return;
    if (!(await confirm({ title: `Save ${path}?`, body: "This overwrites the file on disk. Atlas keeps a copy of the previous version in its backups folder.", confirmLabel: "Save file" }))) return;
    try {
      const r = await put(`/api/workspaces/${wsId}/file`, { path, content: draft, expected_mtime: mtime }, true);
      setMtime(r.mtime);
      toast("Saved");
      qc.invalidateQueries({ queryKey: ["file", wsId, path] });
      qc.invalidateQueries({ queryKey: ["git", wsId] });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "error");
    }
  }, [dirty, draft, path, wsId, mtime, confirm, toast, qc]);

  if (!path) return <EmptyState icon={FileCode2} title="Pick a file">Choose a file from the tree to view or edit it.</EmptyState>;
  if (file.isLoading) return <Spinner className="p-4" />;
  if (file.error) return <div className="p-4"><ErrorNote error={file.error} /></div>;
  const f = file.data;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-xs text-fg-2">{f.path}</code>
        <span className="text-xs text-muted">{bytes(f.size)}</span>
        {dirty && <Badge tone="warn">Unsaved</Badge>}
        {f.isText && !f.tooLarge && <Button size="sm" icon={Bot} onClick={onAskAI} disabled={f.size > 100_000} title={f.size > 100_000 ? "Too large to attach (100 KB max)" : undefined}>Ask AI</Button>}
        {f.isText && !f.tooLarge && <Button size="sm" variant="primary" icon={Save} disabled={!dirty} onClick={save}>Save</Button>}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {f.content !== null ? (
          <Suspense fallback={<Spinner className="p-4" />}>
            <CodeEditor path={f.path} value={draft ?? f.content} onChange={setDraft} onSave={save} />
          </Suspense>
        ) : f.mime.startsWith("image/") ? (
          <div className="grid h-full place-items-center bg-bg p-4 grid-bg"><img src={`/api/workspaces/${wsId}/raw?path=${encodeURIComponent(f.path)}`} alt={f.path} className="max-h-full max-w-full rounded-lg" /></div>
        ) : (
          <EmptyState title={f.tooLarge ? "File is too large to edit here (2 MB max)" : "Binary file"}>Open it with another app, or in VS Code.</EmptyState>
        )}
      </div>
    </div>
  );
}

function GitTab({ wsId, sub }: { wsId: number; sub: string }) {
  const qc = useQueryClient();
  const act = useAction();
  const confirm = useConfirm();
  const status = useQuery({ queryKey: ["git", wsId, sub], queryFn: () => get(`/api/workspaces/${wsId}/git/status?sub=${encodeURIComponent(sub)}`) });
  const [diffFor, setDiffFor] = useState<{ path?: string; commit?: string } | null>(null);
  const diff = useQuery({
    queryKey: ["diff", wsId, sub, diffFor],
    queryFn: () => get(`/api/workspaces/${wsId}/git/diff?sub=${encodeURIComponent(sub)}&${diffFor?.commit ? `commit=${diffFor.commit}` : `path=${encodeURIComponent(diffFor?.path ?? "")}`}`),
    enabled: Boolean(diffFor),
  });
  const [msg, setMsg] = useState("");
  if (status.isLoading) return <Spinner className="p-4" />;
  const s = status.data;
  if (!s?.available) return <EmptyState icon={GitBranch} title="Git not available here">{s?.reason}</EmptyState>;
  const commit = async () => {
    if (!(await confirm({ title: "Commit all changes?", body: <>This stages <b>{s.files.length} changed file(s)</b> and commits them on <code>{s.branch}</code>. Secret files are refused. Nothing is pushed.</>, confirmLabel: "Commit" }))) return;
    const ok = await act(() => post(`/api/workspaces/${wsId}/git/commit`, { message: msg, sub }, true), "Committed");
    if (ok) (setMsg(""), qc.invalidateQueries({ queryKey: ["git", wsId] }));
  };
  return (
    <div className="grid h-full min-h-0 gap-0 lg:grid-cols-[340px_1fr]">
      <div className="min-h-0 space-y-4 overflow-y-auto border-b border-line p-3 lg:border-b-0 lg:border-r">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <GitBranch className="size-4 text-accent" aria-hidden />
          <code>{s.branch}</code>
          {s.upstream && <span className="text-xs text-muted">→ {s.upstream}</span>}
          {s.ahead > 0 && <Badge tone="accent">{s.ahead} ahead</Badge>}
          {s.behind > 0 && <Badge tone="warn">{s.behind} behind</Badge>}
          <Button variant="ghost" size="icon-sm" icon={RefreshCw} aria-label="Refresh git status" onClick={() => status.refetch()} />
        </div>
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Changes ({s.files.length})</h3>
          {s.files.length ? (
            <ul className="space-y-0.5">
              {s.files.map((f: any) => (
                <li key={f.path}>
                  <button onClick={() => setDiffFor({ path: f.path })} className={cx("flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-hover", diffFor?.path === f.path && "bg-hover")}>
                    <span className={cx("w-5 font-mono", f.index === "?" ? "text-ok" : f.worktree === "D" || f.index === "D" ? "text-danger" : "text-warn")}>{f.index === "?" ? "U" : (f.index.trim() || f.worktree)}</span>
                    <span className="truncate">{f.path}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Working tree clean.</p>}
        </section>
        {s.files.length > 0 && (
          <section className="space-y-2">
            <Textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Commit message" aria-label="Commit message" />
            <Button variant="primary" size="sm" icon={GitCommit} disabled={!msg.trim()} onClick={commit}>Commit changes</Button>
            <p className="text-xs text-muted">Push and pull: use your terminal or VS Code for now. <Badge>Planned</Badge></p>
          </section>
        )}
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Recent commits</h3>
          <ul className="space-y-0.5">
            {s.commits.map((c: any) => (
              <li key={c.hash}>
                <button onClick={() => setDiffFor({ commit: c.hash })} className={cx("w-full rounded-md px-2 py-1 text-left text-xs hover:bg-hover", diffFor?.commit === c.hash && "bg-hover")}>
                  <span className="block truncate text-fg-2">{c.subject}</span>
                  <span className="font-mono text-muted">{c.hash}</span> <span className="text-muted">· {c.author} · {ago(c.date)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="min-h-0 overflow-auto bg-bg">
        {!diffFor ? <EmptyState title="Select a change or commit to see the diff" /> : diff.isLoading ? <Spinner className="p-4" /> : (
          <pre className="p-3 font-mono text-xs leading-5">
            {(diff.data?.diff || "No differences.").split("\n").map((l: string, i: number) => (
              <div key={i} className={cx(l.startsWith("+") && !l.startsWith("+++") && "bg-ok/10 text-ok", l.startsWith("-") && !l.startsWith("---") && "bg-danger/10 text-danger", l.startsWith("@@") && "text-info")}>{l || " "}</div>
            ))}
          </pre>
        )}
      </div>
    </div>
  );
}

function RunLog({ runId }: { runId: number }) {
  const r = useQuery({ queryKey: ["run", runId], queryFn: () => get(`/api/runs/${runId}`), refetchInterval: (q) => (q.state.data?.status === "running" ? 1000 : false) });
  const act = useAction();
  const qc = useQueryClient();
  if (!r.data) return <Spinner className="p-4" />;
  const lines: string[] = r.data.log.split("\n");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 text-sm">
        <Terminal className="size-4 text-muted" aria-hidden />
        <code className="flex-1 truncate text-xs">{r.data.command}</code>
        <Badge tone={r.data.status === "running" ? "accent" : r.data.status === "succeeded" ? "ok" : r.data.status === "failed" ? "danger" : "neutral"}>{r.data.status}{r.data.exit_code !== null ? ` · exit ${r.data.exit_code}` : ""}</Badge>
        {r.data.status === "running" && <Button size="sm" icon={Square} onClick={() => act(async () => (await post(`/api/runs/${runId}/stop`), qc.invalidateQueries({ queryKey: ["run", runId] })))}>Stop</Button>}
      </div>
      <pre className="min-h-0 flex-1 overflow-auto bg-bg p-3 font-mono text-xs leading-5" aria-live="polite">
        {lines.map((l, i) => <div key={i} className={cx(/\b(error|err!|failed|exception|cannot find)\b/i.test(l) && "text-danger", /\bwarn(ing)?\b/i.test(l) && "text-warn")}>{l || " "}</div>)}
        {r.data.status === "running" && <span className="animate-pulse text-accent">▍</span>}
      </pre>
    </div>
  );
}

function ScriptsTab({ wsId, sub }: { wsId: number; sub: string }) {
  const confirm = useConfirm();
  const act = useAction();
  const qc = useQueryClient();
  const scripts = useQuery({ queryKey: ["scripts", wsId, sub], queryFn: () => get(`/api/workspaces/${wsId}/scripts?sub=${encodeURIComponent(sub)}`) });
  const runs = useQuery({ queryKey: ["runs", wsId], queryFn: () => get<any[]>(`/api/runs?workspace_id=${wsId}`), refetchInterval: 3000 });
  const [selected, setSelected] = useState<number | null>(null);
  const start = async (script: string, install = false) => {
    const label = install ? "npm install" : `npm run ${script}`;
    const cmd = install ? "Downloads the project's dependencies from npm." : scripts.data.scripts.find((s: any) => s.name === script)?.command;
    if (!(await confirm({ title: `Run “${label}”?`, body: <><p>In <code>{scripts.data.cwd || "/"}</code>, this runs:</p><pre className="mt-2 overflow-x-auto rounded-lg bg-bg p-2 text-xs">{cmd}</pre><p className="mt-2">Only run scripts you trust. It runs with your user's permissions.</p></>, confirmLabel: "Run" }))) return;
    const r = await act(() => post(`/api/workspaces/${wsId}/scripts/run`, { sub, script: script || "install", install }, true));
    if (r) (setSelected(r.id), qc.invalidateQueries({ queryKey: ["runs", wsId] }));
  };
  return (
    <div className="grid h-full min-h-0 lg:grid-cols-[320px_1fr]">
      <div className="min-h-0 space-y-4 overflow-y-auto border-b border-line p-3 lg:border-b-0 lg:border-r">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Scripts in {scripts.data?.cwd || "workspace root"}/package.json</h3>
          {scripts.isLoading ? <Spinner /> : !scripts.data?.hasPackageJson ? (
            <p className="text-sm text-muted">No package.json here. Pick a folder with one in the tree (folder selector above), or this is a static site: use Preview.</p>
          ) : (
            <ul className="space-y-1">
              {!scripts.data.hasNodeModules && (
                <li className="rounded-lg border border-warn/30 bg-warn/10 p-2 text-xs text-warn">Dependencies are not installed. <button className="underline" onClick={() => start("", true)}>Run npm install</button></li>
              )}
              {scripts.data.scripts.map((s: any) => (
                <li key={s.name} className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5">
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{s.name}</p><code className="block truncate text-[11px] text-muted" title={s.command}>{s.command}</code></div>
                  <Button size="icon-sm" variant="secondary" icon={Play} aria-label={`Run ${s.name}`} onClick={() => start(s.name)} />
                </li>
              ))}
              {!scripts.data.scripts.length && <li className="text-sm text-muted">package.json has no scripts.</li>}
            </ul>
          )}
        </section>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Build & test logs</h3>
          <ul className="space-y-0.5">
            {(runs.data ?? []).map((r) => (
              <li key={r.id}>
                <button onClick={() => setSelected(r.id)} className={cx("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-hover", selected === r.id && "bg-hover")}>
                  <Badge tone={r.status === "running" ? "accent" : r.status === "succeeded" ? "ok" : r.status === "failed" ? "danger" : "neutral"}>{r.status}</Badge>
                  <span className="flex-1 truncate">{r.label}{r.cwd ? ` (${r.cwd})` : ""}</span>
                  <span className="text-muted">{ago(r.started_at)}</span>
                </button>
              </li>
            ))}
            {!runs.data?.length && <li className="text-sm text-muted">No runs yet.</li>}
          </ul>
        </section>
      </div>
      <div className="min-h-0">{selected ? <RunLog runId={selected} /> : <EmptyState icon={Terminal} title="Run a script to see its output" />}</div>
    </div>
  );
}

function PreviewTab({ wsId, initial }: { wsId: number; initial: string }) {
  const [path, setPath] = useState(initial);
  const [nonce, setNonce] = useState(0);
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => get("/api/settings") });
  useEffect(() => setPath(initial), [initial]);
  if (!settings.data) return <Spinner className="p-4" />;
  const src = `/preview/${settings.data.previewToken}/${wsId}/${path.split("/").map(encodeURIComponent).join("/")}`;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <form className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2" onSubmit={(e) => (e.preventDefault(), setNonce((n) => n + 1))}>
        <Globe className="size-4 text-muted" aria-hidden />
        <Input value={path} onChange={(e) => setPath(e.target.value)} className="h-8 flex-1 font-mono text-xs" aria-label="Page to preview" placeholder="index.html or folder/" />
        <Button size="sm" type="submit" icon={RefreshCw}>Reload</Button>
        <a href={src} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-accent hover:bg-hover"><ExternalLink className="size-3.5" />New tab</a>
      </form>
      <p className="border-b border-line bg-surface px-3 py-1 text-[11px] text-muted">Static preview, sandboxed. For apps with a dev server (Vite, Next.js), run their dev script and open the URL it prints.</p>
      <iframe key={nonce} title="Site preview" src={src} sandbox="allow-scripts allow-forms allow-popups allow-modals" className="min-h-0 w-full flex-1 bg-white" />
    </div>
  );
}

export default function CodeLab() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const confirm = useConfirm();
  const act = useAction();
  const qc = useQueryClient();
  const workspaces = useQuery({ queryKey: ["workspaces"], queryFn: () => get<any[]>("/api/workspaces") });
  const [addOpen, setAddOpen] = useState(false);
  const wsId = Number(params.get("ws")) || workspaces.data?.[0]?.id || 0;
  const [file, setFile] = useState("");
  const [sub, setSub] = useState(params.get("path") ?? "");
  const [tab, setTab] = useState<"editor" | "git" | "scripts" | "preview">("editor");
  const tree = useQuery({ queryKey: ["tree", wsId, ""], queryFn: () => get(`/api/workspaces/${wsId}/tree`), enabled: Boolean(wsId) });
  const ws = workspaces.data?.find((w) => w.id === wsId);
  const topDirs = useMemo(() => (tree.data?.entries ?? []).filter((e: any) => e.type === "dir"), [tree.data]);

  useEffect(() => setFile(""), [wsId]);

  if (workspaces.isLoading) return <Spinner />;
  return (
    <>
      <PageHeader
        title="Code Lab"
        icon={Code2}
        description="Browse, edit, test and preview your websites, games and scripts."
        actions={
          <>
            {ws && <Button icon={ExternalLink} onClick={() => act(() => post(`/api/workspaces/${ws.id}/open-editor`, { path: file || sub }), "Opening VS Code")}>Open in VS Code</Button>}
            <Button variant="primary" icon={FolderPlus} onClick={() => setAddOpen(true)}>Add workspace</Button>
          </>
        }
      />
      {!workspaces.data?.length ? (
        <Card><EmptyState icon={FolderPlus} title="No workspaces yet" action={<Button variant="primary" icon={FolderPlus} onClick={() => setAddOpen(true)}>Add your first workspace</Button>}>Atlas can only open folders you add here. Add the folder of a website, game or script project.</EmptyState></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="flex max-h-[calc(100dvh-12rem)] min-h-[300px] flex-col">
            <div className="space-y-2 border-b border-line p-3">
              <Select aria-label="Workspace" value={wsId} onChange={(e) => (setParams({ ws: e.target.value }), setSub(""))}>
                {workspaces.data.map((w) => <option key={w.id} value={w.id}>{w.name}{w.exists ? "" : " (missing)"}</option>)}
              </Select>
              {ws && <p className="truncate font-mono text-[11px] text-muted" title={ws.path}>{ws.path}</p>}
              <Select aria-label="Project folder for git, scripts and preview" value={sub} onChange={(e) => setSub(e.target.value)} className="h-9 text-xs">
                <option value="">Folder: workspace root</option>
                {topDirs.map((d: any) => <option key={d.path} value={d.path}>Folder: {d.name}</option>)}
                {sub && !topDirs.some((d: any) => d.path === sub) && <option value={sub}>Folder: {sub}</option>}
              </Select>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto p-1.5" aria-label="Files">
              {tree.isLoading ? <Spinner className="p-3" /> : tree.error ? <ErrorNote error={tree.error} /> : tree.data?.entries.map((e: any) => <TreeNode key={e.path} wsId={wsId} entry={e} depth={0} selected={file} onOpen={(p) => (setFile(p), setTab("editor"))} />)}
            </ul>
            {ws && (
              <button className="flex items-center justify-center gap-1.5 border-t border-line py-2 text-xs text-muted hover:text-danger" onClick={async () => { if (await confirm({ title: `Remove “${ws.name}”?`, body: "Atlas stops having access. Your files are not deleted.", confirmLabel: "Remove access", danger: true })) { await act(() => del(`/api/workspaces/${ws.id}`), "Workspace removed"); qc.invalidateQueries({ queryKey: ["workspaces"] }); setParams({}); } }}>
                <Trash2 className="size-3.5" /> Remove workspace
              </button>
            )}
          </Card>
          <Card className="flex h-[calc(100dvh-12rem)] min-h-[480px] flex-col overflow-hidden">
            <Tabs className="px-2" value={tab} onChange={setTab} tabs={[{ id: "editor", label: "Editor", icon: FileCode2 }, { id: "git", label: "Git", icon: GitBranch }, { id: "scripts", label: "Run & logs", icon: Terminal }, { id: "preview", label: "Preview", icon: Globe }]} />
            <div className="min-h-0 flex-1">
              {tab === "editor" && <EditorTab wsId={wsId} path={file} onAskAI={() => nav(`/assistant?attach_ws=${wsId}&attach_path=${encodeURIComponent(file)}&q=${encodeURIComponent(`Explain ${file.split("/").pop()} and point out any bugs.`)}`)} />}
              {tab === "git" && <GitTab wsId={wsId} sub={sub} />}
              {tab === "scripts" && <ScriptsTab wsId={wsId} sub={sub} />}
              {tab === "preview" && <PreviewTab wsId={wsId} initial={file.match(/\.html?$/i) ? file : sub ? `${sub}/` : "index.html"} />}
            </div>
          </Card>
        </div>
      )}
      <AddWorkspace open={addOpen} onClose={() => setAddOpen(false)} onAdded={(id) => setParams({ ws: String(id) })} />
    </>
  );
}
