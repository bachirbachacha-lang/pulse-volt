import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { getWorkspace } from "../context.js";
import { now } from "../db/index.js";
import { logActivity } from "../lib/activity.js";
import { badRequest, forbidden, HttpError, notFound } from "../lib/errors.js";
import { run, spawnStreaming, which } from "../lib/exec.js";
import { HIDDEN_DIRS, isSecretFile, looksLikeText, mimeFor, resolveInside } from "../lib/paths.js";
import { requireConfirm } from "../lib/security.js";
import { idParam, parse } from "../lib/validate.js";

const MAX_EDIT_BYTES = 2 * 1024 * 1024;
const runningScripts = new Map<number, ReturnType<typeof spawnStreaming>>();

export function validateWorkspacePath(p: string) {
  const abs = path.resolve(p.replace(/^~(?=$|\/)/, os.homedir()));
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw badRequest("That folder does not exist");
  const real = fs.realpathSync(abs);
  const tooBroad = [path.parse(real).root, os.homedir(), "/Users", "/home", "/System", "/usr", "/etc", "/var", "/bin", "/Library", "C:\\Windows"];
  if (tooBroad.includes(real)) throw forbidden("Pick a specific project folder, not a whole drive, system folder or your entire home folder");
  return real;
}

async function gitAvailable(cwd: string) {
  const r = await run("git", ["rev-parse", "--show-toplevel"], { cwd });
  return r.code === 0 ? r.stdout.trim() : null;
}

