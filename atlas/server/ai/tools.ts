import fs from "node:fs";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { getWorkspace } from "../context.js";
import { now } from "../db/index.js";
import { logActivity } from "../lib/activity.js";
import { resolveInside } from "../lib/paths.js";
import { searchAll } from "../lib/search.js";
import type { ToolSpec } from "./types.js";

/**
 * Tools the assistant may call. They are read-only except create_task and save_note, which only add data
 * (never edit or delete). Every call is shown to the user in the chat as a tool-status chip.
 */
export function assistantTools(ctx: AppContext, projectId: number | null): ToolSpec[] {
  const { db } = ctx;
  return [
    {
      name: "search_atlas",
      description: "Full-text search across the user's projects, tasks, knowledge-vault notes and conversations in Atlas. Use before answering questions about the user's own work.",
      schema: z.object({ query: z.string().min(1).max(200) }),
      jsonSchema: { type: "object", properties: { query: { type: "string", description: "Search words" } }, required: ["query"], additionalProperties: false },
      mutates: false,
      run: async ({ query }) => JSON.stringify(searchAll(db, query, 12)),
    },
    {
      name: "list_tasks",
      description: "List tasks. Defaults to the current project when there is one. Status filter optional.",
      schema: z.object({ project_id: z.number().int().optional(), status: z.enum(["todo", "doing", "done"]).optional() }),
      jsonSchema: {
        type: "object",
        properties: { project_id: { type: "integer" }, status: { type: "string", enum: ["todo", "doing", "done"] } },
        additionalProperties: false,
      },
      mutates: false,
      run: async ({ project_id, status }) => {
        const pid = project_id ?? projectId;
        const rows = db
          .prepare(
            `SELECT t.id, t.title, t.status, t.priority, t.due_date, p.name AS project FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
             WHERE (? IS NULL OR t.project_id = ?) AND (? IS NULL OR t.status = ?) ORDER BY t.status, t.due_date IS NULL, t.due_date LIMIT 60`,
          )
          .all(pid ?? null, pid ?? null, status ?? null, status ?? null);
        return JSON.stringify(rows);
      },
    },
    {
      name: "create_task",
      description: "Add a new task for the user. Only use when the user asks you to add or plan tasks.",
      schema: z.object({
        title: z.string().min(1).max(200),
        notes: z.string().max(2000).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        project_id: z.number().int().optional(),
      }),
      jsonSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          notes: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          due_date: { type: "string", description: "YYYY-MM-DD" },
          project_id: { type: "integer", description: "Defaults to the current project" },
        },
        required: ["title"],
        additionalProperties: false,
      },
      mutates: true,
      run: async (i) => {
        const pid = i.project_id ?? projectId ?? null;
        if (pid && !db.prepare("SELECT 1 FROM projects WHERE id = ?").get(pid)) throw new Error("Project not found");
        const t = now();
        const r = db
          .prepare("INSERT INTO tasks (project_id, title, notes, priority, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(pid, i.title, i.notes ?? "", i.priority ?? "medium", i.due_date ?? null, t, t);
        logActivity(db, "assistant", "task.created", `AI assistant added task "${i.title}"`, pid);
        return `Created task #${r.lastInsertRowid}`;
      },
    },
    {
      name: "save_note",
      description: "Save a new note to the user's Knowledge Vault. Only use when the user asks to save or write something down.",
      schema: z.object({ title: z.string().min(1).max(200), body: z.string().max(50_000), tags: z.string().max(200).optional() }),
      jsonSchema: {
        type: "object",
        properties: { title: { type: "string" }, body: { type: "string", description: "Markdown" }, tags: { type: "string", description: "comma separated" } },
        required: ["title", "body"],
        additionalProperties: false,
      },
      mutates: true,
      run: async (i) => {
        const t = now();
        const r = db
          .prepare("INSERT INTO notes (project_id, kind, title, body, tags, created_at, updated_at) VALUES (?, 'note', ?, ?, ?, ?, ?)")
          .run(projectId, i.title, i.body, i.tags ?? "ai", t, t);
        logActivity(db, "assistant", "note.created", `AI assistant saved note "${i.title}"`, projectId);
        return `Saved note #${r.lastInsertRowid}`;
      },
    },
    {
      name: "read_workspace_file",
      description: "Read a text file from one of the user's authorized workspaces (max 100 KB). Secret files are blocked.",
      schema: z.object({ workspace_id: z.number().int(), path: z.string().min(1).max(500) }),
      jsonSchema: {
        type: "object",
        properties: { workspace_id: { type: "integer" }, path: { type: "string", description: "Path relative to the workspace root" } },
        required: ["workspace_id", "path"],
        additionalProperties: false,
      },
      mutates: false,
      run: async ({ workspace_id, path: p }) => {
        const ws = getWorkspace(db, workspace_id);
        const { abs } = resolveInside(ws.path, p, { mustExist: true });
        const st = fs.statSync(abs);
        if (!st.isFile()) throw new Error("Not a file");
        if (st.size > 100_000) throw new Error(`File is ${st.size} bytes; limit is 100 KB`);
        return fs.readFileSync(abs, "utf8");
      },
    },
    {
      name: "list_workspaces",
      description: "List the folders the user has authorized Atlas to access, with their ids.",
      schema: z.object({}),
      jsonSchema: { type: "object", properties: {}, additionalProperties: false },
      mutates: false,
      run: async () => JSON.stringify(db.prepare("SELECT id, name, path FROM workspaces").all()),
    },
    {
      name: "system_status",
      description: "Current CPU, memory and disk usage of the user's computer.",
      schema: z.object({}),
      jsonSchema: { type: "object", properties: {}, additionalProperties: false },
      mutates: false,
      run: async () => {
        const s = ctx.metrics.snapshot([{ label: "data", path: ctx.paths.data }]);
        return JSON.stringify({ cpu: s.cpu.usage, cores: s.cpu.cores, memory: s.memory, disks: s.disks, uptimeSec: s.host.uptimeSec });
      },
    },
  ];
}
