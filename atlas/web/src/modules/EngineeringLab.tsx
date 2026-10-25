import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, BrainCircuit, Calculator, Eye, FileText, FlaskConical, GitFork, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useProjects } from "../components/forms";
import { Uploader } from "../components/Uploader";
import { Markdown } from "../components/ui/Markdown";
import { Modal, useAction, useConfirm } from "../components/ui/overlay";
import { Badge, Button, Card, CardHeader, cx, EmptyState, ErrorNote, Field, Input, PageHeader, Select, Spinner, Tabs, Textarea } from "../components/ui/primitives";
import { del, get, patch, post } from "../lib/api";
import { ago, bytes } from "../lib/format";

const Mermaid = lazy(() => import("../components/Mermaid"));
const ModelViewer = lazy(() => import("../components/ModelViewer"));

type Tab = "docs" | "calc" | "experiments" | "models";

const DIAGRAM_STARTER = "flowchart LR\n  idea[Idea] --> sketch[Sketch]\n  sketch --> proto[Prototype]\n  proto --> test{Works?}\n  test -- yes --> ship[Ship]\n  test -- no --> sketch";

/** Markdown preview that also renders ```mermaid blocks as diagrams. */
function DocPreview({ body, kind }: { body: string; kind: string }) {
  if (kind === "diagram") return <Suspense fallback={<Spinner />}><Mermaid code={body} /></Suspense>;
  const parts = body.split(/```mermaid\n([\s\S]*?)```/g);
  return (
    <div className="space-y-3">
      {parts.map((p, i) => (i % 2 ? <Suspense key={i} fallback={<Spinner />}><Mermaid code={p} /></Suspense> : p.trim() ? <Markdown key={i}>{p}</Markdown> : null))}
    </div>
  );
}

function Docs() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const act = useAction();
  const confirm = useConfirm();
  const projects = useProjects();
  const docs = useQuery({ queryKey: ["notes", "eng"], queryFn: async () => [...(await get<any[]>("/api/notes?kind=doc")), ...(await get<any[]>("/api/notes?kind=diagram"))] });
  const selected = Number(params.get("doc")) || null;
  const doc = useQuery({ queryKey: ["note", selected], queryFn: () => get(`/api/notes/${selected}`), enabled: Boolean(selected) });
  const [draft, setDraft] = useState<{ title: string; body: string; project_id: number | "" } | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  useEffect(() => {
    if (doc.data) (setDraft({ title: doc.data.title, body: doc.data.body, project_id: doc.data.project_id ?? "" }), setMode("view"));
  }, [doc.data]);
  const create = async (kind: "doc" | "diagram") => {
    const n = await act(() => post("/api/notes", { kind, title: kind === "doc" ? "Untitled document" : "Untitled diagram", body: kind === "doc" ? "# Untitled document\n\nWrite specs, research and notes here. Diagrams work too:\n\n```mermaid\n" + DIAGRAM_STARTER + "\n```\n" : DIAGRAM_STARTER }));
    if (n) (qc.invalidateQueries({ queryKey: ["notes"] }), setParams({ doc: String(n.id) }), setMode("edit"));
  };
  const save = () => act(async () => (await patch(`/api/notes/${selected}`, { ...draft, project_id: draft?.project_id || null }), qc.invalidateQueries({ queryKey: ["notes"] }), qc.invalidateQueries({ queryKey: ["note", selected] })), "Saved");
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card>
        <div className="flex gap-2 border-b border-line p-3">
          <Button size="sm" icon={FileText} onClick={() => create("doc")}>Document</Button>
          <Button size="sm" icon={GitFork} onClick={() => create("diagram")}>Diagram</Button>
        </div>
        <ul className="p-2">
          {(docs.data ?? []).map((d) => (
            <li key={d.id}>
              <button onClick={() => setParams({ doc: String(d.id) })} className={cx("w-full rounded-lg px-3 py-2 text-left text-sm", selected === d.id ? "bg-accent-soft" : "hover:bg-hover")}>
                <span className="flex items-center gap-2">{d.kind === "diagram" ? <GitFork className="size-3.5 text-muted" /> : <FileText className="size-3.5 text-muted" />}<span className="truncate">{d.title}</span></span>
                <span className="block pl-5 text-xs text-muted">{ago(d.updated_at)}</span>
              </button>
            </li>
          ))}
          {!docs.data?.length && <p className="p-3 text-sm text-muted">Specs, research notes and diagrams for your builds.</p>}
        </ul>
      </Card>
      <Card className="min-h-[60vh]">
        {!selected || !draft ? <EmptyState icon={FileText} title="Pick or create a document" /> : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="h-9 min-w-40 flex-1 font-medium" aria-label="Title" />
              <Select value={draft.project_id} onChange={(e) => setDraft({ ...draft, project_id: Number(e.target.value) || "" })} className="h-9 w-auto" aria-label="Project"><option value="">No project</option>{(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
              <Button size="sm" icon={mode === "view" ? Pencil : Eye} onClick={() => setMode(mode === "view" ? "edit" : "view")}>{mode === "view" ? "Edit" : "Preview"}</Button>
              <Button size="sm" variant="primary" icon={Save} onClick={save}>Save</Button>
              <Button size="icon-sm" variant="ghost" icon={Trash2} aria-label="Delete document" onClick={async () => { if (await confirm({ title: `Delete “${draft.title}”?`, danger: true, confirmLabel: "Delete" })) { await act(() => del(`/api/notes/${selected}`), "Deleted"); qc.invalidateQueries({ queryKey: ["notes"] }); setParams({}); } }} />
            </div>
            <div className={cx("grid gap-0", mode === "edit" && "xl:grid-cols-2")}>
              {mode === "edit" && <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className="min-h-[55vh] rounded-none border-0 border-r border-line font-mono text-[13px]" aria-label="Document source" />}
              <div className="p-4"><DocPreview body={draft.body} kind={doc.data.kind} /></div>
            </div>
            {doc.data.kind === "diagram" && mode === "view" && <p className="px-4 pb-3 text-xs text-muted">Diagram syntax: <a className="text-accent underline" href="https://mermaid.js.org/intro/" target="_blank" rel="noreferrer">Mermaid</a>. Click Edit to change it.</p>}
          </>
        )}
      </Card>
    </div>
  );
}

