import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, Cpu, HardDrive, Info, MemoryStick, RefreshCw, ScrollText, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { Gauge, LineChart } from "../components/ui/charts";
import { Badge, Button, Card, CardHeader, cx, EmptyState, PageHeader, ProgressBar, Select, Spinner, Stat, Tabs } from "../components/ui/primitives";
import { get } from "../lib/api";
import { ago, bytes, duration } from "../lib/format";

function Metrics() {
  const { data, isLoading } = useQuery({ queryKey: ["metrics"], queryFn: () => get("/api/system/metrics"), refetchInterval: 2500 });
  if (isLoading || !data) return <Spinner />;
  const memPct = (data.memory.used / data.memory.total) * 100;
  const hist = data.history as { ts: number; cpu: number; memUsed: number }[];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Computer" value={<span className="text-sm">{data.host.hostname}</span>} hint={`${data.host.platform} ${data.host.arch}`} />
        <Stat label="Uptime" value={duration(data.host.uptimeSec)} />
        <Stat label="Atlas database" value={bytes(data.atlas.dbSize)} hint={`Uploads ${bytes(data.atlas.uploadsSize)}`} />
        <Stat label="Atlas server" value={bytes(data.process.rss)} hint={`Node ${data.process.node} · up ${duration(data.process.uptimeSec)}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="CPU" icon={Cpu} subtitle={`${data.cpu.model} · ${data.cpu.cores} cores`} />
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-6">
              <Gauge value={data.cpu.usage} label="CPU usage" size={96} />
              {data.cpu.loadAvg && <div className="text-sm"><p className="text-muted">Load average (1, 5, 15 min)</p><p className="font-mono">{data.cpu.loadAvg.map((l: number) => l.toFixed(2)).join("  ")}</p></div>}
            </div>
            {hist.length > 1 && <LineChart x={hist.map((h) => new Date(h.ts).toLocaleTimeString())} series={[{ name: "CPU %", color: "var(--color-series-1)", values: hist.map((h) => h.cpu) }]} height={160} format={(v) => `${v.toFixed(0)}%`} xFormat={(s) => s} />}
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {data.cpu.perCore.map((c: number, i: number) => (
                <div key={i} className="space-y-1" title={`Core ${i + 1}: ${c}%`}>
                  <ProgressBar value={c} label={`Core ${i + 1}`} tone={c > 90 ? "danger" : c > 70 ? "warn" : "accent"} />
                  <p className="text-center font-mono text-[10px] text-muted">{Math.round(c)}%</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Memory" icon={MemoryStick} subtitle={`${bytes(data.memory.used)} of ${bytes(data.memory.total)} in use`} />
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-6"><Gauge value={memPct} label="Memory usage" size={96} /><p className="text-sm text-muted">{bytes(data.memory.free)} free</p></div>
            {hist.length > 1 && <LineChart x={hist.map((h) => new Date(h.ts).toLocaleTimeString())} series={[{ name: "Memory used", color: "var(--color-series-2)", values: hist.map((h) => h.memUsed / 1024 ** 3) }]} height={160} format={(v) => `${v.toFixed(1)} GB`} />}
            {data.memory.note && <p className="flex gap-2 text-xs text-muted"><Info className="size-3.5 shrink-0" />{data.memory.note}</p>}
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader title="Disks" icon={HardDrive} />
        <ul className="divide-y divide-line">
          {data.disks.map((d: any) => (
            <li key={d.path} className="space-y-1.5 px-4 py-3">
              <div className="flex justify-between gap-2 text-sm"><span className="truncate">{d.label} <span className="font-mono text-xs text-muted">{d.path}</span></span><span className="shrink-0 font-mono text-xs">{bytes(d.free)} free of {bytes(d.total)}</span></div>
              <ProgressBar value={(d.used / d.total) * 100} label={`${d.label} disk usage`} tone={d.used / d.total > 0.9 ? "danger" : d.used / d.total > 0.8 ? "warn" : "accent"} />
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Not available" subtitle="Shown so nothing looks measured when it isn't" />
        <ul className="divide-y divide-line text-sm">{data.unsupported.map((u: any) => <li key={u.metric} className="flex flex-wrap gap-2 px-4 py-2.5"><span className="font-medium">{u.metric}</span><span className="text-muted">{u.reason}</span></li>)}</ul>
      </Card>
    </div>
  );
}

function Security() {
  const { data, isLoading, refetch, isFetching } = useQuery({ queryKey: ["security"], queryFn: () => get("/api/system/security") });
  if (isLoading) return <Spinner />;
  const icon = { pass: <CheckCircle2 className="size-5 text-ok" aria-label="pass" />, warn: <AlertTriangle className="size-5 text-warn" aria-label="warning" />, fail: <XCircle className="size-5 text-danger" aria-label="problem" />, info: <Info className="size-5 text-info" aria-label="info" /> };
  const counts = (data.checks as any[]).reduce((a: Record<string, number>, c: any) => ((a[c.status] = (a[c.status] ?? 0) + 1), a), {});
  return (
    <Card>
      <CardHeader title="Security review" icon={ShieldCheck} subtitle={`Checked ${ago(data.checkedAt)}`} actions={<div className="flex items-center gap-2">{counts.fail ? <Badge tone="danger">{counts.fail} problem(s)</Badge> : null}{counts.warn ? <Badge tone="warn">{counts.warn} warning(s)</Badge> : null}<Button size="sm" icon={RefreshCw} loading={isFetching} onClick={() => refetch()}>Re-check</Button></div>} />
      <ul className="divide-y divide-line">
        {data.checks.map((c: any) => (
          <li key={c.id} className="flex gap-3 px-4 py-3">
            {icon[c.status as keyof typeof icon]}
            <div className="min-w-0">
              <p className="text-sm font-medium">{c.title}</p>
              <p className="text-sm text-muted">{c.detail}</p>
              {c.fix && <p className="mt-1 text-xs text-fg-2">Fix: {c.fix}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Logs() {
  const [level, setLevel] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["logs", level], queryFn: () => get<any[]>(`/api/system/logs${level ? `?level=${level}` : ""}`), refetchInterval: 10_000 });
  return (
    <Card>
      <CardHeader title="Application log" icon={ScrollText} subtitle="Errors from AI providers, jobs and the server" actions={<Select aria-label="Filter level" value={level} onChange={(e) => setLevel(e.target.value)} className="h-8 w-auto py-0 text-xs"><option value="">All</option><option value="error">Errors</option><option value="warn">Warnings</option><option value="info">Info</option></Select>} />
      {isLoading ? <Spinner className="p-4" /> : !data?.length ? <EmptyState icon={CheckCircle2} title="Nothing logged">No errors so far.</EmptyState> : (
        <ul className="max-h-[65vh] divide-y divide-line overflow-y-auto font-mono text-xs">
          {data.map((l) => <li key={l.id} className="flex gap-3 px-4 py-2"><span className="shrink-0 text-muted">{new Date(l.ts).toLocaleString()}</span><span className={cx("w-12 shrink-0", l.level === "error" ? "text-danger" : l.level === "warn" ? "text-warn" : "text-info")}>{l.level}</span><span className="shrink-0 text-fg-2">{l.source}</span><span className="min-w-0 break-words">{l.message}</span></li>)}
        </ul>
      )}
    </Card>
  );
}

export default function SystemMonitor() {
  const [tab, setTab] = useState<"metrics" | "security" | "logs">("metrics");
  return (
    <>
      <PageHeader title="System Monitor" icon={Activity} description="Live numbers read from this computer, a security review, and logs." />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: "metrics", label: "Metrics", icon: Cpu }, { id: "security", label: "Security", icon: ShieldCheck }, { id: "logs", label: "Logs", icon: ScrollText }]} />
      {tab === "metrics" && <Metrics />}
      {tab === "security" && <Security />}
      {tab === "logs" && <Logs />}
    </>
  );
}
