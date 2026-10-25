import { useQuery } from "@tanstack/react-query";
import { Bot, ExternalLink, History, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get } from "../../lib/api";
import { useUI } from "../../lib/ui-state";
import { Chat } from "../Chat";
import { Badge, Button, cx, Select } from "../ui/primitives";

export function AIPanel() {
  const ui = useUI();
  const [convId, setConvId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const project = ui.contextProject;
  const history = useQuery({
    queryKey: ["conversations", "panel", project?.id ?? null],
    queryFn: () => get(project ? `/api/conversations?project_id=${project.id}` : "/api/conversations"),
    enabled: ui.aiOpen && showHistory,
  });

  // Switching project context starts a fresh chat scoped to it.
  useEffect(() => setConvId(null), [project?.id]);

  if (!ui.aiOpen) return null;
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/50 xl:hidden" onClick={() => ui.setAiOpen(false)} aria-hidden />
      <aside aria-label="AI assistant panel" className={cx("fixed inset-y-0 right-0 z-30 flex w-full max-w-[420px] flex-col border-l border-accent/30 bg-[#030f1c]/95 pt-[env(safe-area-inset-top)] shadow-[-20px_0_60px_-20px_rgb(63_224_255/0.35)] backdrop-blur-xl", "xl:static xl:z-auto xl:w-[400px] xl:shadow-none")}>
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3">
          <Bot className="size-4 text-accent" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="hud-title glow-text text-sm text-accent-strong">AI Assistant</p>
            {project ? <Badge tone="accent" className="max-w-full truncate">Context: {project.name}</Badge> : <p className="text-xs text-muted">General</p>}
          </div>
          <Button variant="ghost" size="icon-sm" icon={History} aria-label="Chat history" aria-pressed={showHistory} onClick={() => setShowHistory((v) => !v)} />
          <Button variant="ghost" size="icon-sm" icon={Plus} aria-label="New chat" onClick={() => setConvId(null)} />
          {convId && <Link to={`/assistant/${convId}`} aria-label="Open in full page" className="grid size-8 place-items-center rounded-lg text-fg-2 hover:bg-hover"><ExternalLink className="size-4" /></Link>}
          <Button variant="ghost" size="icon-sm" icon={X} aria-label="Close AI panel" onClick={() => ui.setAiOpen(false)} />
        </div>
        {showHistory && (
          <div className="border-b border-line p-3">
            <Select aria-label="Open a previous chat" value={convId ?? ""} onChange={(e) => (setConvId(Number(e.target.value) || null), setShowHistory(false))}>
              <option value="">{history.isLoading ? "Loading…" : history.data?.length ? "Open a previous chat…" : "No previous chats"}</option>
              {(history.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </div>
        )}
        <div className="min-h-0 flex-1">
          <Chat key={`${project?.id ?? "g"}`} compact conversationId={convId} projectId={project?.id ?? null} onConversation={setConvId} />
        </div>
      </aside>
    </>
  );
}