const EXAMPLES = ["12 V * 2.5 A", "5 kg * 9.81 m/s^2 to N", "(30 cm * 20 cm * 10 cm) to L", "2 inch to mm", "sqrt(3^2 + 4^2)", "1200 W * 3 h to kWh", "70 km/h to m/s", "det([1, 2; 3, 4])"];

function CalculatorTab() {
  const qc = useQueryClient();
  const act = useAction();
  const history = useQuery({ queryKey: ["calcs"], queryFn: () => get<any[]>("/api/calculations") });
  const [expr, setExpr] = useState("");
  const [label, setLabel] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!expr.trim()) return (setResult(null), setErr(null));
    const t = setTimeout(() => post("/api/calculate", { expression: expr }).then((r) => (setResult(r.result), setErr(null))).catch((e) => (setResult(null), setErr(e.message))), 250);
    return () => clearTimeout(t);
  }, [expr]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader title="Calculator with units" icon={Calculator} subtitle="Powered by math.js: units, conversions, matrices, functions" />
        <div className="space-y-4 p-4">
          <Field label="Expression" htmlFor="calc">
            <Input id="calc" value={expr} onChange={(e) => setExpr(e.target.value)} className="h-12 font-mono text-base" placeholder="e.g. 5 kg * 9.81 m/s^2 to N" autoComplete="off" spellCheck={false} />
          </Field>
          <div aria-live="polite" className="min-h-14 rounded-xl border border-line bg-bg px-4 py-3 font-mono text-xl">
            {result !== null ? <span className="text-accent">= {result}</span> : err ? <span className="text-sm text-danger">{err}</span> : <span className="text-sm text-muted">Result appears here</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className="h-9 max-w-xs" aria-label="Label" />
            <Button size="sm" variant="primary" icon={Save} disabled={result === null} onClick={() => act(async () => (await post("/api/calculate", { expression: expr, label, save: true }), qc.invalidateQueries({ queryKey: ["calcs"] }), setLabel("")), "Saved")}>Save</Button>
          </div>
          <div>
            <p className="mb-2 text-xs text-muted">Try:</p>
            <div className="flex flex-wrap gap-2">{EXAMPLES.map((e) => <button key={e} onClick={() => setExpr(e)} className="rounded-lg border border-line px-2 py-1 font-mono text-xs text-fg-2 hover:border-accent/50 hover:text-fg">{e}</button>)}</div>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Saved calculations" />
        <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
          {(history.data ?? []).map((c) => (
            <li key={c.id} className="group flex items-start gap-2 px-4 py-2.5">
              <button className="min-w-0 flex-1 text-left" onClick={() => setExpr(c.expression)}>
                {c.label && <p className="text-xs text-muted">{c.label}</p>}
                <p className="truncate font-mono text-xs text-fg-2">{c.expression}</p>
                <p className="font-mono text-sm text-accent">= {c.result}</p>
              </button>
              <Button variant="ghost" size="icon-sm" icon={Trash2} aria-label="Delete calculation" onClick={() => act(async () => (await del(`/api/calculations/${c.id}`), qc.invalidateQueries({ queryKey: ["calcs"] })))} />
            </li>
          ))}
          {!history.data?.length && <p className="p-4 text-sm text-muted">Nothing saved yet.</p>}
        </ul>
      </Card>
    </div>
  );
}

