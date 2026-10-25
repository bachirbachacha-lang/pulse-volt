import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, PenTool, ImagePlus, LayoutTemplate, Loader2, Palette, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useProjects } from "../components/forms";
import { Uploader } from "../components/Uploader";
import { Modal, useAction, useConfirm } from "../components/ui/overlay";
import { Badge, Button, Card, CardHeader, cx, EmptyState, ErrorNote, Field, Input, NeedsSetup, PageHeader, Planned, Select, Spinner, Textarea } from "../components/ui/primitives";
import { del, get, patch, post } from "../lib/api";
import { ago, bytes } from "../lib/format";

const KINDS = { moodboard: "Moodboard", references: "References", "ui-concept": "UI concept", assets: "Asset collection" } as const;

function BoardModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const projects = useProjects();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", kind: "moodboard", description: "", project_id: "" as number | "" });
  const [err, setErr] = useState<unknown>(null);
  const save = async () => {
    try {
      const b = await post("/api/boards", { ...f, project_id: f.project_id || null });
      qc.invalidateQueries({ queryKey: ["boards"] });
      onCreated(b.id);
      setF({ name: "", kind: "moodboard", description: "", project_id: "" });
      onClose();
    } catch (e) {
      setErr(e);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="New board" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!f.name.trim()} onClick={save}>Create</Button></>}>
      <div className="space-y-4">
        <Field label="Name" htmlFor="b-name"><Input id="b-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Winter store mood" /></Field>
        <Field label="Type" htmlFor="b-kind"><Select id="b-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Project" htmlFor="b-proj"><Select id="b-proj" value={f.project_id} onChange={(e) => setF({ ...f, project_id: Number(e.target.value) || "" })}><option value="">None</option>{(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="Notes" htmlFor="b-desc"><Textarea id="b-desc" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Direction, colours, what to avoid…" /></Field>
        <ErrorNote error={err} />
      </div>
    </Modal>
  );
}

function GenerateModal({ open, onClose, boardId, configured }: { open: boolean; onClose: () => void; boardId: number | null; configured: boolean }) {
  const act = useAction();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [jobId, setJobId] = useState<number | null>(null);
  const job = useQuery({ queryKey: ["job", jobId], queryFn: () => get(`/api/jobs/${jobId}`), enabled: Boolean(jobId), refetchInterval: (q) => (["queued", "running"].includes(q.state.data?.status) ? 1500 : false) });
  useEffect(() => {
    if (job.data?.status === "succeeded") qc.invalidateQueries({ queryKey: ["assets"] });
  }, [job.data?.status, qc]);
  const running = job.data && ["queued", "running"].includes(job.data.status);
  return (
    <Modal open={open} onClose={() => (setJobId(null), onClose())} title="Generate an image" footer={<><Button variant="ghost" onClick={() => (setJobId(null), onClose())}>Close</Button><Button variant="primary" icon={Sparkles} disabled={!configured || prompt.trim().length < 3 || Boolean(running)} loading={Boolean(running)} onClick={async () => { const r = await act(() => post("/api/design/generate", { prompt, size, board_id: boardId })); if (r) setJobId(r.job_id); }}>Generate</Button></>}>
      <div className="space-y-4">
        {!configured && <p className="rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm text-warn">Needs <code>OPENAI_API_KEY</code> in <code>atlas/.env</code>. <Link to="/integrations" className="underline">Setup steps</Link></p>}
        <Field label="Describe the image" htmlFor="g-prompt" hint="Generated images are saved with an “ai-generated” tag so they're never mistaken for real photos."><Textarea id="g-prompt" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} /></Field>
        <Field label="Shape" htmlFor="g-size"><Select id="g-size" value={size} onChange={(e) => setSize(e.target.value)}><option value="1024x1024">Square</option><option value="1536x1024">Landscape</option><option value="1024x1536">Portrait (stories)</option></Select></Field>
        {job.data && (
          <p className={cx("text-sm", job.data.status === "failed" ? "text-danger" : "text-fg-2")}>
            {running ? <><Loader2 className="mr-1 inline size-4 animate-spin" />Generating… (runs in the background, you can close this)</> : job.data.status === "succeeded" ? "Done. Added to the board." : `Failed: ${job.data.error}`}
          </p>
        )}
      </div>
    </Modal>
  );
}

