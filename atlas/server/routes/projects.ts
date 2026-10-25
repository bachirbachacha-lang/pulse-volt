import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { now, tx } from "../db/index.js";
import { logActivity } from "../lib/activity.js";
import { notFound } from "../lib/errors.js";
import { requireConfirm } from "../lib/security.js";
import { idParam, parse } from "../lib/validate.js";

const COLORS = ["cyan", "violet", "amber", "emerald", "rose", "sky", "slate"] as const;

const projectInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(5000).default(""),
  status: z.enum(["active", "paused", "done", "archived"]).default("active"),
  color: z.enum(COLORS).default("cyan"),
  workspace_id: z.number().int().positive().nullable().default(null),
  workspace_subpath: z.string().max(500).default(""),
  pinned: z.boolean().default(false),
});

const taskInput = z.object({
  project_id: z.number().int().positive().nullable().default(null),
  title: z.string().trim().min(1).max(300),
  notes: z.string().max(10000).default(""),
  status: z.enum(["todo", "doing", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
});

const PROJECT_SELECT = `
  SELECT p.*, w.name AS workspace_name,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_total,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') AS task_done,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'doing') AS task_doing,
    (SELECT MAX(ts) FROM activity a WHERE a.project_id = p.id) AS last_activity
  FROM projects p LEFT JOIN workspaces w ON w.id = p.workspace_id`;

const hydrateProject = (r: any) => (r ? { ...r, pinned: Boolean(r.pinned) } : r);

export function projectRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db } = ctx;
  const getProject = (id: number) => {
    const p = db.prepare(`${PROJECT_SELECT} WHERE p.id = ?`).get(id);
    if (!p) throw notFound("Project");
    return hydrateProject(p);
  };

  app.get("/api/projects", async (req) => {
    const { status } = req.query as { status?: string };
    const rows = status
      ? db.prepare(`${PROJECT_SELECT} WHERE p.status = ? ORDER BY p.pinned DESC, p.updated_at DESC`).all(status)
      : db.prepare(`${PROJECT_SELECT} WHERE p.status != 'archived' ORDER BY p.pinned DESC, p.updated_at DESC`).all();
    return rows.map(hydrateProject);
  });

  app.get("/api/projects/:id", async (req) => {
    const id = idParam(req.params);
    const project = getProject(id);
    const tasks = db.prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END, due_date IS NULL, due_date, id DESC").all(id);
    const notes = db.prepare("SELECT id, title, kind, tags, updated_at FROM notes WHERE project_id = ? ORDER BY updated_at DESC LIMIT 50").all(id);
    const conversations = db.prepare("SELECT id, title, provider, model, updated_at FROM conversations WHERE project_id = ? ORDER BY updated_at DESC LIMIT 20").all(id);
    const activity = db.prepare("SELECT * FROM activity WHERE project_id = ? ORDER BY id DESC LIMIT 40").all(id);
    const boards = db.prepare("SELECT id, name, kind FROM boards WHERE project_id = ?").all(id);
    return { project, tasks, notes, conversations, activity, boards };
  });

  app.post("/api/projects", async (req, reply) => {
    const b = parse(projectInput, req.body);
    const t = now();
    const r = db
      .prepare("INSERT INTO projects (name, description, status, color, workspace_id, workspace_subpath, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(b.name, b.description, b.status, b.color, b.workspace_id, b.workspace_subpath, b.pinned ? 1 : 0, t, t);
    const id = Number(r.lastInsertRowid);
    logActivity(db, "projects", "project.created", `Created project "${b.name}"`, id);
    reply.code(201);
    return getProject(id);
  });

  app.patch("/api/projects/:id", async (req) => {
    const id = idParam(req.params);
    const before = getProject(id);
    const b = parse(projectInput.partial(), req.body);
    const merged = { ...before, ...b };
    db.prepare("UPDATE projects SET name = ?, description = ?, status = ?, color = ?, workspace_id = ?, workspace_subpath = ?, pinned = ?, updated_at = ? WHERE id = ?").run(
      merged.name, merged.description, merged.status, merged.color, merged.workspace_id ?? null, merged.workspace_subpath ?? "", merged.pinned ? 1 : 0, now(), id,
    );
    if (b.status && b.status !== before.status) logActivity(db, "projects", "project.status", `"${merged.name}" is now ${b.status}`, id);
    else logActivity(db, "projects", "project.updated", `Updated project "${merged.name}"`, id);
    return getProject(id);
  });

  app.delete("/api/projects/:id", async (req) => {
    const id = idParam(req.params);
    const p = getProject(id);
    requireConfirm(req, `delete project "${p.name}" and its tasks`);
    db.prepare("DELETE FROM projects WHERE id = ?").run(id);
    logActivity(db, "projects", "project.deleted", `Deleted project "${p.name}"`);
    return { ok: true };
  });

  // ---- Tasks ----
  app.get("/api/tasks", async (req) => {
    const q = req.query as { status?: string; project_id?: string; due?: string; limit?: string };
    const limit = Math.min(Number(q.limit ?? 200), 500);
    const where: string[] = [];
    const args: (string | number)[] = [];
    if (q.status === "open") where.push("t.status != 'done'");
    else if (q.status) (where.push("t.status = ?"), args.push(q.status));
    if (q.project_id) (where.push("t.project_id = ?"), args.push(Number(q.project_id)));
    return db
      .prepare(
        `SELECT t.*, p.name AS project_name, p.color AS project_color FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
         ${where.length ? "WHERE " + where.join(" AND ") : ""}
         ORDER BY CASE t.status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END, t.due_date IS NULL, t.due_date,
           CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, t.id DESC LIMIT ?`,
      )
      .all(...args, limit);
  });

  app.post("/api/tasks", async (req, reply) => {
    const b = parse(taskInput, req.body);
    if (b.project_id) getProject(b.project_id);
    const t = now();
    const r = db
      .prepare("INSERT INTO tasks (project_id, title, notes, status, priority, due_date, created_at, updated_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(b.project_id, b.title, b.notes, b.status, b.priority, b.due_date, t, t, b.status === "done" ? t : null);
    if (b.project_id) db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(t, b.project_id);
    logActivity(db, "projects", "task.created", `Added task "${b.title}"`, b.project_id);
    reply.code(201);
    return db.prepare("SELECT * FROM tasks WHERE id = ?").get(r.lastInsertRowid);
  });

  app.patch("/api/tasks/:id", async (req) => {
    const id = idParam(req.params);
    const before = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;
    if (!before) throw notFound("Task");
    const b = parse(taskInput.partial(), req.body);
    const m = { ...before, ...b };
    const t = now();
    const completedAt = m.status === "done" ? (before.completed_at ?? t) : null;
    tx(db, () => {
      db.prepare("UPDATE tasks SET project_id = ?, title = ?, notes = ?, status = ?, priority = ?, due_date = ?, updated_at = ?, completed_at = ? WHERE id = ?").run(
        m.project_id, m.title, m.notes, m.status, m.priority, m.due_date, t, completedAt, id,
      );
      if (m.project_id) db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(t, m.project_id);
    });
    if (b.status && b.status !== before.status) {
      logActivity(db, "projects", b.status === "done" ? "task.completed" : "task.moved", b.status === "done" ? `Completed "${m.title}"` : `Moved "${m.title}" to ${b.status}`, m.project_id);
    }
    return db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  });

  app.delete("/api/tasks/:id", async (req) => {
    const id = idParam(req.params);
    const t = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;
    if (!t) throw notFound("Task");
    requireConfirm(req, `delete task "${t.title}"`);
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    logActivity(db, "projects", "task.deleted", `Deleted task "${t.title}"`, t.project_id);
    return { ok: true };
  });

  // ---- Activity ----
  app.get("/api/activity", async (req) => {
    const { limit, module } = req.query as { limit?: string; module?: string };
    const n = Math.min(Number(limit ?? 30), 200);
    return module
      ? db.prepare("SELECT a.*, p.name AS project_name FROM activity a LEFT JOIN projects p ON p.id = a.project_id WHERE a.module = ? ORDER BY a.id DESC LIMIT ?").all(module, n)
      : db.prepare("SELECT a.*, p.name AS project_name FROM activity a LEFT JOIN projects p ON p.id = a.project_id ORDER BY a.id DESC LIMIT ?").all(n);
  });
}
