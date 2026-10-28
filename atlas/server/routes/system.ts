import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { APP_ROOT, isLoopback } from "../config.js";
import type { AppContext } from "../context.js";
import { getSetting, json, now, setSetting } from "../db/index.js";
import { automationKinds, nextRun, readScriptCommand, scheduleSchema, type AutomationKind } from "../jobs/automations.js";
import { logActivity } from "../lib/activity.js";
import { badRequest, notFound } from "../lib/errors.js";
import { run } from "../lib/exec.js";
import { isSecretFile } from "../lib/paths.js";
import { requireConfirm } from "../lib/security.js";
import { idParam, parse } from "../lib/validate.js";
import { listIntegrations, testIntegration } from "../integrations/registry.js";

export const DEFAULT_WIDGETS = ["quick-actions", "projects", "tasks", "progress", "activity", "ai-jobs", "system"];

export function systemRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db } = ctx;
  const diskTargets = () => [
    { label: "Atlas data", path: ctx.paths.data },
    ...(db.prepare("SELECT name, path FROM workspaces").all() as any[]).filter((w) => fs.existsSync(w.path)).map((w) => ({ label: w.name, path: w.path })),
  ];

  // ---- Metrics & logs ----
  app.get("/api/system/metrics", async () => {
    const snap = ctx.metrics.snapshot(diskTargets());
    // Deduplicate disks that live on the same volume.
    const seen = new Set<string>();
    snap.disks = snap.disks.filter((d) => {
      const k = `${d.total}:${d.free}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    let dbSize = 0;
    for (const f of [ctx.paths.db, ctx.paths.db + "-wal"]) if (fs.existsSync(f)) dbSize += fs.statSync(f).size;
    const uploads = fs.readdirSync(ctx.paths.uploads).reduce((a, f) => a + (fs.statSync(path.join(ctx.paths.uploads, f)).isFile() ? fs.statSync(path.join(ctx.paths.uploads, f)).size : 0), 0);
    const jobsCount = db.prepare("SELECT status, COUNT(*) n FROM jobs GROUP BY status").all();
    return { ...snap, atlas: { dbSize, uploadsSize: uploads, jobs: jobsCount } };
  });

  app.get("/api/system/logs", async (req) => {
    const { level } = req.query as { level?: string };
    return level
      ? db.prepare("SELECT * FROM app_log WHERE level = ? ORDER BY id DESC LIMIT 300").all(level)
      : db.prepare("SELECT * FROM app_log ORDER BY id DESC LIMIT 300").all();
  });

  app.get("/api/system/security", async () => {
    const checks: { id: string; title: string; status: "pass" | "warn" | "fail" | "info"; detail: string; fix?: string }[] = [];
    const c = ctx.config;
    checks.push(
      isLoopback(c.host)
        ? { id: "bind", title: "Only this computer can open Atlas", status: "pass", detail: `Listening on ${c.host}:${c.port}` }
        : c.accessToken
          ? { id: "bind", title: "Atlas is reachable from your network", status: "warn", detail: `Listening on ${c.host}. Protected by an access token.`, fix: "Set ATLAS_HOST=127.0.0.1 when you don't need other devices." }
          : { id: "bind", title: "Atlas is reachable without a token", status: "fail", detail: `Listening on ${c.host}`, fix: "Set ATLAS_ACCESS_TOKEN or ATLAS_HOST=127.0.0.1" },
    );
    if (c.accessToken) checks.push(c.accessToken.length >= 24 ? { id: "token", title: "Access token is long enough", status: "pass", detail: `${c.accessToken.length} characters` } : { id: "token", title: "Access token is short", status: "warn", detail: `${c.accessToken.length} characters`, fix: "Use at least 24 random characters" });

    const envFile = path.join(APP_ROOT, ".env");
    if (fs.existsSync(envFile)) {
      const tracked = await run("git", ["ls-files", "--error-unmatch", ".env"], { cwd: APP_ROOT });
      checks.push(tracked.code === 0 ? { id: "env-git", title: ".env is committed to git", status: "fail", detail: "Your API keys are in git history", fix: "Run `git rm --cached atlas/.env`, then rotate every key in it" } : { id: "env-git", title: ".env is not in git", status: "pass", detail: "Keys stay on this computer" });
      const mode = fs.statSync(envFile).mode & 0o077;
      checks.push(mode ? { id: "env-perm", title: ".env can be read by other users", status: "warn", detail: `Permissions ${(fs.statSync(envFile).mode & 0o777).toString(8)}`, fix: "Run `chmod 600 atlas/.env`" } : { id: "env-perm", title: ".env is private to you", status: "pass", detail: "Permissions 600" });
    } else {
      checks.push({ id: "env", title: "No .env file", status: "info", detail: "No API keys configured. Copy .env.example to .env when you need them." });
    }

    const lastBackup = fs.readdirSync(ctx.paths.backups).filter((f) => /^atlas-.*\.db$/.test(f)).sort().at(-1);
    const age = lastBackup ? Date.now() - fs.statSync(path.join(ctx.paths.backups, lastBackup)).mtimeMs : Infinity;
    checks.push(age < 3 * 86_400_000 ? { id: "backup", title: "Recent database backup", status: "pass", detail: lastBackup! } : { id: "backup", title: "No recent backup", status: "warn", detail: lastBackup ? `Last: ${lastBackup}` : "No backups yet", fix: "Run the backup automation (Automation Center)" });

    const nodeMajor = Number(process.versions.node.split(".")[0]);
    const nodeMinor = Number(process.versions.node.split(".")[1]);
    checks.push(nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 13) ? { id: "node", title: "Node.js is supported", status: "pass", detail: process.version } : { id: "node", title: "Node.js is old", status: "warn", detail: process.version, fix: "Install Node.js 22 LTS or newer" });

    for (const w of db.prepare("SELECT * FROM workspaces").all() as any[]) {
      if (!fs.existsSync(w.path)) {
        checks.push({ id: `ws-${w.id}`, title: `Workspace "${w.name}" is missing`, status: "warn", detail: w.path, fix: "Remove it in Code Lab or restore the folder" });
        continue;
      }
      const ls = await run("git", ["ls-files"], { cwd: w.path, timeoutMs: 10000 });
      if (ls.code !== 0) continue;
      const secrets = ls.stdout.split("\n").filter((f) => f && isSecretFile(f));
      checks.push(secrets.length ? { id: `ws-${w.id}`, title: `Secret-looking files committed in "${w.name}"`, status: "fail", detail: secrets.slice(0, 10).join(", "), fix: "Remove them from git, add to .gitignore, and rotate any keys" } : { id: `ws-${w.id}`, title: `No secret files committed in "${w.name}"`, status: "pass", detail: "Checked .env, keys and credential files" });
    }
    checks.push({ id: "design", title: "How Atlas protects you", status: "info", detail: "API keys are read only by the server and never sent to the browser. File access is limited to workspaces you add. Deleting, saving files, running scripts and commits need your confirmation. Previews of your sites run sandboxed." });
    return { checkedAt: now(), checks };
  });

  // ---- Jobs ----
  app.get("/api/jobs", async (req) => {
    const { kind_prefix, limit } = req.query as { kind_prefix?: string; limit?: string };
    const n = Math.min(Number(limit ?? 50), 200);
    const rows = kind_prefix
      ? db.prepare("SELECT id, kind, title, status, error, automation_id, created_at, started_at, finished_at, result FROM jobs WHERE kind LIKE ? ORDER BY id DESC LIMIT ?").all(`${kind_prefix}%`, n)
      : db.prepare("SELECT id, kind, title, status, error, automation_id, created_at, started_at, finished_at, result FROM jobs ORDER BY id DESC LIMIT ?").all(n);
    return (rows as any[]).map((r) => ({ ...r, result: json(r.result, null) }));
  });
  app.get("/api/jobs/:id", async (req) => {
    const j = ctx.jobs.get(idParam(req.params));
    if (!j) throw notFound("Job");
    return j;
  });
  app.post("/api/jobs/:id/cancel", async (req) => ({ ok: ctx.jobs.cancel(idParam(req.params)) }));

  // ---- Automations ----
  const automationInput = z.object({
    name: z.string().trim().min(1).max(120),
    kind: z.enum(Object.keys(automationKinds) as [AutomationKind, ...AutomationKind[]]),
    config: z.record(z.unknown()).default({}),
    schedule: scheduleSchema,
    enabled: z.boolean().default(true),
  });
  const hydrateAutomation = (a: any) => ({ ...a, config: json(a.config, {}), schedule: json(a.schedule, { type: "manual" }), enabled: Boolean(a.enabled) });

  app.get("/api/automations/kinds", async () => Object.entries(automationKinds).map(([id, k]) => ({ id, label: k.label })));
  app.get("/api/automations", async () =>
    (db.prepare(`SELECT a.*, (SELECT status FROM jobs j WHERE j.automation_id = a.id ORDER BY j.id DESC LIMIT 1) AS last_status FROM automations a ORDER BY a.id`).all() as any[]).map(hydrateAutomation),
  );

  const prepareConfig = (kind: AutomationKind, raw: unknown) => {
    const r = automationKinds[kind].config.safeParse(raw);
    if (!r.success) throw badRequest(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    const cfg = r.data as Record<string, unknown>;
    if (kind === "script") {
      // Approval snapshot: the exact command text the user saw when confirming.
      const { command } = readScriptCommand(ctx, cfg.workspace_id as number, cfg.sub as string, cfg.script as string);
      if (command === null) throw badRequest(`No script "${cfg.script}" in that folder's package.json`);
      cfg.approvedCommand = command;
    }
    return cfg;
  };

  app.post("/api/automations", async (req, reply) => {
    const b = parse(automationInput, req.body);
    if (b.kind === "script") requireConfirm(req, "let Atlas run this script on a schedule");
    const cfg = prepareConfig(b.kind, b.config);
    const id = Number(db.prepare("INSERT INTO automations (name, kind, config, schedule, enabled, next_run_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(b.name, b.kind, JSON.stringify(cfg), JSON.stringify(b.schedule), b.enabled ? 1 : 0, b.enabled ? nextRun(b.schedule) : null, now()).lastInsertRowid);
    logActivity(db, "automation", "automation.created", `Created automation "${b.name}"`);
    reply.code(201);
    return hydrateAutomation(db.prepare("SELECT * FROM automations WHERE id = ?").get(id));
  });

  app.patch("/api/automations/:id", async (req) => {
    const id = idParam(req.params);
    const a = db.prepare("SELECT * FROM automations WHERE id = ?").get(id) as any;
    if (!a) throw notFound("Automation");
    const b = parse(automationInput.partial(), req.body);
    const kind = (b.kind ?? a.kind) as AutomationKind;
    if (kind === "script" && b.config) requireConfirm(req, "re-approve this script");
    const cfg = b.config ? prepareConfig(kind, b.config) : json(a.config, {});
    const schedule = b.schedule ?? json(a.schedule, { type: "manual" });
    const enabled = b.enabled ?? Boolean(a.enabled);
    db.prepare("UPDATE automations SET name = ?, kind = ?, config = ?, schedule = ?, enabled = ?, next_run_at = ? WHERE id = ?").run(b.name ?? a.name, kind, JSON.stringify(cfg), JSON.stringify(schedule), enabled ? 1 : 0, enabled ? nextRun(schedule) : null, id);
    return hydrateAutomation(db.prepare("SELECT * FROM automations WHERE id = ?").get(id));
  });

  app.post("/api/automations/:id/run", async (req, reply) => {
    const id = idParam(req.params);
    const a = db.prepare("SELECT * FROM automations WHERE id = ?").get(id) as any;
    if (!a) throw notFound("Automation");
    const jobId = ctx.jobs.enqueue(a.kind, a.name, json(a.config, {}), id);
    db.prepare("UPDATE automations SET last_run_at = ? WHERE id = ?").run(now(), id);
    reply.code(202);
    return { job_id: jobId };
  });

  app.delete("/api/automations/:id", async (req) => {
    const id = idParam(req.params);
    const a = db.prepare("SELECT * FROM automations WHERE id = ?").get(id) as any;
    if (!a) throw notFound("Automation");
    requireConfirm(req, `delete automation "${a.name}"`);
    db.prepare("DELETE FROM automations WHERE id = ?").run(id);
    return { ok: true };
  });

  // ---- Backups ----
  app.get("/api/backups", async () =>
    fs.readdirSync(ctx.paths.backups).filter((f) => /^atlas-.*\.db$/.test(f)).sort().reverse().map((f) => ({ name: f, size: fs.statSync(path.join(ctx.paths.backups, f)).size, created_at: fs.statSync(path.join(ctx.paths.backups, f)).mtime.toISOString() })),
  );
  app.post("/api/backups", async (_req, reply) => {
    const id = ctx.jobs.enqueue("backup", "Manual backup", { keep: getSetting<number>(db, "backup.keep", 14) });
    const job = await ctx.jobs.waitFor(id, 60_000);
    if (job.status !== "succeeded") throw badRequest(job.error ?? "Backup failed");
    reply.code(201);
    return job.result;
  });
  app.get("/api/backups/:name", async (req, reply) => {
    const name = (req.params as { name: string }).name;
    if (!/^atlas-[\w-]+\.db$/.test(name)) throw badRequest("Invalid backup name");
    const file = path.join(ctx.paths.backups, name);
    if (!fs.existsSync(file)) throw notFound("Backup");
    reply.header("content-type", "application/octet-stream");
    reply.header("content-disposition", `attachment; filename="${name}"`);
    return reply.send(fs.createReadStream(file));
  });

  // ---- Settings ----
  app.get("/api/settings", async () => ({
    widgets: getSetting<string[]>(db, "dashboard.widgets", DEFAULT_WIDGETS),
    defaultProvider: getSetting<string | null>(db, "ai.defaultProvider", null),
    models: { anthropic: getSetting(db, "ai.model.anthropic", null), openai: getSetting(db, "ai.model.openai", null), ollama: getSetting(db, "ai.model.ollama", null) },
    customInstructions: getSetting<string>(db, "ai.customInstructions", ""),
    backupKeep: getSetting<number>(db, "backup.keep", 14),
    userName: getSetting<string>(db, "user.name", ""),
    server: { host: ctx.config.host, port: ctx.config.port, dataDir: ctx.paths.data, tokenProtected: Boolean(ctx.config.accessToken) },
    previewToken: ctx.previewToken,
  }));
  app.patch("/api/settings", async (req) => {
    const b = parse(
      z.object({
        widgets: z.array(z.string().max(40)).max(20).optional(),
        defaultProvider: z.enum(["anthropic", "openai", "ollama"]).nullable().optional(),
        models: z.object({ anthropic: z.string().max(100).nullable().optional(), openai: z.string().max(100).nullable().optional(), ollama: z.string().max(100).nullable().optional() }).optional(),
        customInstructions: z.string().max(5000).optional(),
        backupKeep: z.number().int().min(1).max(365).optional(),
        userName: z.string().max(80).optional(),
      }),
      req.body,
    );
    if (b.widgets) setSetting(db, "dashboard.widgets", b.widgets);
    if (b.defaultProvider !== undefined) setSetting(db, "ai.defaultProvider", b.defaultProvider);
    if (b.models) for (const [k, v] of Object.entries(b.models)) if (v !== undefined) setSetting(db, `ai.model.${k}`, v || null);
    if (b.customInstructions !== undefined) setSetting(db, "ai.customInstructions", b.customInstructions);
    if (b.backupKeep !== undefined) setSetting(db, "backup.keep", b.backupKeep);
    if (b.userName !== undefined) setSetting(db, "user.name", b.userName);
    return { ok: true };
  });

  // ---- Integrations ----
  app.get("/api/integrations", async () => {
    return listIntegrations(ctx, (await ctx.ai.refreshOllama()) !== null);
  });
  app.post("/api/integrations/:id/test", async (req) => testIntegration(ctx, (req.params as { id: string }).id));

  // ---- Mission Control summary ----
  app.get("/api/dashboard", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const counts = db.prepare(`SELECT
        (SELECT COUNT(*) FROM projects WHERE status = 'active') AS active_projects,
        (SELECT COUNT(*) FROM tasks WHERE status != 'done') AS open_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status != 'done' AND due_date IS NOT NULL AND due_date < ?) AS overdue,
        (SELECT COUNT(*) FROM tasks WHERE status != 'done' AND due_date = ?) AS due_today,
        (SELECT COUNT(*) FROM tasks WHERE status = 'done' AND completed_at >= ?) AS done_this_week,
        (SELECT COUNT(*) FROM notes) AS notes,
        (SELECT COUNT(*) FROM conversations) AS conversations`).get(today, today, new Date(Date.now() - 7 * 86_400_000).toISOString());
    const aiJobs = (db.prepare("SELECT id, kind, title, status, error, created_at, finished_at FROM jobs WHERE kind LIKE 'ai%' OR kind LIKE 'image%' ORDER BY id DESC LIMIT 8").all() as any[]);
    const runningScripts = db.prepare("SELECT r.id, r.label, w.name AS workspace_name, r.started_at FROM script_runs r JOIN workspaces w ON w.id = r.workspace_id WHERE r.status = 'running'").all();
    return { counts, aiJobs, runningScripts, providers: (await ctx.ai.describe()).map((p) => ({ id: p.id, label: p.label, configured: p.configured })) };
  });
}
