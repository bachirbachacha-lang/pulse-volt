import { useEffect, useId, useState } from "react";

let ready: Promise<typeof import("mermaid").default> | null = null;
function loadMermaid() {
  ready ??= import("mermaid").then((m) => {
    m.default.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict", fontFamily: "IBM Plex Sans" });
    return m.default;
  });
  return ready;
}

/** Renders Mermaid diagram source to SVG (strict security level: no scripts or clicks). */
export default function Mermaid({ code }: { code: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState("");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const m = await loadMermaid();
        const { svg } = await m.render(`m${id}${Date.now()}`, code);
        if (alive) (setSvg(svg), setErr(null));
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message.split("\n")[0] : "Diagram error");
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [code, id]);
  if (err) return <p className="rounded-lg border border-danger/30 bg-danger/10 p-2 font-mono text-xs text-danger">{err}</p>;
  return <div className="overflow-x-auto [&_svg]:mx-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
