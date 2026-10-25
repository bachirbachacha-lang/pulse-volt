import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Plug, Zap } from "lucide-react";
import { useState } from "react";
import { useToast } from "../components/ui/overlay";
import { Badge, Button, Card, PageHeader, Spinner, type Tone } from "../components/ui/primitives";
import { post, get } from "../lib/api";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  connected: { label: "Connected", tone: "ok" },
  configured: { label: "Key added", tone: "accent" },
  not_configured: { label: "Needs setup", tone: "warn" },
  not_installed: { label: "Not installed", tone: "neutral" },
  planned: { label: "Planned", tone: "neutral" },
  error: { label: "Error", tone: "danger" },
};

export default function Integrations() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["integrations"], queryFn: () => get<any[]>("/api/integrations") });
  const toast = useToast();
  const [testing, setTesting] = useState<string | null>(null);
  const test = async (id: string) => {
    setTesting(id);
    try {
      const r = await post(`/api/integrations/${id}/test`);
      toast(r.message, r.ok ? "ok" : "error");
      refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Test failed", "error");
    } finally {
      setTesting(null);
    }
  };
  if (isLoading) return <Spinner />;
  const groups = [...new Set((data ?? []).map((i) => i.category))];
  return (
    <>
      <PageHeader title="Integrations" icon={Plug} description="What Atlas is connected to, and how to connect the rest." />
      <Card className="mb-5 p-4 text-sm text-fg-2">
        <p className="mb-2 font-medium text-fg">How to add a key</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>In the <code>atlas</code> folder, copy <code>.env.example</code> to a new file called <code>.env</code>.</li>
          <li>Paste the key after the matching name, e.g. <code>ANTHROPIC_API_KEY=sk-ant-…</code>. Never paste keys into a chat.</li>
          <li>Restart Atlas, then press <b>Test</b> below.</li>
        </ol>
        <p className="mt-2 text-xs text-muted">Keys stay on your computer: the server reads them, the browser never sees them.</p>
      </Card>
      {groups.map((g) => (
        <section key={g} className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{g}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data!.filter((i) => i.category === g).map((i) => (
              <Card key={i.id} className="flex flex-col p-4">
                <div className="flex items-start gap-2">
                  <h3 className="flex-1 font-medium">{i.name}</h3>
                  <Badge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{i.detail}</p>
                {i.usedBy.length > 0 && <p className="mt-2 text-xs text-fg-2">Used by: {i.usedBy.join(", ")}</p>}
                {i.envVars.length > 0 && <p className="mt-1 font-mono text-[11px] text-muted">{i.envVars.join("  ")}</p>}
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  {i.testable && <Button size="sm" icon={Zap} loading={testing === i.id} onClick={() => test(i.id)}>Test</Button>}
                  {i.docsUrl && <a href={i.docsUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-accent hover:bg-hover"><ExternalLink className="size-3.5" />{i.status === "not_installed" ? "Get it" : "Get a key"}</a>}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
