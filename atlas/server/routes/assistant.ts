import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { assistantTools } from "../ai/tools.js";
import type { ChatTurn, StreamEvent } from "../ai/types.js";
import type { AppContext } from "../context.js";
import { getWorkspace } from "../context.js";
import { getSetting, json, now } from "../db/index.js";
import { appLog, logActivity } from "../lib/activity.js";
import { badRequest, notConfigured, notFound } from "../lib/errors.js";
import { resolveInside } from "../lib/paths.js";
import { requireConfirm } from "../lib/security.js";
import { idParam, parse } from "../lib/validate.js";

const attachment = z.union([
  z.object({ kind: z.literal("file"), workspace_id: z.number().int(), path: z.string().min(1).max(500) }),
  z.object({ kind: z.literal("note"), id: z.number().int() }),
]);

const sendInput = z.object({
  conversation_id: z.number().int().positive().nullable().default(null),
  project_id: z.number().int().positive().nullable().default(null),
  provider: z.string().optional(),
  model: z.string().max(100).optional(),
  message: z.string().trim().min(1).max(100_000),
  attachments: z.array(attachment).max(10).default([]),
  use_tools: z.boolean().default(true),
});

const MAX_FILE = 100_000;
const MAX_TOTAL = 300_000;

export function buildSystemPrompt(ctx: AppContext, projectId: number | null) {
  const { db } = ctx;
  const parts = [
    "You are the AI assistant inside Atlas, the user's personal, local-first command center for projects, code, design, engineering, trading research and notes.",
    "Be direct and practical. Use plain words; the user may not be technical. Use Markdown for structure and fenced code blocks for code.",
    "You can call tools to look up the user's own data in Atlas. Only add tasks or notes when the user asks. Never claim you did something you did not do.",
    "You cannot run commands, edit files, trade, or spend money. If the user asks for that, explain what they can do in Atlas themselves.",
    `Today's date is ${new Date().toISOString().slice(0, 10)}.`,
  ];
  const custom = getSetting<string>(db, "ai.customInstructions", "");
  if (custom.trim()) parts.push(`User's standing instructions:\n${custom.trim()}`);

  if (projectId) {
    const p = db.prepare("SELECT p.*, w.name AS ws_name, w.id AS ws_id FROM projects p LEFT JOIN workspaces w ON w.id = p.workspace_id WHERE p.id = ?").get(projectId) as any;
    if (p) {
      const tasks = db.prepare("SELECT id, title, status, priority, due_date FROM tasks WHERE project_id = ? AND status != 'done' ORDER BY due_date IS NULL, due_date LIMIT 40").all(projectId) as any[];
      const done = (db.prepare("SELECT COUNT(*) n FROM tasks WHERE project_id = ? AND status = 'done'").get(projectId) as any).n;
      const notes = db.prepare("SELECT title, body FROM notes WHERE project_id = ? ORDER BY pinned DESC, updated_at DESC LIMIT 5").all(projectId) as any[];
      const acts = db.prepare("SELECT ts, message FROM activity WHERE project_id = ? ORDER BY id DESC LIMIT 10").all(projectId) as any[];
      parts.push(
        [
          `<current_project id="${p.id}">`,
          `Name: ${p.name}`,
          `Status: ${p.status}`,
          p.description ? `Description: ${p.description}` : "",
          p.ws_name ? `Linked workspace: "${p.ws_name}" (workspace_id ${p.ws_id})${p.workspace_subpath ? `, folder ${p.workspace_subpath}` : ""}` : "",
          `Open tasks (${tasks.length}, ${done} done):`,
          ...tasks.map((t) => `- [${t.status}] #${t.id} ${t.title} (${t.priority}${t.due_date ? `, due ${t.due_date}` : ""})`),
          notes.length ? "Project notes:" : "",
          ...notes.map((n) => `## ${n.title}\n${String(n.body).slice(0, 1500)}`),
          acts.length ? "Recent activity:" : "",
          ...acts.map((a) => `- ${a.ts.slice(0, 16)} ${a.message}`),
          "</current_project>",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }
  return parts.join("\n\n");
}

function readAttachments(ctx: AppContext, atts: z.infer<typeof attachment>[]) {
  let total = 0;
  const blocks: string[] = [];
  const labels: { kind: string; label: string }[] = [];
  for (const a of atts) {
    if (a.kind === "file") {
      const ws = getWorkspace(ctx.db, a.workspace_id);
      const { abs, rel } = resolveInside(ws.path, a.path, { mustExist: true });
      const st = fs.statSync(abs);
      if (!st.isFile()) throw badRequest(`${rel} is not a file`);
      if (st.size > MAX_FILE) throw badRequest(`${rel} is larger than 100 KB; attach a smaller file`);
      total += st.size;
      if (total > MAX_TOTAL) throw badRequest("Attachments are larger than 300 KB in total");
      blocks.push(`<file workspace="${ws.name}" path="${rel}">\n${fs.readFileSync(abs, "utf8")}\n</file>`);
      labels.push({ kind: "file", label: `${ws.name}/${rel}` });
    } else {
      const n = ctx.db.prepare("SELECT title, body FROM notes WHERE id = ?").get(a.id) as any;
      if (!n) throw notFound("Note");
      total += n.body.length;
      if (total > MAX_TOTAL) throw badRequest("Attachments are larger than 300 KB in total");
      blocks.push(`<note title="${n.title}">\n${n.body}\n</note>`);
      labels.push({ kind: "note", label: n.title });
    }
  }
  return { blocks, labels };
}

export function assistantRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db } = ctx;

  app.get("/api/ai/providers", async () => ({
    providers: await ctx.ai.describe(),
    defaultProvider: getSetting<string | null>(db, "ai.defaultProvider", null),
  }));

  app.get("/api/ai/providers/:id/models", async (req) => {
    const p = ctx.ai.get((req.params as { id: string }).id);
    if (!p) throw notFound("Provider");
    return { models: await p.listModels() };
  });

  app.get("/api/conversations", async (req) => {
    const { project_id } = req.query as { project_id?: string };
    return project_id
      ? db.prepare("SELECT c.*, p.name AS project_name FROM conversations c LEFT JOIN projects p ON p.id = c.project_id WHERE c.project_id = ? ORDER BY c.updated_at DESC").all(Number(project_id))
      : db.prepare("SELECT c.*, p.name AS project_name FROM conversations c LEFT JOIN projects p ON p.id = c.project_id ORDER BY c.updated_at DESC LIMIT 200").all();
  });

  app.get("/api/conversations/:id", async (req) => {
    const id = idParam(req.params);
    const c = db.prepare("SELECT c.*, p.name AS project_name FROM conversations c LEFT JOIN projects p ON p.id = c.project_id WHERE c.id = ?").get(id);
    if (!c) throw notFound("Conversation");
    const messages = (db.prepare("SELECT id, role, content, provider, tool_events, attachments, error, usage, created_at FROM messages WHERE conversation_id = ? ORDER BY id").all(id) as any[]).map((m) => ({
      ...m,
      tool_events: json(m.tool_events, []),
      attachments: json(m.attachments, []),
      usage: json(m.usage, null),
    }));
    return { conversation: c, messages };
  });

  app.patch("/api/conversations/:id", async (req) => {
    const id = idParam(req.params);
    const b = parse(z.object({ title: z.string().trim().min(1).max(200).optional(), project_id: z.number().int().positive().nullable().optional() }), req.body);
    const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as any;
    if (!c) throw notFound("Conversation");
    db.prepare("UPDATE conversations SET title = ?, project_id = ?, updated_at = ? WHERE id = ?").run(b.title ?? c.title, b.project_id === undefined ? c.project_id : b.project_id, now(), id);
    return db.prepare("SELECT * FROM conversations WHERE id = ?").get(id);
  });

  app.delete("/api/conversations/:id", async (req) => {
    const id = idParam(req.params);
    const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as any;
    if (!c) throw notFound("Conversation");
    requireConfirm(req, `delete conversation "${c.title}"`);
    db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
    return { ok: true };
  });

  /** Streams a reply as newline-delimited JSON events. */
  app.post("/api/ai/chat", async (req, reply) => {
    const b = parse(sendInput, req.body);
    const provider = b.provider ? ctx.ai.get(b.provider) : await ctx.ai.pickDefault(getSetting<string | null>(db, "ai.defaultProvider", null));
    if (!provider) throw notConfigured("No AI provider is set up yet. Add an API key in atlas/.env (see Integrations) or start Ollama.");
    if (!provider.isConfigured()) throw notConfigured(`${provider.label} is not set up. ${provider.setupHint}`);
    const model = b.model || getSetting<string | null>(db, `ai.model.${provider.id}`, null) || provider.defaultModel;

    let convId = b.conversation_id;
    let projectId = b.project_id;
    if (convId) {
      const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(convId) as any;
      if (!c) throw notFound("Conversation");
      projectId = c.project_id;
    }
    const { blocks, labels } = readAttachments(ctx, b.attachments);
    const userText = blocks.length ? `${blocks.join("\n\n")}\n\n${b.message}` : b.message;

    const t = now();
    if (!convId) {
      const title = b.message.split("\n")[0].slice(0, 80) || "New conversation";
      convId = Number(db.prepare("INSERT INTO conversations (title, project_id, provider, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(title, projectId, provider.id, model, t, t).lastInsertRowid);
      logActivity(db, "assistant", "conversation.started", `Started a chat: "${title}"`, projectId);
    }
    const history: ChatTurn[] = (db.prepare("SELECT role, content, raw, provider FROM messages WHERE conversation_id = ? AND error IS NULL ORDER BY id").all(convId) as any[]).map((m) => ({
      role: m.role,
      text: m.content,
      raw: json(m.raw, null),
      provider: m.provider,
    }));
    const userMsgId = Number(
      db.prepare("INSERT INTO messages (conversation_id, role, content, provider, attachments, created_at) VALUES (?, 'user', ?, ?, ?, ?)").run(convId, b.message, provider.id, JSON.stringify(labels), t).lastInsertRowid,
    );

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-cache", "x-accel-buffering": "no" });
    const send = (obj: unknown) => res.write(JSON.stringify(obj) + "\n");
    send({ type: "start", conversation_id: convId, provider: provider.id, model });

    const ctl = new AbortController();
    req.raw.on("close", () => {
      if (!res.writableEnded) ctl.abort();
    });
    const toolEvents: StreamEvent[] = [];
    let partial = "";
    try {
      const result = await provider.chat(
        {
          model,
          system: buildSystemPrompt(ctx, projectId),
          history,
          userText,
          tools: b.use_tools && provider.supportsTools ? assistantTools(ctx, projectId) : [],
          signal: ctl.signal,
        },
        (e) => {
          if (e.type === "text") partial += e.delta;
          if (e.type === "tool" && e.status !== "running") toolEvents.push(e);
          send(e);
        },
      );
      // Store the user turn's native form on the user row and the rest on the assistant row.
      const [userRaw, ...assistantRaw] = result.raw ?? [];
      if (result.raw) db.prepare("UPDATE messages SET raw = ? WHERE id = ?").run(JSON.stringify([userRaw]), userMsgId);
      const msgId = db
        .prepare("INSERT INTO messages (conversation_id, role, content, provider, raw, tool_events, usage, created_at) VALUES (?, 'assistant', ?, ?, ?, ?, ?, ?)")
        .run(convId, result.text, provider.id, result.raw ? JSON.stringify(assistantRaw) : null, JSON.stringify(toolEvents), JSON.stringify({ ...result.usage, servedBy: result.servedBy, stopReason: result.stopReason }), now()).lastInsertRowid;
      db.prepare("UPDATE conversations SET updated_at = ?, provider = ?, model = ? WHERE id = ?").run(now(), provider.id, model, convId);
      send({ type: "done", message_id: Number(msgId), usage: result.usage, servedBy: result.servedBy });
    } catch (e) {
      const aborted = ctl.signal.aborted;
      const msg = aborted ? "Stopped." : e instanceof Error ? e.message : String(e);
      if (!aborted) appLog(db, "error", `ai:${provider.id}`, msg);
      // Mark both rows as errored so they are not replayed to the provider.
      db.prepare("UPDATE messages SET error = ? WHERE id = ?").run(msg, userMsgId);
      db.prepare("INSERT INTO messages (conversation_id, role, content, provider, tool_events, error, created_at) VALUES (?, 'assistant', ?, ?, ?, ?, ?)").run(convId, partial, provider.id, JSON.stringify(toolEvents), msg, now());
      db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(now(), convId);
      if (!res.writableEnded) send({ type: "error", message: msg });
    } finally {
      res.end();
    }
  });
}
