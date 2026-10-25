import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { now } from "../db/index.js";
import { logActivity } from "../lib/activity.js";
import { badRequest, HttpError, notConfigured, notFound } from "../lib/errors.js";
import { launchDetached } from "../lib/exec.js";
import { mimeFor } from "../lib/paths.js";
import { requireConfirm } from "../lib/security.js";
import { idParam, parse } from "../lib/validate.js";
import { detectTools } from "../integrations/registry.js";

const ALLOWED_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "pdf", "stl", "obj", "glb", "gltf", "step", "stp", "fcstd", "blend", "dxf", "scad", "txt", "md", "csv", "json", "mp4", "webm"]);
const MAX_UPLOAD = 100 * 1024 * 1024;

const boardInput = z.object({
  name: z.string().trim().min(1).max(200),
  kind: z.enum(["moodboard", "references", "ui-concept", "assets"]).default("moodboard"),
  description: z.string().max(5000).default(""),
  project_id: z.number().int().positive().nullable().default(null),
});

export function saveAssetBuffer(ctx: AppContext, buf: Buffer, originalName: string, opts: { area: "design" | "engineering"; board_id?: number | null; project_id?: number | null; source?: string; note?: string; tags?: string }) {
  const ext = path.extname(originalName).slice(1).toLowerCase() || "bin";
  const stored = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(ctx.paths.uploads, stored), buf);
  const r = ctx.db
    .prepare("INSERT INTO assets (area, board_id, project_id, stored_name, original_name, mime, size, tags, note, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(opts.area, opts.board_id ?? null, opts.project_id ?? null, stored, originalName, mimeFor(stored), buf.length, opts.tags ?? "", opts.note ?? "", opts.source ?? "upload", now());
  return Number(r.lastInsertRowid);
}

