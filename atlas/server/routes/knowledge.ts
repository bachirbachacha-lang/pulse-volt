import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { all, create } from "mathjs";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { getWorkspace } from "../context.js";
import { now } from "../db/index.js";
import { logActivity } from "../lib/activity.js";
import { badRequest, notFound } from "../lib/errors.js";
import { HIDDEN_DIRS, isSecretFile, resolveInside } from "../lib/paths.js";
import { ftsQuery, searchAll } from "../lib/search.js";
import { requireConfirm } from "../lib/security.js";
import { idParam, parse } from "../lib/validate.js";

// A locked-down math.js instance (per math.js security guidance): no import/createUnit/eval escape hatches.
const math = create(all);
const evaluate = math.evaluate.bind(math);
math.import(
  {
    import: () => { throw new Error("Function import is disabled"); },
    createUnit: () => { throw new Error("Function createUnit is disabled"); },
    evaluate: () => { throw new Error("Function evaluate is disabled"); },
    parse: () => { throw new Error("Function parse is disabled"); },
    simplify: () => { throw new Error("Function simplify is disabled"); },
    resolve: () => { throw new Error("Function resolve is disabled"); },
    reviver: () => { throw new Error("Function reviver is disabled"); },
  },
  { override: true },
);

export function calculate(expression: string) {
  if (expression.length > 2000) throw badRequest("Expression is too long");
  try {
    const scope = new Map();
    const value = evaluate(expression, scope);
    const out = Array.isArray(value) ? value.filter((v) => v !== undefined).at(-1) : value;
    return math.format(out, { precision: 12 });
  } catch (e) {
    throw badRequest(e instanceof Error ? e.message : "Could not evaluate");
  }
}

const noteInput = z.object({
  title: z.string().trim().min(1).max(300),
  body: z.string().max(1_000_000).default(""),
  tags: z.string().max(500).default(""),
  kind: z.enum(["note", "doc", "diagram"]).default("note"),
  project_id: z.number().int().positive().nullable().default(null),
  pinned: z.boolean().default(false),
});

const expInput = z.object({
  title: z.string().trim().min(1).max(300),
  hypothesis: z.string().max(20000).default(""),
  method: z.string().max(20000).default(""),
  result: z.string().max(20000).default(""),
  status: z.enum(["planned", "running", "succeeded", "failed", "inconclusive"]).default("planned"),
  project_id: z.number().int().positive().nullable().default(null),
});

