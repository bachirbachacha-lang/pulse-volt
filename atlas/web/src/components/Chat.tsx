import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bot, CheckCircle2, FileText, Loader2, Paperclip, Send, Square, User, Wrench, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { get, streamChat, type ChatEvent } from "../lib/api";
import { MOD } from "./shell/AppShell";
import { Markdown } from "./ui/Markdown";
import { Modal } from "./ui/overlay";
import { Badge, Button, cx, EmptyState, Field, Input, Select, Spinner } from "./ui/primitives";

interface ToolEvent {
  id: string;
  name: string;
  status: "running" | "done" | "error";
  summary?: string;
}
interface Msg {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  tool_events?: ToolEvent[];
  attachments?: { kind: string; label: string }[];
  error?: string | null;
  pending?: boolean;
}
type Attachment = { kind: "file"; workspace_id: number; path: string; label: string } | { kind: "note"; id: number; label: string };

const TOOL_LABELS: Record<string, string> = {
  search_atlas: "Searching Atlas",
  list_tasks: "Reading tasks",
  create_task: "Adding a task",
  save_note: "Saving a note",
  read_workspace_file: "Reading a file",
  list_workspaces: "Listing workspaces",
  system_status: "Checking system status",
};

function ToolChip({ t }: { t: ToolEvent }) {
  const Icon = t.status === "running" ? Loader2 : t.status === "done" ? CheckCircle2 : XCircle;
  return (
    <span title={t.summary} className={cx("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs", t.status === "error" ? "border-danger/30 text-danger" : "border-line text-fg-2")}>
      <Wrench className="size-3 text-muted" aria-hidden />
      {TOOL_LABELS[t.name] ?? t.name}
      <Icon className={cx("size-3", t.status === "running" && "animate-spin", t.status === "done" && "text-ok")} aria-label={t.status} />
    </span>
  );
}

function AttachDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (a: Attachment) => void }) {
  const ws = useQuery({ queryKey: ["workspaces"], queryFn: () => get("/api/workspaces"), enabled: open });
  const notes = useQuery({ queryKey: ["notes", "all"], queryFn: () => get("/api/notes"), enabled: open });
  const [wsId, setWsId] = useState<number | "">("");
  const [path, setPath] = useState("");
  const [noteId, setNoteId] = useState<number | "">("");
  return (
    <Modal open={open} onClose={onClose} title="Attach context">
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="text-sm font-medium">A file from a workspace</p>
          {ws.data?.length ? (
            <>
              <Field label="Workspace">
                <Select value={wsId} onChange={(e) => setWsId(Number(e.target.value) || "")}>
                  <option value="">Choose…</option>
                  {ws.data.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </Field>
              <Field label="Path inside the workspace" hint="Example: src/index.ts (max 100 KB). Tip: in Code Lab, open a file and press “Ask AI”.">
                <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="README.md" />
              </Field>
              <Button variant="secondary" disabled={!wsId || !path} onClick={() => { const w = ws.data.find((x: any) => x.id === wsId); onAdd({ kind: "file", workspace_id: Number(wsId), path, label: `${w?.name}/${path}` }); setPath(""); onClose(); }}>Attach file</Button>
            </>
          ) : (
            <p className="text-sm text-muted">No workspaces yet. <Link className="text-accent underline" to="/code">Add one in Code Lab</Link>.</p>
          )}
        </div>
        <div className="space-y-3 border-t border-line pt-4">
          <p className="text-sm font-medium">A note from the Knowledge Vault</p>
          <Select value={noteId} onChange={(e) => setNoteId(Number(e.target.value) || "")}>
            <option value="">Choose a note…</option>
            {(notes.data ?? []).map((n: any) => <option key={n.id} value={n.id}>{n.title}</option>)}
          </Select>
          <Button variant="secondary" disabled={!noteId} onClick={() => { const n = notes.data.find((x: any) => x.id === noteId); onAdd({ kind: "note", id: Number(noteId), label: n.title }); setNoteId(""); onClose(); }}>Attach note</Button>
        </div>
      </div>
    </Modal>
  );
}

export function Chat({
  conversationId,
  projectId,
  onConversation,
  compact,
  initialMessage,
  initialAttachments,
}: {
  conversationId: number | null;
  projectId?: number | null;
  onConversation?: (id: number) => void;
  compact?: boolean;
  initialMessage?: string;
  initialAttachments?: Attachment[];
}) {
  const qc = useQueryClient();
  const providers = useQuery({ queryKey: ["providers"], queryFn: () => get("/api/ai/providers") });
  const convo = useQuery({ queryKey: ["conversation", conversationId], queryFn: () => get(`/api/conversations/${conversationId}`), enabled: Boolean(conversationId) });
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState(initialMessage ?? "");
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments ?? []);
  const [attachOpen, setAttachOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>("");
  const [useTools, setUseTools] = useState(true);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const streamingConv = useRef<number | null>(null);

  useEffect(() => {
    if (initialAttachments?.length) setAttachments(initialAttachments);
  }, [initialAttachments]);
  useEffect(() => {
    if (initialMessage) setText(initialMessage);
  }, [initialMessage]);

  useEffect(() => {
    // Don't clobber the live stream with the refetch triggered by our own new conversation id.
    if (busy && streamingConv.current === conversationId) return;
    if (!conversationId) setMessages([]);
    else if (convo.data) setMessages(convo.data.messages);
  }, [conversationId, convo.data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const p = providers.data;
    if (!p || provider) return;
    const configured = p.providers.filter((x: any) => x.configured);
    setProvider((configured.find((x: any) => x.id === p.defaultProvider) ?? configured[0])?.id ?? "");
  }, [providers.data, provider]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  const configured = (providers.data?.providers ?? []).filter((p: any) => p.configured);
  const current = configured.find((p: any) => p.id === provider);

  const send = async () => {
    const msg = text.trim();
    if (!msg || busy) return;
    setBusy(true);
    setStatus(null);
    const ctl = new AbortController();
    abort.current = ctl;
    const assistantId = `a-${Date.now()}`;
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: msg, attachments: attachments.map((a) => ({ kind: a.kind, label: a.label })) }, { id: assistantId, role: "assistant", content: "", tool_events: [], pending: true }]);
    setText("");
    const sentAttachments = attachments;
    setAttachments([]);
    const patchAssistant = (fn: (m: Msg) => Msg) => setMessages((all) => all.map((m) => (m.id === assistantId ? fn(m) : m)));
    try {
      await streamChat(
        {
          conversation_id: conversationId,
          project_id: projectId ?? null,
          provider: provider || undefined,
          message: msg,
          use_tools: useTools,
          attachments: sentAttachments.map(({ label: _l, ...a }) => a),
        },
        (e: ChatEvent) => {
          if (e.type === "start" && !conversationId) {
            streamingConv.current = e.conversation_id;
            onConversation?.(e.conversation_id);
          } else if (e.type === "text") patchAssistant((m) => ({ ...m, content: m.content + e.delta }));
          else if (e.type === "tool")
            patchAssistant((m) => {
              const others = (m.tool_events ?? []).filter((t) => t.id !== e.id);
              return { ...m, tool_events: [...others, { id: e.id, name: e.name, status: e.status, summary: e.summary }] };
            });
          else if (e.type === "status") setStatus(e.message);
          else if (e.type === "error") patchAssistant((m) => ({ ...m, error: e.message }));
          else if (e.type === "done") patchAssistant((m) => ({ ...m, pending: false }));
        },
        ctl.signal,
      );
    } catch (e) {
      if (!ctl.signal.aborted) patchAssistant((m) => ({ ...m, error: e instanceof Error ? e.message : String(e) }));
      else patchAssistant((m) => ({ ...m, error: "Stopped." }));
    } finally {
      patchAssistant((m) => ({ ...m, pending: false }));
      setBusy(false);
      abort.current = null;
      streamingConv.current = null;
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["project"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    }
  };

  if (providers.isLoading) return <Spinner className="p-6" />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {!configured.length ? (
          <EmptyState icon={AlertTriangle} title="No AI provider is set up yet">
            <p>Add an API key to <code>atlas/.env</code> (Anthropic or OpenAI), or install free local models with Ollama. Then restart Atlas.</p>
            <Link to="/integrations" className="mt-2 inline-block text-accent underline">See Integrations for steps</Link>
          </EmptyState>
        ) : messages.length === 0 ? (
          <EmptyState icon={Bot} title={projectId ? "Ask about this project" : "How can I help?"}>
            {projectId ? "The assistant can see this project's tasks, notes and recent activity." : "The assistant can search your projects, tasks and notes, and add tasks or notes when you ask."}
          </EmptyState>
        ) : (
          messages.map((m) => (
            <article key={m.id} className={cx("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <div className={cx("grid size-7 shrink-0 place-items-center rounded-lg border", m.role === "user" ? "border-line bg-raised" : "border-accent/30 bg-accent-soft")} aria-hidden>
                {m.role === "user" ? <User className="size-3.5 text-fg-2" /> : <Bot className="size-3.5 text-accent" />}
              </div>
              <div className={cx("min-w-0 max-w-[85%] space-y-2", m.role === "user" && "items-end text-right")}>
                {!!m.attachments?.length && (
                  <div className={cx("flex flex-wrap gap-1", m.role === "user" && "justify-end")}>
                    {m.attachments.map((a) => <Badge key={a.label}><FileText className="size-3" aria-hidden />{a.label}</Badge>)}
                  </div>
                )}
                {!!m.tool_events?.length && <div className="flex flex-wrap gap-1.5">{m.tool_events.map((t) => <ToolChip key={t.id} t={t} />)}</div>}
                {(m.content || m.pending) && (
                  <div className={cx("inline-block rounded-xl px-3.5 py-2.5 text-left", m.role === "user" ? "bg-raised" : "border border-line bg-surface")}>
                    {m.role === "user" ? <p className="whitespace-pre-wrap text-[15px]">{m.content}</p> : m.content ? <Markdown>{m.content}</Markdown> : <Spinner label="Thinking" />}
                  </div>
                )}
                {m.error && <p className="flex items-center gap-1.5 text-xs text-danger" role="alert"><XCircle className="size-3.5" aria-hidden />{m.error}</p>}
              </div>
            </article>
          ))
        )}
      </div>

      {configured.length > 0 && (
        <div className="border-t border-line p-3">
          {status && <p className="mb-2 text-xs text-warn">{status}</p>}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachments.map((a, i) => (
                <Badge key={i} tone="accent">
                  <FileText className="size-3" aria-hidden />
                  {a.label}
                  <button aria-label={`Remove ${a.label}`} onClick={() => setAttachments((x) => x.filter((_, j) => j !== i))}><X className="size-3" /></button>
                </Badge>
              ))}
            </div>
          )}
          <div className="rounded-xl border border-line bg-surface focus-within:border-accent/50">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey || (!e.shiftKey && !compact && window.matchMedia("(pointer: fine)").matches))) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={compact ? 2 : 3}
              placeholder={projectId ? "Ask about this project…" : "Message the assistant…"}
              aria-label="Message"
              className="block w-full resize-none bg-transparent px-3.5 py-3 text-[15px] text-fg outline-none placeholder:text-muted"
            />
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-2 py-2">
              <Button variant="ghost" size="sm" icon={Paperclip} onClick={() => setAttachOpen(true)} aria-label="Attach file or note">{!compact && "Attach"}</Button>
              <Select value={provider} onChange={(e) => setProvider(e.target.value)} aria-label="AI provider" className="h-8 w-auto max-w-[160px] py-0 text-xs">
                {configured.map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </Select>
              {current?.supportsTools && (
                <label className="flex items-center gap-1.5 text-xs text-muted" title="Lets the assistant search your Atlas data and add tasks/notes when asked">
                  <input type="checkbox" checked={useTools} onChange={(e) => setUseTools(e.target.checked)} className="accent-[var(--color-accent)]" />
                  Tools
                </label>
              )}
              <span className="ml-auto hidden text-[11px] text-muted sm:inline">{MOD}+Enter</span>
              {busy ? (
                <Button variant="secondary" size="sm" icon={Square} onClick={() => abort.current?.abort()}>Stop</Button>
              ) : (
                <Button variant="primary" size="sm" icon={Send} disabled={!text.trim()} onClick={() => void send()}>Send</Button>
              )}
            </div>
          </div>
        </div>
      )}
      <AttachDialog open={attachOpen} onClose={() => setAttachOpen(false)} onAdd={(a) => setAttachments((x) => [...x, a])} />
    </div>
  );
}

export type { Attachment };