export function assetRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db } = ctx;
  const getAsset = (id: number) => {
    const a = db.prepare("SELECT * FROM assets WHERE id = ?").get(id) as any;
    if (!a) throw notFound("Asset");
    return a;
  };

  // ---- Boards ----
  app.get("/api/boards", async () =>
    db.prepare(`SELECT b.*, p.name AS project_name, (SELECT COUNT(*) FROM assets a WHERE a.board_id = b.id) AS asset_count,
      (SELECT id FROM assets a WHERE a.board_id = b.id AND a.mime LIKE 'image/%' ORDER BY a.id DESC LIMIT 1) AS cover_id
      FROM boards b LEFT JOIN projects p ON p.id = b.project_id ORDER BY b.updated_at DESC`).all(),
  );
  app.post("/api/boards", async (req, reply) => {
    const b = parse(boardInput, req.body);
    const t = now();
    const r = db.prepare("INSERT INTO boards (name, kind, description, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(b.name, b.kind, b.description, b.project_id, t, t);
    logActivity(db, "design", "board.created", `Created ${b.kind} "${b.name}"`, b.project_id);
    reply.code(201);
    return db.prepare("SELECT * FROM boards WHERE id = ?").get(r.lastInsertRowid);
  });
  app.patch("/api/boards/:id", async (req) => {
    const id = idParam(req.params);
    const before = db.prepare("SELECT * FROM boards WHERE id = ?").get(id) as any;
    if (!before) throw notFound("Board");
    const m = { ...before, ...parse(boardInput.partial(), req.body) };
    db.prepare("UPDATE boards SET name = ?, kind = ?, description = ?, project_id = ?, updated_at = ? WHERE id = ?").run(m.name, m.kind, m.description, m.project_id, now(), id);
    return db.prepare("SELECT * FROM boards WHERE id = ?").get(id);
  });
  app.delete("/api/boards/:id", async (req) => {
    const id = idParam(req.params);
    const b = db.prepare("SELECT * FROM boards WHERE id = ?").get(id) as any;
    if (!b) throw notFound("Board");
    requireConfirm(req, `delete board "${b.name}" (its images stay in the asset library)`);
    db.prepare("DELETE FROM boards WHERE id = ?").run(id);
    return { ok: true };
  });

  // ---- Assets ----
  app.get("/api/assets", async (req) => {
    const { area = "design", board_id, q } = req.query as { area?: string; board_id?: string; q?: string };
    const where = ["a.area = ?"];
    const args: (string | number)[] = [area];
    if (board_id === "none") where.push("a.board_id IS NULL");
    else if (board_id) (where.push("a.board_id = ?"), args.push(Number(board_id)));
    if (q) (where.push("(a.original_name LIKE ? OR a.tags LIKE ? OR a.note LIKE ?)"), args.push(`%${q}%`, `%${q}%`, `%${q}%`));
    return db.prepare(`SELECT a.*, b.name AS board_name FROM assets a LEFT JOIN boards b ON b.id = a.board_id WHERE ${where.join(" AND ")} ORDER BY a.id DESC LIMIT 500`).all(...args);
  });

  app.post("/api/assets/upload", async (req, reply) => {
    const q = req.query as { area?: string; board_id?: string; project_id?: string };
    const area = q.area === "engineering" ? "engineering" : "design";
    const ids: number[] = [];
    for await (const part of req.files({ limits: { fileSize: MAX_UPLOAD } })) {
      const ext = path.extname(part.filename).slice(1).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) {
        part.file.resume();
        throw badRequest(`.${ext || "?"} files are not supported here`);
      }
      const tmp = path.join(ctx.paths.uploads, `.tmp-${crypto.randomBytes(6).toString("hex")}`);
      await pipeline(part.file, fs.createWriteStream(tmp));
      if (part.file.truncated) {
        fs.rmSync(tmp, { force: true });
        throw badRequest("File is larger than 100 MB");
      }
      const buf = fs.readFileSync(tmp);
      fs.rmSync(tmp, { force: true });
      ids.push(saveAssetBuffer(ctx, buf, part.filename, { area, board_id: q.board_id ? Number(q.board_id) : null, project_id: q.project_id ? Number(q.project_id) : null }));
    }
    if (!ids.length) throw badRequest("No files received");
    logActivity(db, area, "assets.uploaded", `Uploaded ${ids.length} file${ids.length > 1 ? "s" : ""} to ${area === "design" ? "Design Studio" : "Engineering Lab"}`);
    reply.code(201);
    return { ids };
  });

  app.get("/api/assets/:id/file", async (req, reply) => {
    const a = getAsset(idParam(req.params));
    const file = path.join(ctx.paths.uploads, a.stored_name);
    if (!fs.existsSync(file)) throw notFound("File on disk");
    reply.header("content-type", a.mime);
    reply.header("cache-control", "private, max-age=3600");
    reply.header("content-security-policy", "sandbox"); // uploaded SVGs cannot run scripts
    if ((req.query as { download?: string }).download) reply.header("content-disposition", `attachment; filename="${encodeURIComponent(a.original_name)}"`);
    return reply.send(fs.createReadStream(file));
  });

  app.patch("/api/assets/:id", async (req) => {
    const id = idParam(req.params);
    const a = getAsset(id);
    const b = parse(z.object({ tags: z.string().max(500).optional(), note: z.string().max(5000).optional(), board_id: z.number().int().positive().nullable().optional(), project_id: z.number().int().positive().nullable().optional() }), req.body);
    db.prepare("UPDATE assets SET tags = ?, note = ?, board_id = ?, project_id = ? WHERE id = ?").run(b.tags ?? a.tags, b.note ?? a.note, b.board_id === undefined ? a.board_id : b.board_id, b.project_id === undefined ? a.project_id : b.project_id, id);
    return getAsset(id);
  });

  app.delete("/api/assets/:id", async (req) => {
    const id = idParam(req.params);
    const a = getAsset(id);
    requireConfirm(req, `permanently delete ${a.original_name}`);
    db.prepare("DELETE FROM assets WHERE id = ?").run(id);
    fs.rmSync(path.join(ctx.paths.uploads, a.stored_name), { force: true });
    logActivity(db, a.area, "asset.deleted", `Deleted ${a.original_name}`);
    return { ok: true };
  });

  /** Opens an engineering file in a detected desktop app (Blender, FreeCAD, OpenSCAD). */
  app.post("/api/assets/:id/open-with", async (req) => {
    const a = getAsset(idParam(req.params));
    const { tool } = parse(z.object({ tool: z.enum(["blender", "freecad", "openscad"]) }), req.body);
    const found = detectTools().find((t) => t.id === tool);
    if (!found?.path) throw notConfigured(`${tool} was not found on this computer`);
    const file = path.join(ctx.paths.uploads, a.stored_name);
    let args = [file];
    if (tool === "blender" && !/\.blend$/i.test(file)) {
      const op = /\.stl$/i.test(file) ? "bpy.ops.wm.stl_import" : /\.obj$/i.test(file) ? "bpy.ops.wm.obj_import" : /\.(glb|gltf)$/i.test(file) ? "bpy.ops.import_scene.gltf" : null;
      if (!op) throw badRequest("Blender can open .blend, .stl, .obj, .glb and .gltf files");
      args = ["--python-expr", `import bpy; ${op}(filepath=${JSON.stringify(file)})`];
    }
    // Launch detached; Atlas does not wait for the desktop app to close.
    launchDetached(found.path, args);
    logActivity(db, "engineering", "asset.opened", `Opened ${a.original_name} in ${found.name}`);
    return { ok: true };
  });

  // ---- Image generation (OpenAI Images API; runs as a background job) ----
  app.post("/api/design/generate", async (req, reply) => {
    const b = parse(z.object({ prompt: z.string().trim().min(3).max(4000), size: z.enum(["1024x1024", "1536x1024", "1024x1536"]).default("1024x1024"), board_id: z.number().int().positive().nullable().default(null) }), req.body);
    if (!ctx.config.openai.apiKey) throw notConfigured("Image generation needs OPENAI_API_KEY in atlas/.env.");
    const id = ctx.jobs.enqueue("image.generate", `Generate image: ${b.prompt.slice(0, 60)}`, b);
    reply.code(202);
    return { job_id: id };
  });

  ctx.jobs.register("image.generate", async (p: { prompt: string; size: string; board_id: number | null }, jc) => {
    jc.log(`Requesting ${p.size} image from ${ctx.config.openai.imageModel}`);
    const res = await fetch(`${ctx.config.openai.baseURL}/images/generations`, {
      method: "POST",
      signal: jc.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${ctx.config.openai.apiKey}` },
      body: JSON.stringify({ model: ctx.config.openai.imageModel, prompt: p.prompt, size: p.size, n: 1 }),
    });
    const data = (await res.json().catch(() => ({}))) as { data?: { b64_json?: string; url?: string }[]; error?: { message: string } };
    if (!res.ok) throw new HttpError(502, data.error?.message ?? `OpenAI returned ${res.status}`);
    const item = data.data?.[0];
    let buf: Buffer;
    if (item?.b64_json) buf = Buffer.from(item.b64_json, "base64");
    else if (item?.url) buf = Buffer.from(await (await fetch(item.url, { signal: jc.signal })).arrayBuffer());
    else throw new Error("No image in response");
    const assetId = saveAssetBuffer(ctx, buf, `generated-${Date.now()}.png`, { area: "design", board_id: p.board_id, source: "ai-generated", note: p.prompt, tags: "ai-generated" });
    jc.log(`Saved as asset #${assetId}`);
    logActivity(db, "design", "image.generated", `Generated an image (AI): ${p.prompt.slice(0, 80)}`);
    return { asset_id: assetId };
  });
}