function AssetCard({ a, boards, onChange }: { a: any; boards: any[]; onChange: () => void }) {
  const act = useAction();
  const confirm = useConfirm();
  const [tags, setTags] = useState(a.tags);
  const isImg = a.mime.startsWith("image/");
  return (
    <figure className="group overflow-hidden rounded-xl border border-line bg-surface">
      <a href={`/api/assets/${a.id}/file`} target="_blank" rel="noreferrer" className="block aspect-square bg-bg grid-bg">
        {isImg ? <img src={`/api/assets/${a.id}/file`} alt={a.note || a.original_name} loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs text-muted">{a.original_name.split(".").pop()?.toUpperCase()}</div>}
      </a>
      <figcaption className="space-y-1.5 p-2">
        <div className="flex items-center gap-1">
          <p className="min-w-0 flex-1 truncate text-xs" title={a.original_name}>{a.original_name}</p>
          {a.source === "ai-generated" && <Badge tone="gold">AI</Badge>}
        </div>
        <input value={tags} onChange={(e) => setTags(e.target.value)} onBlur={() => tags !== a.tags && act(async () => (await patch(`/api/assets/${a.id}`, { tags }), onChange()))} placeholder="tags" aria-label={`Tags for ${a.original_name}`} className="h-7 w-full rounded-md border border-line bg-bg px-2 text-xs focus:border-accent/60 focus:outline-none" />
        <div className="flex items-center gap-1">
          <select value={a.board_id ?? ""} onChange={(e) => act(async () => (await patch(`/api/assets/${a.id}`, { board_id: Number(e.target.value) || null }), onChange()))} aria-label="Move to board" className="h-7 min-w-0 flex-1 rounded-md border border-line bg-bg px-1 text-[11px] text-fg-2">
            <option value="">No board</option>
            {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <a href={`/api/assets/${a.id}/file?download=1`} aria-label="Download" className="grid size-7 place-items-center rounded-md text-muted hover:bg-hover hover:text-fg"><Download className="size-3.5" /></a>
          <button aria-label={`Delete ${a.original_name}`} className="grid size-7 place-items-center rounded-md text-muted hover:bg-hover hover:text-danger" onClick={async () => { if (await confirm({ title: "Delete file?", body: `${a.original_name} (${bytes(a.size)}) will be deleted permanently.`, danger: true, confirmLabel: "Delete" })) act(async () => (await del(`/api/assets/${a.id}`), onChange()), "Deleted"); }}><Trash2 className="size-3.5" /></button>
        </div>
      </figcaption>
    </figure>
  );
}

export default function DesignStudio() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const act = useAction();
  const confirm = useConfirm();
  const boards = useQuery({ queryKey: ["boards"], queryFn: () => get<any[]>("/api/boards") });
  const integrations = useQuery({ queryKey: ["integrations"], queryFn: () => get<any[]>("/api/integrations") });
  const boardParam = params.get("board");
  const boardId = boardParam === "none" ? null : Number(boardParam) || null;
  const [q, setQ] = useState("");
  const assets = useQuery({ queryKey: ["assets", "design", boardParam ?? "all", q], queryFn: () => get<any[]>(`/api/assets?area=design${boardParam ? `&board_id=${boardParam}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`) });
  const [boardOpen, setBoardOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const board = boards.data?.find((b) => b.id === boardId);
  const openaiReady = integrations.data?.find((i) => i.id === "openai")?.status === "configured";
  const figma = integrations.data?.find((i) => i.id === "figma");
  const refresh = () => (qc.invalidateQueries({ queryKey: ["assets"] }), qc.invalidateQueries({ queryKey: ["boards"] }));

  return (
    <>
      <PageHeader
        title="Design Studio"
        icon={Palette}
        description="Moodboards, references, UI concepts and every design file in one place."
        actions={<><Button icon={Sparkles} onClick={() => setGenOpen(true)}>Generate image {!openaiReady && <NeedsSetup what="Needs OPENAI_API_KEY" />}</Button><Button variant="primary" icon={Plus} onClick={() => setBoardOpen(true)}>New board</Button></>}
      />
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Boards" icon={LayoutTemplate} />
            <ul className="p-2">
              {[{ id: "", label: "All files" }, { id: "none", label: "Unsorted" }].map((x) => (
                <li key={x.id}><button onClick={() => setParams(x.id ? { board: x.id } : {})} className={cx("w-full rounded-lg px-3 py-2 text-left text-sm", (boardParam ?? "") === x.id ? "bg-accent-soft text-fg" : "text-fg-2 hover:bg-hover")}>{x.label}</button></li>
              ))}
              {(boards.data ?? []).map((b) => (
                <li key={b.id}>
                  <button onClick={() => setParams({ board: String(b.id) })} className={cx("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm", boardId === b.id ? "bg-accent-soft text-fg" : "text-fg-2 hover:bg-hover")}>
                    <span className="min-w-0 flex-1 truncate">{b.name}</span>
                    <span className="text-xs text-muted">{b.asset_count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Design tools" />
            <ul className="space-y-2 p-3 text-sm">
              <li className="flex items-center gap-2"><Sparkles className="size-4 text-muted" /> <span className="flex-1">Image generation</span>{openaiReady ? <Badge tone="ok">Ready</Badge> : <NeedsSetup what="OPENAI_API_KEY" />}</li>
              <li className="flex items-center gap-2"><PenTool className="size-4 text-muted" /> <span className="flex-1">Figma import</span>{figma?.status === "configured" ? <Badge tone="accent">Token set</Badge> : <Planned />}</li>
              <li className="flex items-center gap-2"><ImagePlus className="size-4 text-muted" /> <span className="flex-1">Canva / CapCut</span><Planned label="Export only" /></li>
            </ul>
            <p className="px-3 pb-3 text-xs text-muted">Atlas organises files; keep designing in the tools you already use and upload exports here.</p>
          </Card>
        </div>

        <Card>
          <CardHeader
            title={board ? board.name : boardParam === "none" ? "Unsorted files" : "All design files"}
            subtitle={board ? `${KINDS[board.kind as keyof typeof KINDS]}${board.project_name ? ` · ${board.project_name}` : ""} · created ${ago(board.created_at)}` : undefined}
            actions={
              <div className="flex items-center gap-2">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or tag" className="h-8 w-40 text-xs" aria-label="Search files" />
                {board && <Button variant="ghost" size="icon-sm" icon={Trash2} aria-label="Delete board" onClick={async () => { if (await confirm({ title: `Delete board “${board.name}”?`, body: "The files stay in All files.", danger: true, confirmLabel: "Delete board" })) { await act(() => del(`/api/boards/${board.id}`), "Board deleted"); setParams({}); refresh(); } }} />}
              </div>
            }
          />
          <div className="space-y-4 p-4">
            {board?.description && <p className="whitespace-pre-wrap rounded-lg border border-line bg-surface p-3 text-sm text-fg-2">{board.description}</p>}
            <Uploader query={`area=design${boardId ? `&board_id=${boardId}` : ""}`} accept="image/*,.pdf,.svg,.mp4,.webm" onDone={refresh} label="Drop images, PDFs or videos here, or tap to choose" />
            {assets.isLoading ? <Spinner /> : assets.data?.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{assets.data.map((a) => <AssetCard key={a.id} a={a} boards={boards.data ?? []} onChange={refresh} />)}</div>
            ) : <EmptyState icon={ImagePlus} title="No files here yet">Upload references, screenshots, logos or exports.</EmptyState>}
          </div>
        </Card>
      </div>
      <BoardModal open={boardOpen} onClose={() => setBoardOpen(false)} onCreated={(id) => setParams({ board: String(id) })} />
      <GenerateModal open={genOpen} onClose={() => setGenOpen(false)} boardId={boardId} configured={Boolean(openaiReady)} />
    </>
  );
}
