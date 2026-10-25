import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, Play, Plus, Trash2, Workflow, XCircle } from "lucide-react";
import { useState } from "react";
import { useProjects } from "../components/forms";
import { Modal, useAction, useConfirm } from "../components/ui/overlay";
import { Badge, Button, Card, CardHeader, cx, EmptyState, ErrorNote, Field, Input, PageHeader, Planned, Select, Spinner } from "../components/ui/primitives";
import { del, get, patch, post } from "../lib/api";
import { ago, dateTime } from "../lib/format";

const describeSchedule = (s: any) => (s.type === "manual" ? "Manual only" : s.type === "interval" ? `Every ${s.minutes >= 60 && s.minutes % 60 === 0 ? `${s.minutes / 60} h` : `${s.minutes} min`}` : `Daily at ${s.time}`);

function StatusIcon({ status }: { status: string | null }) {
  if (status === "running" || status === "queued") return <Loader2 className="size-4 animate-spin text-accent" aria-label={status} />;
  if (status === "succeeded") return <CheckCircle2 className="size-4 text-ok" aria-label="succeeded" />;
  if (status === "failed") return <XCircle className="size-4 text-danger" aria-label="failed" />;
  return <Clock className="size-4 text-muted" aria-label="not run yet" />;
}

function NewAutomation({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const kinds = useQuery({ queryKey: ["automation-kinds"], queryFn: () => get<any[]>("/api/automations/kinds"), enabled: open });
  const ws = useQuery({ queryKey: ["workspaces"], queryFn: () => get<any[]>("/api/workspaces"), enabled: open });
  const projects = useProjects();
  const [f, setF] = useState<any>({ name: "", kind: "http_check", schedule: { type: "interval", minutes: 60 }, config: {} });
  const [err, setErr] = useState<unknown>(null);
  const scripts = useQuery({ queryKey: ["scripts", f.config.workspace_id, f.config.sub ?? ""], queryFn: () => get(`/api/workspaces/${f.config.workspace_id}/scripts?sub=${encodeURIComponent(f.config.sub ?? "")}`), enabled: open && f.kind === "script" && Boolean(f.config.workspace_id) });
  const cfg = (k: string, v: unknown) => setF({ ...f, config: { ...f.config, [k]: v } });
  const save = async () => {
    setErr(null);
    let confirmed = false;
    if (f.kind === "script") {
      const cmd = scripts.data?.scripts.find((s: any) => s.name === f.config.script)?.command;
      confirmed = await confirm({ title: "Approve this script to run automatically?", body: <><p>Atlas will run <code>npm run {f.config.script}</code> ({describeSchedule(f.schedule).toLowerCase()}):</p><pre className="mt-2 overflow-x-auto rounded-lg bg-bg p-2 text-xs">{cmd}</pre><p className="mt-2">If the script's command changes later, Atlas blocks it until you re-approve.</p></>, confirmLabel: "Approve" });
      if (!confirmed) return;
    }
    try {
      await post("/api/automations", f, confirmed);
      qc.invalidateQueries({ queryKey: ["automations"] });
      onClose();
      setF({ name: "", kind: "http_check", schedule: { type: "interval", minutes: 60 }, config: {} });
    } catch (e) {
      setErr(e);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="New automation" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!f.name.trim()} onClick={save}>Create</Button></>}>
      <div className="space-y-4">
        <Field label="Name" htmlFor="a-name"><Input id="a-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Check my store is online" /></Field>
        <Field label="What should it do?" htmlFor="a-kind"><Select id="a-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value, config: {} })}>{(kinds.data ?? []).map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</Select></Field>
        {f.kind === "http_check" && <Field label="Website address" htmlFor="a-url"><Input id="a-url" value={f.config.url ?? ""} onChange={(e) => cfg("url", e.target.value)} placeholder="https://your-store.com" /></Field>}
        {f.kind === "backup" && <Field label="How many backups to keep" htmlFor="a-keep"><Input id="a-keep" type="number" value={f.config.keep ?? 14} onChange={(e) => cfg("keep", Number(e.target.value))} /></Field>}
        {(f.kind === "git_snapshot" || f.kind === "script") && (
          <>
            <Field label="Workspace" htmlFor="a-ws"><Select id="a-ws" value={f.config.workspace_id ?? ""} onChange={(e) => cfg("workspace_id", Number(e.target.value) || undefined)}><option value="">Choose…</option>{(ws.data ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
            <Field label="Folder inside it (optional)" htmlFor="a-sub"><Input id="a-sub" value={f.config.sub ?? ""} onChange={(e) => cfg("sub", e.target.value)} /></Field>
          </>
        )}
        {f.kind === "script" && f.config.workspace_id && (
          <Field label="Script" htmlFor="a-script">
            {scripts.data?.scripts?.length ? <Select id="a-script" value={f.config.script ?? ""} onChange={(e) => cfg("script", e.target.value)}><option value="">Choose…</option>{scripts.data.scripts.map((s: any) => <option key={s.name} value={s.name}>{s.name}: {s.command}</option>)}</Select> : <p className="text-sm text-muted">No package.json scripts in that folder.</p>}
          </Field>
        )}
        {f.kind === "ai_digest" && (
          <Field label="Project (optional)" htmlFor="a-proj" hint="Needs an AI provider. The summary is saved as a note in the Knowledge Vault."><Select id="a-proj" value={f.config.project_id ?? ""} onChange={(e) => cfg("project_id", Number(e.target.value) || null)}><option value="">All projects</option>{(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="When" htmlFor="a-sched">
            <Select id="a-sched" value={f.schedule.type} onChange={(e) => setF({ ...f, schedule: e.target.value === "interval" ? { type: "interval", minutes: 60 } : e.target.value === "daily" ? { type: "daily", time: "08:00" } : { type: "manual" } })}>
              <option value="interval">Repeat every…</option><option value="daily">Every day at…</option><option value="manual">Only when I press Run</option>
            </Select>
          </Field>
          {f.schedule.type === "interval" && <Field label="Minutes (min 5)" htmlFor="a-min"><Input id="a-min" type="number" min={5} value={f.schedule.minutes} onChange={(e) => setF({ ...f, schedule: { type: "interval", minutes: Number(e.target.value) } })} /></Field>}
          {f.schedule.type === "daily" && <Field label="Time" htmlFor="a-time"><Input id="a-time" type="time" value={f.schedule.time} onChange={(e) => setF({ ...f, schedule: { type: "daily", time: e.target.value } })} /></Field>}
        </div>
        <p className="text-xs text-muted">Automations run only while Atlas is running on your computer.</p>
        <ErrorNote error={err} />
      </div>
    </Modal>
  );
}

export default function Automation() {
  const qc = useQueryClient();
  const act = useAction();
  const confirm = useConfirm();
  const autos = useQuery({ queryKey: ["automations"], queryFn: () => get<any[]>("/api/automations"), refetchInterval: 5000 });
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: () => get<any[]>("/api/jobs?limit=60"), refetchInterval: 3000 });
  const [openJob, setOpenJob] = useState<number | null>(null);
  const job = useQuery({ queryKey: ["job", openJob], queryFn: () => get(`/api/jobs/${openJob}`), enabled: Boolean(openJob), refetchInterval: (q) => (["queued", "running"].includes(q.state.data?.status) ? 1000 : false) });
  const [newOpen, setNewOpen] = useState(false);
  const refresh = () => (qc.invalidateQueries({ queryKey: ["automations"] }), qc.invalidateQueries({ queryKey: ["jobs"] }));
  return (
    <>
      <PageHeader title="Automation Center" icon={Workflow} description="Scheduled tasks and background jobs, with full logs." actions={<Button variant="primary" icon={Plus} onClick={() => setNewOpen(true)}>New automation</Button>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader title="Automations" />
          {autos.isLoading ? <Spinner className="p-4" /> : !autos.data?.length ? <EmptyState icon={Workflow} title="No automations" /> : (
            <ul className="divide-y divide-line">
              {autos.data.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <StatusIcon status={a.last_status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted">{describeSchedule(a.schedule)} · last run {ago(a.last_run_at)}{a.enabled && a.next_run_at ? ` · next ${ago(a.next_run_at)}` : ""}</p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-fg-2">
                    <input type="checkbox" checked={a.enabled} onChange={(e) => act(async () => (await patch(`/api/automations/${a.id}`, { enabled: e.target.checked }), refresh()))} className="accent-[var(--color-accent)]" />
                    On
                  </label>
                  <Button size="sm" icon={Play} onClick={() => act(async () => { const r = await post(`/api/automations/${a.id}/run`); refresh(); setOpenJob(r.job_id); }, "Started")}>Run now</Button>
                  <Button size="icon-sm" variant="ghost" icon={Trash2} aria-label={`Delete ${a.name}`} onClick={async () => { if (await confirm({ title: `Delete “${a.name}”?`, danger: true, confirmLabel: "Delete" })) act(async () => (await del(`/api/automations/${a.id}`), refresh()), "Deleted"); }} />
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line p-4 text-xs text-muted">
            <p className="mb-1 font-medium text-fg-2">Coming later</p>
            <div className="flex flex-wrap gap-2"><span>Send WhatsApp/email notifications <Planned /></span><span>Shopify order alerts <Planned /></span><span>Trigger on file change <Planned /></span></div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Job history" subtitle="Includes AI image generation and backups" />
          <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
            {(jobs.data ?? []).map((j) => (
              <li key={j.id}>
                <button onClick={() => setOpenJob(j.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-hover/60">
                  <StatusIcon status={j.status} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm">{j.title}</span><span className={cx("block truncate text-xs", j.error ? "text-danger" : "text-muted")}>{j.error ?? `${j.kind} · ${ago(j.created_at)}`}</span></span>
                </button>
              </li>
            ))}
            {!jobs.data?.length && <p className="p-4 text-sm text-muted">No jobs yet.</p>}
          </ul>
        </Card>
      </div>
      <NewAutomation open={newOpen} onClose={() => setNewOpen(false)} />
      <Modal open={Boolean(openJob)} onClose={() => setOpenJob(null)} title={job.data?.title ?? "Job"} wide footer={job.data && ["queued", "running"].includes(job.data.status) ? <Button onClick={() => act(async () => (await post(`/api/jobs/${openJob}/cancel`), refresh()))}>Cancel job</Button> : undefined}>
        {!job.data ? <Spinner /> : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs"><Badge tone={job.data.status === "succeeded" ? "ok" : job.data.status === "failed" ? "danger" : "accent"}>{job.data.status}</Badge><span className="text-muted">Started {dateTime(job.data.started_at)} · finished {dateTime(job.data.finished_at)}</span></div>
            {job.data.error && <pre className="whitespace-pre-wrap rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">{job.data.error}</pre>}
            <pre className="max-h-[50vh] overflow-auto rounded-lg bg-bg p-3 font-mono text-xs leading-5">{job.data.log || "No log output."}</pre>
            {job.data.result && <pre className="overflow-x-auto rounded-lg bg-bg p-3 font-mono text-xs text-fg-2">{JSON.stringify(job.data.result, null, 2)}</pre>}
          </div>
        )}
      </Modal>
    </>
  );
}