const EXP_TONE = { planned: "neutral", running: "accent", succeeded: "ok", failed: "danger", inconclusive: "warn" } as const;

function Experiments() {
  const qc = useQueryClient();
  const act = useAction();
  const confirm = useConfirm();
  const projects = useProjects();
  const list = useQuery({ queryKey: ["experiments"], queryFn: () => get<any[]>("/api/experiments") });
  const [edit, setEdit] = useState<any | null>(null);
  const blank = { title: "", hypothesis: "", method: "", result: "", status: "planned", project_id: "" };
  const save = async () => {
    const body = { ...edit, project_id: edit.project_id || null };
    const ok = await act(() => (edit.id ? patch(`/api/experiments/${edit.id}`, body) : post("/api/experiments", body)), "Saved");
    if (ok) (setEdit(null), qc.invalidateQueries({ queryKey: ["experiments"] }));
  };
  return (
    <>
      <div className="mb-3 flex justify-end"><Button variant="primary" icon={Plus} onClick={() => setEdit(blank)}>Log experiment</Button></div>
      {list.isLoading ? <Spinner /> : !list.data?.length ? <Card><EmptyState icon={FlaskConical} title="No experiments yet">Write down what you test, how, and what happened, so you don't repeat mistakes.</EmptyState></Card> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.data.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-start gap-2">
                <h3 className="flex-1 font-medium">{e.title}</h3>
                <Badge tone={EXP_TONE[e.status as keyof typeof EXP_TONE]}>{e.status}</Badge>
              </div>
              {e.hypothesis && <p className="mt-2 text-sm text-fg-2"><span className="text-muted">Hypothesis: </span>{e.hypothesis}</p>}
              {e.result && <p className="mt-1 text-sm text-fg-2"><span className="text-muted">Result: </span>{e.result}</p>}
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <span className="flex-1">{e.project_name ? `${e.project_name} · ` : ""}{ago(e.updated_at)}</span>
                <Button size="icon-sm" variant="ghost" icon={Pencil} aria-label={`Edit ${e.title}`} onClick={() => setEdit({ ...e, project_id: e.project_id ?? "" })} />
                <Button size="icon-sm" variant="ghost" icon={Trash2} aria-label={`Delete ${e.title}`} onClick={async () => { if (await confirm({ title: `Delete “${e.title}”?`, danger: true, confirmLabel: "Delete" })) act(async () => (await del(`/api/experiments/${e.id}`), qc.invalidateQueries({ queryKey: ["experiments"] }))); }} />
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? "Edit experiment" : "Log experiment"} wide footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" disabled={!edit?.title?.trim()} onClick={save}>Save</Button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="e-title" className="sm:col-span-2"><Input id="e-title" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Status" htmlFor="e-status"><Select id="e-status" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{Object.keys(EXP_TONE).map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
            <Field label="Project" htmlFor="e-proj"><Select id="e-proj" value={edit.project_id} onChange={(e) => setEdit({ ...edit, project_id: Number(e.target.value) || "" })}><option value="">None</option>{(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Hypothesis: what do you expect?" htmlFor="e-hyp" className="sm:col-span-2"><Textarea id="e-hyp" rows={2} value={edit.hypothesis} onChange={(e) => setEdit({ ...edit, hypothesis: e.target.value })} /></Field>
            <Field label="Method: how will you test it?" htmlFor="e-method" className="sm:col-span-2"><Textarea id="e-method" rows={3} value={edit.method} onChange={(e) => setEdit({ ...edit, method: e.target.value })} /></Field>
            <Field label="Result: what actually happened?" htmlFor="e-res" className="sm:col-span-2"><Textarea id="e-res" rows={3} value={edit.result} onChange={(e) => setEdit({ ...edit, result: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </>
  );
}

function Models() {
  const qc = useQueryClient();
  const act = useAction();
  const confirm = useConfirm();
  const assets = useQuery({ queryKey: ["assets", "engineering"], queryFn: () => get<any[]>("/api/assets?area=engineering") });
  const integrations = useQuery({ queryKey: ["integrations"], queryFn: () => get<any[]>("/api/integrations") });
  const [sel, setSel] = useState<number | null>(null);
  const a = useMemo(() => assets.data?.find((x) => x.id === sel) ?? assets.data?.[0], [assets.data, sel]);
  const tools = (integrations.data ?? []).filter((i) => ["blender", "freecad", "openscad"].includes(i.id));
  const viewable = a && /\.(stl|obj|glb|gltf)$/i.test(a.original_name);
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="space-y-4">
        <Uploader query="area=engineering" accept=".stl,.obj,.glb,.gltf,.step,.stp,.fcstd,.blend,.dxf,.scad,.pdf,.png,.jpg" onDone={() => qc.invalidateQueries({ queryKey: ["assets", "engineering"] })} label="Upload STL, OBJ, GLB, STEP, FCStd, blend…" />
        <Card>
          <CardHeader title="Models & CAD files" icon={Box} />
          <ul className="max-h-[45vh] overflow-y-auto p-2">
            {(assets.data ?? []).map((x) => (
              <li key={x.id}><button onClick={() => setSel(x.id)} className={cx("w-full rounded-lg px-3 py-2 text-left text-sm", a?.id === x.id ? "bg-accent-soft" : "hover:bg-hover")}><span className="block truncate">{x.original_name}</span><span className="text-xs text-muted">{bytes(x.size)} · {ago(x.created_at)}</span></button></li>
            ))}
            {!assets.data?.length && <p className="p-3 text-sm text-muted">No files yet.</p>}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Desktop tools on this computer" />
          <ul className="space-y-1.5 p-3 text-sm">
            {tools.map((t) => <li key={t.id} className="flex items-center justify-between gap-2"><span>{t.name}</span>{t.status === "connected" ? <Badge tone="ok">Found</Badge> : <Badge>Not installed</Badge>}</li>)}
          </ul>
        </Card>
      </div>
      <Card className="flex min-h-[60vh] flex-col overflow-hidden">
        {!a ? <EmptyState icon={Box} title="Upload a 3D model to preview it" /> : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{a.original_name}</p>
              {tools.filter((t) => t.status === "connected").map((t) => (
                <Button key={t.id} size="sm" onClick={() => act(() => post(`/api/assets/${a.id}/open-with`, { tool: t.id }), `Opening in ${t.name}`)}>Open in {t.name}</Button>
              ))}
              <a href={`/api/assets/${a.id}/file?download=1`} className="inline-flex h-8 items-center rounded-lg px-3 text-xs text-accent hover:bg-hover">Download</a>
              <Button size="icon-sm" variant="ghost" icon={Trash2} aria-label="Delete file" onClick={async () => { if (await confirm({ title: `Delete ${a.original_name}?`, danger: true, confirmLabel: "Delete" })) { await act(() => del(`/api/assets/${a.id}`), "Deleted"); setSel(null); qc.invalidateQueries({ queryKey: ["assets", "engineering"] }); } }} />
            </div>
            <div className="min-h-[50vh] flex-1 bg-bg grid-bg">
              {viewable ? <Suspense fallback={<Spinner className="p-4" />}><ModelViewer url={`/api/assets/${a.id}/file`} name={a.original_name} /></Suspense> : a.mime.startsWith("image/") ? <img src={`/api/assets/${a.id}/file`} alt={a.original_name} className="mx-auto max-h-[60vh]" /> : <EmptyState title="No in-browser preview for this format">STEP, FCStd, blend and DXF open in FreeCAD or Blender. Use the buttons above if they're installed.</EmptyState>}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default function EngineeringLab() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "docs";
  return (
    <>
      <PageHeader title="Engineering Lab" icon={BrainCircuit} description="Technical documents, diagrams, calculations, experiments and 3D/CAD files." />
      <Tabs className="mb-4" value={tab} onChange={(t) => setParams({ tab: t })} tabs={[{ id: "docs", label: "Docs & diagrams", icon: FileText }, { id: "calc", label: "Calculator", icon: Calculator }, { id: "experiments", label: "Experiments", icon: FlaskConical }, { id: "models", label: "3D & CAD", icon: Box }]} />
      {tab === "docs" && <Docs />}
      {tab === "calc" && <CalculatorTab />}
      {tab === "experiments" && <Experiments />}
      {tab === "models" && <Models />}
      <ErrorNote error={null} />
    </>
  );
}
