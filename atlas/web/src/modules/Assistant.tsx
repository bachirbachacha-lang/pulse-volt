import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Chat } from "../components/Chat";
import { useProjects } from "../components/forms";
import { useAction, useConfirm } from "../components/ui/overlay";
import { Badge, Button, Card, cx, Input, Select } from "../components/ui/primitives";
import { del, get, patch } from "../lib/api";
import { ago } from "../lib/format";

export default function Assistant() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const convId = id ? Number(id) : null;
  const nav = useNavigate();
  const qc = useQueryClient();
  const act = useAction();
  const confirm = useConfirm();
  const projects = useProjects();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["conversations"], queryFn: () => get<any[]>("/api/conversations") });
  const current = list.data?.find((c) => c.id === convId);
  const attachWs = Number(params.get("attach_ws"));
  const attachPath = params.get("attach_path");
  const initialAttachments = useMemo(() => (attachWs && attachPath ? [{ kind: "file" as const, workspace_id: attachWs, path: attachPath, label: attachPath }] : undefined), [attachWs, attachPath]);
  // Keep the same Chat instance when a new chat gets its id mid-stream; remount only on real navigation.
  const justCreated = useRef<number | null>(null);
  const [chatKey, setChatKey] = useState(() => String(convId ?? "new"));
  useEffect(() => {
    if (convId !== null && convId === justCreated.current) return;
    justCreated.current = null;
    setChatKey(`${convId ?? "new"}-${projectId ?? ""}-${Date.now()}`);
  }, [convId, projectId]);

  const remove = async (c: any) => {
    if (await confirm({ title: "Delete chat?", body: <>“{c.title}” and its messages will be deleted.</>, confirmLabel: "Delete", danger: true })) {
      await act(() => del(`/api/conversations/${c.id}`), "Chat deleted");
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (c.id === convId) nav("/assistant");
    }
  };

  return (
    <div className="grid h-[calc(100dvh-7.5rem)] gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="hidden min-h-0 flex-col lg:flex">
        <div className="border-b border-line p-3"><Button variant="primary" icon={MessageSquarePlus} className="w-full" onClick={() => nav("/assistant")}>New chat</Button></div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {(list.data ?? []).map((c) => (
            <li key={c.id}>
              <Link to={`/assistant/${c.id}`} className={cx("block rounded-lg px-3 py-2 text-sm", c.id === convId ? "bg-accent-soft text-fg" : "text-fg-2 hover:bg-hover")}>
                <span className="block truncate">{c.title}</span>
                <span className="block truncate text-xs text-muted">{c.project_name ? `${c.project_name} · ` : ""}{ago(c.updated_at)}</span>
              </Link>
            </li>
          ))}
          {!list.data?.length && <p className="p-3 text-sm text-muted">Your chats are saved here.</p>}
        </ul>
      </Card>

      <Card className="flex min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
          <Bot className="size-4 text-accent" aria-hidden />
          {current && renaming !== null ? (
            <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); void act(async () => (await patch(`/api/conversations/${current.id}`, { title: renaming }), qc.invalidateQueries({ queryKey: ["conversations"] }), setRenaming(null))); }}>
              <Input autoFocus value={renaming} onChange={(e) => setRenaming(e.target.value)} className="h-8" aria-label="Chat title" />
              <Button size="sm" type="submit">Save</Button>
            </form>
          ) : (
            <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{current?.title ?? "New chat"}</h1>
          )}
          {current ? (
            <>
              {current.project_name ? <Badge tone="accent">{current.project_name}</Badge> : null}
              <Button variant="ghost" size="icon-sm" icon={Pencil} aria-label="Rename chat" onClick={() => setRenaming(current.title)} />
              <Button variant="ghost" size="icon-sm" icon={Trash2} aria-label="Delete chat" onClick={() => remove(current)} />
            </>
          ) : (
            <Select aria-label="Project context" value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value) || null)} className="h-8 w-auto max-w-[220px] py-0 text-xs">
              <option value="">No project context</option>
              {(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>Context: {p.name}</option>)}
            </Select>
          )}
          <Button variant="ghost" size="sm" className="lg:hidden" icon={MessageSquarePlus} onClick={() => nav("/assistant")}>New</Button>
        </div>
        <div className="min-h-0 flex-1">
          <Chat key={chatKey} conversationId={convId} projectId={current?.project_id ?? projectId} initialMessage={params.get("q") ?? undefined} initialAttachments={initialAttachments} onConversation={(cid) => { justCreated.current = cid; nav(`/assistant/${cid}`, { replace: true }); }} />
        </div>
      </Card>
    </div>
  );
}