export function knowledgeRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db } = ctx;
  const getNote = (id: number) => {
    const n = db.prepare("SELECT n.*, p.name AS project_name FROM notes n LEFT JOIN projects p ON p.id = n.project_id WHERE n.id = ?").get(id) as any;
    if (!n) throw notFound("Note");
    return { ...n, pinned: Boolean(n.pinned) };
  };

  app.get("/api/search", async (req) => {
    const { q = "" } = req.query as { q?: string };
    return { query: q, hits: searchAll(db, q.slice(0, 200)) };
  });

  app.get("/api/notes", async (req) => {
    const { kind, q, tag, project_id } = req.query as { kind?: string; q?: string; tag?: string; project_id?: string };
    const where: string[] = [];
    const args: (string | number)[] = [];
    if (kind) (where.push("n.kind = ?"), args.push(kind));
    if (project_id) (where.push("n.project_id = ?"), args.push(Number(project_id)));
    if (tag) (where.push("(',' || REPLACE(n.tags, ' ', '') || ',') LIKE ?"), args.push(`%,${tag.replace(/\s/g, "")},%`));
    if (q?.trim()) {
      const fq = ftsQuery(q);
      if (fq) (where.push("n.id IN (SELECT rowid FROM notes_fts WHERE notes_fts MATCH ?)"), args.push(fq));
    }
    return (db
      .prepare(`SELECT n.id, n.title, n.kind, n.tags, n.pinned, n.project_id, p.name AS project_name, n.updated_at, substr(n.body, 1, 240) AS excerpt
                FROM notes n LEFT JOIN projects p ON p.id = n.project_id ${where.length ? "WHERE " + where.join(" AND ") : ""}
                ORDER BY n.pinned DESC, n.updated_at DESC LIMIT 500`)
      .all(...args) as any[]).map((n) => ({ ...n, pinned: Boolean(n.pinned) }));
  });

  app.get("/api/notes/tags", async () => {
    const counts = new Map<string, number>();
    for (const r of db.prepare("SELECT tags FROM notes WHERE kind = 'note'").all() as any[])
      for (const t of String(r.tags).split(",").map((s) => s.trim()).filter(Boolean)) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
  });

  app.get("/api/notes/:id", async (req) => getNote(idParam(req.params)));

  app.post("/api/notes", async (req, reply) => {
    const b = parse(noteInput, req.body);
    const t = now();
    const r = db.prepare("INSERT INTO notes (project_id, kind, title, body, tags, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(b.project_id, b.kind, b.title, b.body, b.tags, b.pinned ? 1 : 0, t, t);
    logActivity(db, b.kind === "note" ? "vault" : "engineering", `${b.kind}.created`, `Created ${b.kind} "${b.title}"`, b.project_id);
    reply.code(201);
    return getNote(Number(r.lastInsertRowid));
  });

  app.patch("/api/notes/:id", async (req) => {
    const id = idParam(req.params);
    const before = getNote(id);
    const b = parse(noteInput.partial(), req.body);
    const m = { ...before, ...b };
    db.prepare("UPDATE notes SET project_id = ?, kind = ?, title = ?, body = ?, tags = ?, pinned = ?, updated_at = ? WHERE id = ?").run(m.project_id, m.kind, m.title, m.body, m.tags, m.pinned ? 1 : 0, now(), id);
    return getNote(id);
  });

  app.delete("/api/notes/:id", async (req) => {
    const id = idParam(req.params);
    const n = getNote(id);
    requireConfirm(req, `delete "${n.title}"`);
    db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    logActivity(db, n.kind === "note" ? "vault" : "engineering", `${n.kind}.deleted`, `Deleted ${n.kind} "${n.title}"`, n.project_id);
    return { ok: true };
  });

  /** Imports Markdown/text files from a workspace folder as new notes (adds only; never changes files). */
  app.post("/api/notes/import", async (req) => {
    const b = parse(z.object({ workspace_id: z.number().int(), path: z.string().default(""), recursive: z.boolean().default(false), tags: z.string().default("imported") }), req.body);
    const ws = getWorkspace(db, b.workspace_id);
    const { abs, rel } = resolveInside(ws.path, b.path, { mustExist: true });
    const files: string[] = [];
    const walk = (dir: string, depth: number) => {
      for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
        if (files.length >= 200) return;
        if (HIDDEN_DIRS.has(d.name) || isSecretFile(d.name)) continue;
        const full = path.join(dir, d.name);
        if (d.isDirectory() && b.recursive && depth < 4) walk(full, depth + 1);
        else if (d.isFile() && /\.(md|markdown|txt)$/i.test(d.name) && fs.statSync(full).size < 1_000_000) files.push(full);
      }
    };
    if (fs.statSync(abs).isFile()) files.push(abs);
    else walk(abs, 0);
    const t = now();
    const ins = db.prepare("INSERT INTO notes (kind, title, body, tags, created_at, updated_at) VALUES ('note', ?, ?, ?, ?, ?)");
    for (const f of files) {
      const body = fs.readFileSync(f, "utf8");
      const heading = body.match(/^#\s+(.+)$/m)?.[1];
      ins.run(heading?.slice(0, 200) ?? path.basename(f).replace(/\.\w+$/, ""), body, b.tags, t, t);
    }
    logActivity(db, "vault", "notes.imported", `Imported ${files.length} notes from ${ws.name}/${rel}`);
    return { imported: files.length };
  });

  // ---- Engineering: experiments ----
  app.get("/api/experiments", async () => db.prepare("SELECT e.*, p.name AS project_name FROM experiments e LEFT JOIN projects p ON p.id = e.project_id ORDER BY e.updated_at DESC").all());
  app.post("/api/experiments", async (req, reply) => {
    const b = parse(expInput, req.body);
    const t = now();
    const r = db.prepare("INSERT INTO experiments (project_id, title, hypothesis, method, result, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(b.project_id, b.title, b.hypothesis, b.method, b.result, b.status, t, t);
    logActivity(db, "engineering", "experiment.created", `Logged experiment "${b.title}"`, b.project_id);
    reply.code(201);
    return db.prepare("SELECT * FROM experiments WHERE id = ?").get(r.lastInsertRowid);
  });
  app.patch("/api/experiments/:id", async (req) => {
    const id = idParam(req.params);
    const before = db.prepare("SELECT * FROM experiments WHERE id = ?").get(id) as any;
    if (!before) throw notFound("Experiment");
    const m = { ...before, ...parse(expInput.partial(), req.body) };
    db.prepare("UPDATE experiments SET project_id = ?, title = ?, hypothesis = ?, method = ?, result = ?, status = ?, updated_at = ? WHERE id = ?").run(m.project_id, m.title, m.hypothesis, m.method, m.result, m.status, now(), id);
    if (m.status !== before.status) logActivity(db, "engineering", "experiment.status", `Experiment "${m.title}" → ${m.status}`, m.project_id);
    return db.prepare("SELECT * FROM experiments WHERE id = ?").get(id);
  });
  app.delete("/api/experiments/:id", async (req) => {
    const id = idParam(req.params);
    const e = db.prepare("SELECT * FROM experiments WHERE id = ?").get(id) as any;
    if (!e) throw notFound("Experiment");
    requireConfirm(req, `delete experiment "${e.title}"`);
    db.prepare("DELETE FROM experiments WHERE id = ?").run(id);
    return { ok: true };
  });

  // ---- Engineering: calculations ----
  app.post("/api/calculate", async (req) => {
    const b = parse(z.object({ expression: z.string().min(1), label: z.string().max(200).default(""), save: z.boolean().default(false), project_id: z.number().int().positive().nullable().default(null) }), req.body);
    const result = calculate(b.expression);
    if (b.save) db.prepare("INSERT INTO calculations (project_id, label, expression, result, created_at) VALUES (?, ?, ?, ?, ?)").run(b.project_id, b.label, b.expression, result, now());
    return { result };
  });
  app.get("/api/calculations", async () => db.prepare("SELECT * FROM calculations ORDER BY id DESC LIMIT 100").all());
  app.delete("/api/calculations/:id", async (req) => {
    requireConfirm(req, "delete this saved calculation");
    db.prepare("DELETE FROM calculations WHERE id = ?").run(idParam(req.params));
    return { ok: true };
  });
}