export function codeLabRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db } = ctx;

  // ---- Workspaces (authorized folders) ----
  app.get("/api/workspaces", async () =>
    (db.prepare("SELECT * FROM workspaces ORDER BY name").all() as any[]).map((w) => ({ ...w, exists: fs.existsSync(w.path) })),
  );

  app.post("/api/workspaces", async (req, reply) => {
    const b = parse(z.object({ name: z.string().trim().min(1).max(80), path: z.string().min(1).max(1000) }), req.body);
    requireConfirm(req, `give Atlas access to ${b.path}`);
    const real = validateWorkspacePath(b.path);
    if (db.prepare("SELECT 1 FROM workspaces WHERE path = ?").get(real)) throw badRequest("That folder is already a workspace");
    const r = db.prepare("INSERT INTO workspaces (name, path, created_at) VALUES (?, ?, ?)").run(b.name, real, now());
    logActivity(db, "codelab", "workspace.added", `Authorized workspace "${b.name}" (${real})`);
    reply.code(201);
    return db.prepare("SELECT * FROM workspaces WHERE id = ?").get(r.lastInsertRowid);
  });

  app.delete("/api/workspaces/:id", async (req) => {
    const id = idParam(req.params);
    const ws = db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id) as any;
    if (!ws) throw notFound("Workspace");
    requireConfirm(req, `remove access to ${ws.path} (files are not deleted)`);
    db.prepare("DELETE FROM workspaces WHERE id = ?").run(id);
    logActivity(db, "codelab", "workspace.removed", `Removed workspace "${ws.name}" (files untouched)`);
    return { ok: true };
  });

  // ---- Files ----
  app.get("/api/workspaces/:id/tree", async (req) => {
    const ws = getWorkspace(db, idParam(req.params));
    const { path: rel = "", hidden } = req.query as { path?: string; hidden?: string };
    const { abs, rel: cleanRel } = resolveInside(ws.path, rel, { mustExist: true });
    if (!fs.statSync(abs).isDirectory()) throw badRequest("Not a folder");
    const entries = fs
      .readdirSync(abs, { withFileTypes: true })
      .filter((d) => hidden === "1" || !HIDDEN_DIRS.has(d.name))
      .filter((d) => !isSecretFile(d.name))
      .map((d) => {
        const full = path.join(abs, d.name);
        let size = 0;
        let mtime = "";
        try {
          const st = fs.statSync(full);
          size = st.size;
          mtime = st.mtime.toISOString();
        } catch {
          /* broken symlink */
        }
        return { name: d.name, path: cleanRel ? `${cleanRel}/${d.name}` : d.name, type: d.isDirectory() ? "dir" : "file", size, mtime };
      })
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    return { workspace: ws, path: cleanRel, entries };
  });

  app.get("/api/workspaces/:id/file", async (req) => {
    const ws = getWorkspace(db, idParam(req.params));
    const { abs, rel } = resolveInside(ws.path, (req.query as { path?: string }).path ?? "", { mustExist: true });
    const st = fs.statSync(abs);
    if (!st.isFile()) throw badRequest("Not a file");
    const fd = fs.openSync(abs, "r");
    const sample = Buffer.alloc(Math.min(st.size, 4096));
    fs.readSync(fd, sample, 0, sample.length, 0);
    fs.closeSync(fd);
    const isText = looksLikeText(abs, sample);
    return {
      path: rel,
      size: st.size,
      mtime: st.mtime.toISOString(),
      mime: mimeFor(abs),
      isText,
      tooLarge: st.size > MAX_EDIT_BYTES,
      content: isText && st.size <= MAX_EDIT_BYTES ? fs.readFileSync(abs, "utf8") : null,
    };
  });

  app.get("/api/workspaces/:id/raw", async (req, reply) => {
    const ws = getWorkspace(db, idParam(req.params));
    const { abs } = resolveInside(ws.path, (req.query as { path?: string }).path ?? "", { mustExist: true });
    if (!fs.statSync(abs).isFile()) throw badRequest("Not a file");
    reply.header("content-type", mimeFor(abs));
    reply.header("content-security-policy", "sandbox");
    return reply.send(fs.createReadStream(abs));
  });

  app.put("/api/workspaces/:id/file", async (req) => {
    const ws = getWorkspace(db, idParam(req.params));
    const b = parse(z.object({ path: z.string().min(1).max(1000), content: z.string().max(MAX_EDIT_BYTES), expected_mtime: z.string().nullable().optional() }), req.body);
    const { abs, rel } = resolveInside(ws.path, b.path, { forWrite: true });
    const exists = fs.existsSync(abs);
    requireConfirm(req, exists ? `overwrite ${rel}` : `create ${rel}`);
    if (exists) {
      const st = fs.statSync(abs);
      if (!st.isFile()) throw badRequest("Not a file");
      if (b.expected_mtime && st.mtime.toISOString() !== b.expected_mtime) {
        throw new HttpError(409, "The file changed on disk since you opened it. Reload it before saving.", "conflict");
      }
      // Keep the previous version so a bad save can be undone.
      const backupDir = path.join(ctx.paths.backups, "files", String(ws.id), path.dirname(rel));
      fs.mkdirSync(backupDir, { recursive: true });
      fs.copyFileSync(abs, path.join(backupDir, `${path.basename(rel)}.${Date.now()}.bak`));
    } else {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
    }
    fs.writeFileSync(abs, b.content, "utf8");
    logActivity(db, "codelab", exists ? "file.saved" : "file.created", `${exists ? "Saved" : "Created"} ${ws.name}/${rel}`);
    return { ok: true, mtime: fs.statSync(abs).mtime.toISOString() };
  });

  app.post("/api/workspaces/:id/open-editor", async (req) => {
    const ws = getWorkspace(db, idParam(req.params));
    const { path: rel = "" } = (req.body ?? {}) as { path?: string };
    const { abs } = resolveInside(ws.path, rel, { mustExist: true });
    const code = which("code", ["/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code", "/usr/local/bin/code"]);
    if (!code) throw new HttpError(424, "VS Code's `code` command was not found. In VS Code run “Shell Command: Install 'code' command in PATH”.", "not_configured");
    const r = await run(code, [abs], { timeoutMs: 10000 });
    if (r.code !== 0) throw badRequest(r.stderr || "Could not open VS Code");
    return { ok: true };
  });

  // ---- Git ----
  app.get("/api/workspaces/:id/git/status", async (req) => {
    const ws = getWorkspace(db, idParam(req.params));
    const { sub = "" } = req.query as { sub?: string };
    const { abs: cwd } = resolveInside(ws.path, sub, { mustExist: true });
    if (!which("git")) return { available: false, reason: "git is not installed" };
    const top = await gitAvailable(cwd);
    if (!top) return { available: false, reason: "This folder is not a git repository" };
    const st = await run("git", ["status", "--porcelain=v1", "--branch", "-uall"], { cwd });
    const lines = st.stdout.split("\n").filter(Boolean);
    const head = lines.shift() ?? "";
    const m = head.match(/^## (?:No commits yet on )?([^.\s]+)(?:\.\.\.(\S+))?(?: \[(.+)\])?/);
    const ahead = Number(m?.[3]?.match(/ahead (\d+)/)?.[1] ?? 0);
    const behind = Number(m?.[3]?.match(/behind (\d+)/)?.[1] ?? 0);
    const files = lines.map((l) => ({ index: l[0], worktree: l[1], path: l.slice(3) }));
    const log = await run("git", ["log", "-n", "25", "--pretty=format:%h%x1f%an%x1f%ad%x1f%s", "--date=iso-strict"], { cwd });
    const commits = log.code === 0 ? log.stdout.split("\n").filter(Boolean).map((l) => { const [hash, author, date, subject] = l.split("\x1f"); return { hash, author, date, subject }; }) : [];
    const br = await run("git", ["branch", "--format=%(refname:short)"], { cwd });
    return { available: true, root: top, branch: m?.[1] ?? "unknown", upstream: m?.[2] ?? null, ahead, behind, files, commits, branches: br.stdout.split("\n").filter(Boolean) };
  });

  app.get("/api/workspaces/:id/git/diff", async (req) => {
    const ws = getWorkspace(db, idParam(req.params));
    const { path: p, sub = "", commit } = req.query as { path?: string; sub?: string; commit?: string };
    const { abs: cwd } = resolveInside(ws.path, sub, { mustExist: true });
    if (commit) {
      if (!/^[0-9a-f]{4,40}$/i.test(commit)) throw badRequest("Invalid commit");
      const r = await run("git", ["show", "--stat", "--patch", "--no-color", commit], { cwd });
      return { diff: r.stdout.slice(0, 400_000) };
    }
    const args = ["diff", "--no-color", "HEAD", "--"];
    if (p) {
      if (isSecretFile(p)) throw forbidden("Secret files are blocked");
      args.push(p);
    }
    const r = await run("git", args, { cwd });
    let diff = r.stdout;
    if (!diff && p) {
      // Untracked file: show it as an addition.
      const { abs } = resolveInside(cwd, p, { mustExist: true });
      if (fs.statSync(abs).size < 200_000) diff = fs.readFileSync(abs, "utf8").split("\n").map((l) => "+" + l).join("\n");
    }
    return { diff: diff.slice(0, 400_000) };
  });

  app.post("/api/workspaces/:id/git/commit", async (req) => {
    const ws = getWorkspace(db, idParam(req.params));
    const b = parse(z.object({ message: z.string().trim().min(1).max(2000), sub: z.string().default(""), paths: z.array(z.string().min(1)).max(500).optional() }), req.body);
    requireConfirm(req, "create a git commit");
    const { abs: cwd } = resolveInside(ws.path, b.sub, { mustExist: true });
    if (!(await gitAvailable(cwd))) throw badRequest("Not a git repository");
    if (b.paths?.some(isSecretFile)) throw forbidden("Refusing to commit secret files (.env, keys)");
    const add = await run("git", b.paths?.length ? ["add", "--", ...b.paths] : ["add", "-A"], { cwd });
    if (add.code !== 0) throw badRequest(add.stderr);
    // Block secrets that were staged by `add -A`.
    const staged = await run("git", ["diff", "--cached", "--name-only"], { cwd });
    const secrets = staged.stdout.split("\n").filter((f) => f && isSecretFile(f));
    if (secrets.length) {
      await run("git", ["reset", "-q", "--", ...secrets], { cwd });
      throw forbidden(`Refusing to commit secret files: ${secrets.join(", ")}. Add them to .gitignore.`);
    }
    const c = await run("git", ["commit", "-m", b.message], { cwd });
    if (c.code !== 0) throw badRequest(c.stdout + c.stderr || "Commit failed");
    logActivity(db, "codelab", "git.commit", `Committed in ${ws.name}: ${b.message.split("\n")[0]}`);
    return { ok: true, output: c.stdout };
  });

  // ---- Scripts (only those defined in the project's package.json) ----
  const readScripts = (cwd: string) => {
    const pkg = path.join(cwd, "package.json");
    if (!fs.existsSync(pkg)) return null;
    try {
      return (JSON.parse(fs.readFileSync(pkg, "utf8")).scripts ?? {}) as Record<string, string>;
    } catch {
      return null;
    }
  };

  app.get("/api/workspaces/:id/scripts", async (req) => {
    const ws = getWorkspace(db, idParam(req.params));
    const { sub = "" } = req.query as { sub?: string };
    const { abs, rel } = resolveInside(ws.path, sub, { mustExist: true });
    const scripts = readScripts(abs);
    return {
      cwd: rel,
      hasPackageJson: scripts !== null,
      hasNodeModules: fs.existsSync(path.join(abs, "node_modules")),
      npm: Boolean(which("npm")),
      scripts: scripts ? Object.entries(scripts).map(([name, command]) => ({ name, command })) : [],
    };
  });

  app.post("/api/workspaces/:id/scripts/run", async (req, reply) => {
    const ws = getWorkspace(db, idParam(req.params));
    const b = parse(z.object({ sub: z.string().default(""), script: z.string().min(1).max(100), install: z.boolean().default(false) }), req.body);
    const { abs: cwd, rel } = resolveInside(ws.path, b.sub, { mustExist: true });
    const npm = which("npm");
    if (!npm) throw new HttpError(424, "npm was not found on this computer", "not_configured");
    let args: string[];
    let label: string;
    if (b.install) {
      args = ["install"];
      label = "npm install";
    } else {
      const scripts = readScripts(cwd);
      if (!scripts || !(b.script in scripts)) throw badRequest(`No script named "${b.script}" in package.json`);
      args = ["run", b.script];
      label = `npm run ${b.script}`;
    }
    requireConfirm(req, `run "${label}" in ${ws.name}/${rel}`);
    const command = b.install ? "npm install" : `npm run ${b.script}  →  ${readScripts(cwd)![b.script]}`;
    const runId = Number(
      db.prepare("INSERT INTO script_runs (workspace_id, cwd, label, command, status, started_at) VALUES (?, ?, ?, ?, 'running', ?)").run(ws.id, rel, label, command, now()).lastInsertRowid,
    );
    let log = "";
    let pending = false;
    const flush = () => {
      pending = false;
      db.prepare("UPDATE script_runs SET log = ? WHERE id = ?").run(log.slice(-500_000), runId);
    };
    const proc = spawnStreaming(npm, args, cwd, (_s, text) => {
      log += text;
      if (!pending) {
        pending = true;
        setTimeout(flush, 300);
      }
    });
    runningScripts.set(runId, proc);
    logActivity(db, "codelab", "script.started", `Started ${label} in ${ws.name}${rel ? "/" + rel : ""}`);
    void proc.done.then(({ code, signal }) => {
      runningScripts.delete(runId);
      flush();
      const status = signal ? "cancelled" : code === 0 ? "succeeded" : "failed";
      db.prepare("UPDATE script_runs SET status = ?, exit_code = ?, finished_at = ? WHERE id = ?").run(status, code, now(), runId);
      logActivity(db, "codelab", `script.${status}`, `${label} ${status}${code !== null ? ` (exit ${code})` : ""}`);
    });
    reply.code(202);
    return { id: runId };
  });

  app.get("/api/runs", async (req) => {
    const { workspace_id } = req.query as { workspace_id?: string };
    return workspace_id
      ? db.prepare("SELECT id, workspace_id, cwd, label, status, exit_code, started_at, finished_at FROM script_runs WHERE workspace_id = ? ORDER BY id DESC LIMIT 50").all(Number(workspace_id))
      : db.prepare("SELECT r.id, r.workspace_id, w.name AS workspace_name, r.cwd, r.label, r.status, r.exit_code, r.started_at, r.finished_at FROM script_runs r JOIN workspaces w ON w.id = r.workspace_id ORDER BY r.id DESC LIMIT 50").all();
  });

  app.get("/api/runs/:id", async (req) => {
    const r = db.prepare("SELECT * FROM script_runs WHERE id = ?").get(idParam(req.params));
    if (!r) throw notFound("Run");
    return r;
  });

  app.post("/api/runs/:id/stop", async (req) => {
    const id = idParam(req.params);
    const p = runningScripts.get(id);
    if (!p) throw badRequest("That run is not running");
    p.child.kill("SIGTERM");
    return { ok: true };
  });

  // ---- Static preview of workspace files (sandboxed; see security.ts) ----
  app.get("/preview/:token/:id/*", async (req, reply) => {
    const token = (req.params as { token: string }).token;
    if (token.length !== ctx.previewToken.length || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(ctx.previewToken))) throw notFound("Preview");
    const ws = getWorkspace(db, idParam(req.params));
    const rest = decodeURIComponent((req.params as { "*": string })["*"] ?? "");
    let { abs } = resolveInside(ws.path, rest, { mustExist: true });
    if (fs.statSync(abs).isDirectory()) {
      if (!req.url.split("?")[0].endsWith("/")) return reply.redirect(req.url.split("?")[0] + "/");
      abs = path.join(abs, "index.html");
      if (!fs.existsSync(abs)) throw notFound("index.html in that folder");
    }
    reply.header("content-type", mimeFor(abs));
    reply.header("cache-control", "no-store");
    return reply.send(fs.createReadStream(abs));
  });
}

export function stopAllScripts() {
  for (const p of runningScripts.values()) p.child.kill("SIGTERM");
}
