import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DatabaseBackup, Download, Keyboard, Save, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAction } from "../components/ui/overlay";
import { Button, Card, CardHeader, Field, Input, PageHeader, Select, Spinner, Textarea } from "../components/ui/primitives";
import { get, patch, post } from "../lib/api";
import { ago, bytes } from "../lib/format";
import { useUI } from "../lib/ui-state";

export default function Settings() {
  const qc = useQueryClient();
  const act = useAction();
  const ui = useUI();
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => get("/api/settings") });
  const providers = useQuery({ queryKey: ["providers"], queryFn: () => get("/api/ai/providers") });
  const backups = useQuery({ queryKey: ["backups"], queryFn: () => get<any[]>("/api/backups") });
  const [f, setF] = useState<any>(null);
  const [backingUp, setBackingUp] = useState(false);
  useEffect(() => {
    if (settings.data && !f) setF({ userName: settings.data.userName, defaultProvider: settings.data.defaultProvider ?? "", customInstructions: settings.data.customInstructions, backupKeep: settings.data.backupKeep, models: { anthropic: settings.data.models.anthropic ?? "", openai: settings.data.models.openai ?? "", ollama: settings.data.models.ollama ?? "" } });
  }, [settings.data, f]);
  if (!f || providers.isLoading) return <Spinner />;
  const save = () => act(async () => { await patch("/api/settings", { ...f, defaultProvider: f.defaultProvider || null }); qc.invalidateQueries(); }, "Settings saved");
  const s = settings.data;
  return (
    <>
      <PageHeader title="Settings" icon={SettingsIcon} description="Preferences are stored in Atlas's local database." actions={<Button variant="primary" icon={Save} onClick={save}>Save settings</Button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="You" />
          <div className="space-y-4 p-4">
            <Field label="Your name" htmlFor="s-name" hint="Used for the Mission Control greeting."><Input id="s-name" value={f.userName} onChange={(e) => setF({ ...f, userName: e.target.value })} /></Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="AI assistant" />
          <div className="space-y-4 p-4">
            <Field label="Default provider" htmlFor="s-prov">
              <Select id="s-prov" value={f.defaultProvider} onChange={(e) => setF({ ...f, defaultProvider: e.target.value })}>
                <option value="">First one that's set up</option>
                {providers.data.providers.map((p: any) => <option key={p.id} value={p.id} disabled={!p.configured}>{p.label}{p.configured ? "" : " (not set up)"}</option>)}
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              {providers.data.providers.map((p: any) => (
                <Field key={p.id} label={`${p.label.split(" ")[0]} model`} htmlFor={`s-m-${p.id}`}>
                  <Input id={`s-m-${p.id}`} value={f.models[p.id]} onChange={(e) => setF({ ...f, models: { ...f.models, [p.id]: e.target.value } })} placeholder={p.defaultModel} list={`models-${p.id}`} className="font-mono text-xs" />
                  <datalist id={`models-${p.id}`}>{p.suggestedModels.map((m: string) => <option key={m} value={m} />)}</datalist>
                </Field>
              ))}
            </div>
            <Field label="Standing instructions" htmlFor="s-ci" hint="Added to every chat, e.g. “Reply in English and Arabic for customer messages.”"><Textarea id="s-ci" rows={4} value={f.customInstructions} onChange={(e) => setF({ ...f, customInstructions: e.target.value })} /></Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Backups" icon={DatabaseBackup} actions={<Button size="sm" icon={DatabaseBackup} loading={backingUp} onClick={async () => { setBackingUp(true); await act(() => post("/api/backups"), "Backup saved"); setBackingUp(false); backups.refetch(); }}>Back up now</Button>} />
          <div className="space-y-3 p-4">
            <Field label="Keep this many backups" htmlFor="s-keep"><Input id="s-keep" type="number" min={1} max={365} value={f.backupKeep} onChange={(e) => setF({ ...f, backupKeep: Number(e.target.value) })} className="w-28" /></Field>
            <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line">
              {(backups.data ?? []).map((b) => <li key={b.name} className="flex items-center gap-2 px-3 py-2 text-xs"><span className="min-w-0 flex-1 truncate font-mono">{b.name}</span><span className="text-muted">{bytes(b.size)} · {ago(b.created_at)}</span><a href={`/api/backups/${b.name}`} aria-label={`Download ${b.name}`} className="grid size-7 place-items-center rounded-md text-accent hover:bg-hover"><Download className="size-3.5" /></a></li>)}
              {!backups.data?.length && <li className="p-3 text-sm text-muted">No backups yet.</li>}
            </ul>
            <p className="text-xs text-muted">To restore: stop Atlas, replace <code>{s.server.dataDir}/atlas.db</code> with a backup file (rename it to atlas.db), and start Atlas again. See the README.</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Server & interface" />
          <div className="space-y-2 p-4 text-sm">
            <p>Address: <code>{s.server.host}:{s.server.port}</code>{s.server.tokenProtected ? " (token protected)" : ""}</p>
            <p>Data folder: <code className="break-all">{s.server.dataDir}</code></p>
            <p className="text-xs text-muted">Change these in <code>atlas/.env</code> (ATLAS_HOST, ATLAS_PORT, ATLAS_DATA_DIR) and restart.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" icon={Keyboard} onClick={() => ui.setHelpOpen(true)}>Keyboard shortcuts</Button>
              <Button size="sm" onClick={() => ui.setSidebarCollapsed((v) => !v)}>{ui.sidebarCollapsed ? "Expand" : "Collapse"} sidebar</Button>
            </div>
            <p className="pt-2 text-xs text-muted">Mission Control widgets: use “Customize” on Mission Control.</p>
          </div>
        </Card>
      </div>
    </>
  );
}
