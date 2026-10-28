import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { getWorkspace } from "../context.js";
import { getSetting, json, now } from "../db/index.js";
import { logActivity } from "../lib/activity.js";
import { run, spawnStreaming, which } from "../lib/exec.js";
import { resolveInside } from "../lib/paths.js";

export const scheduleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("manual") }),
  z.object({ type: z.literal("interval"), minutes: z.number().int().min(5).max(60 * 24 * 7) }),
  z.object({ type: z.literal("daily"), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }),
]);
export type Schedule = z.infer<typeof scheduleSchema>;

export const automationKinds = {
  backup: {
    label: "Back up the Atlas database",
    config: z.object({ keep: z.number().int().min(1).max(365).default(14) }),
  },
  http_check: {
    label: "Check a website is up",
    config: z.object({ url: z.string().url().refine((u) => /^https?:/i.test(u), "Must be http(s)"), expectStatus: z.number().int().default(200) }),
  },
  git_snapshot: {
    label: "Record git status of a workspace",
    config: z.object({ workspace_id: z.number().int(), sub: z.string().default("") }),
  },
  script: {
    label: "Run a package.json script",
    config: z.object({ workspace_id: z.number().int(), sub: z.string().default(""), script: z.string().min(1), approvedCommand: z.string().default("") }),
  },
  ai_digest: {
    label: "AI summary of open tasks → Knowledge Vault",
    config: z.object({ project_id: z.number().int().nullable().default(null) }),
  },
} as const;
export type AutomationKind = keyof typeof automationKinds;

export function nextRun(s: Schedule, from = new Date()): string | null {
  if (s.type === "manual") return null;
  if (s.type === "interval") return new Date(from.getTime() + s.minutes * 60_000).toISOString();
  const [h, m] = s.time.split(":").map(Number);
  const d = new Date(from);
  d.setHours(h, m, 0, 0);
  if (d <= from) d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export function readScriptCommand(ctx: AppContext, workspaceId: number, sub: string, script: string) {
  const ws = getWorkspace(ctx.db, workspaceId);
  const { abs } = resolveInside(ws.path, sub, { mustExist: true });
  const pkg = path.join(abs, "package.json");
  if (!fs.existsSync(pkg)) return { cwd: abs, command: null };
  const scripts = JSON.parse(fs.readFileSync(pkg, "utf8")).scripts ?? {};
  return { cwd: abs, command: (scripts[script] as string | undefined) ?? null };
}

export function registerAutomationHandlers(ctx: AppContext) {
  const { db, jobs } = ctx;

  jobs.register("backup", async (p: { keep?: number }, jc) => {
    const keep = p.keep ?? 14;
    const file = path.join(ctx.paths.backups, `atlas-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
    db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
    const size = fs.statSync(file).size;
    jc.log(`Wrote ${file} (${Math.round(size / 1024)} KB)`);
    const old = fs.readdirSync(ctx.paths.backups).filter((f) => /^atlas-.*\.db$/.test(f)).sort().reverse().slice(keep);
    for (const f of old) fs.rmSync(path.join(ctx.paths.backups, f));
    if (old.length) jc.log(`Removed ${old.length} old backup(s), keeping ${keep}`);
    logActivity(db, "automation", "backup", `Database backed up (${Math.round(size / 1024)} KB)`);
    return { file: path.basename(file), size };
  });

  jobs.register("http_check", async (p: { url: string; expectStatus?: number }, jc) => {
    const t0 = Date.now();
    try {
      const r = await fetch(p.url, { method: "GET", redirect: "follow", signal: AbortSignal.any([jc.signal, AbortSignal.timeout(15000)]) });
      const ms = Date.now() - t0;
      jc.log(`${p.url} → HTTP ${r.status} in ${ms} ms`);
      if (r.status !== (p.expectStatus ?? 200)) throw new Error(`Expected HTTP ${p.expectStatus ?? 200}, got ${r.status}`);
      return { status: r.status, ms };
    } catch (e) {
      logActivity(db, "automation", "http_check.failed", `Website check failed: ${p.url}`);
      throw e;
    }
  });

  jobs.register("git_snapshot", async (p: { workspace_id: number; sub?: string }, jc) => {
    const ws = getWorkspace(db, p.workspace_id);
    const { abs } = resolveInside(ws.path, p.sub ?? "", { mustExist: true });
    const r = await run("git", ["status", "--short", "--branch"], { cwd: abs });
    if (r.code !== 0) throw new Error(r.stderr || "git status failed");
    jc.log(r.stdout);
    const changed = r.stdout.split("\n").filter((l) => l && !l.startsWith("##")).length;
    return { changedFiles: changed, branch: r.stdout.split("\n")[0]?.replace(/^## /, "") };
  });

  jobs.register("script", async (p: { workspace_id: number; sub?: string; script: string; approvedCommand: string }, jc) => {
    const { cwd, command } = readScriptCommand(ctx, p.workspace_id, p.sub ?? "", p.script);
    if (command === null) throw new Error(`Script "${p.script}" no longer exists`);
    if (command !== p.approvedCommand) throw new Error(`Blocked: the script changed since you approved it.\nApproved: ${p.approvedCommand}\nNow: ${command}\nEdit the automation to re-approve.`);
    const npm = which("npm");
    if (!npm) throw new Error("npm not found");
    jc.log(`$ npm run ${p.script}   (${command})`);
    const proc = spawnStreaming(npm, ["run", p.script], cwd, (_s, t) => jc.log(t.trimEnd()), 30 * 60_000);
    jc.signal.addEventListener("abort", () => proc.child.kill("SIGTERM"));
    const { code } = await proc.done;
    if (code !== 0) throw new Error(`Exited with code ${code}`);
    return { exitCode: code };
  });

  jobs.register("ai_digest", async (p: { project_id: number | null }, jc) => {
    const provider = await ctx.ai.pickDefault(getSetting<string | null>(db, "ai.defaultProvider", null));
    if (!provider) throw new Error("No AI provider is configured");
    const tasks = db.prepare("SELECT t.title, t.status, t.priority, t.due_date, p.name AS project FROM tasks t LEFT JOIN projects p ON p.id = t.project_id WHERE t.status != 'done' AND (? IS NULL OR t.project_id = ?) ORDER BY t.due_date IS NULL, t.due_date LIMIT 80").all(p.project_id, p.project_id) as any[];
    const acts = db.prepare("SELECT ts, message FROM activity WHERE ts > ? ORDER BY id DESC LIMIT 60").all(new Date(Date.now() - 86_400_000 * 2).toISOString()) as any[];
    jc.log(`Summarising ${tasks.length} open tasks and ${acts.length} recent events with ${provider.label}`);
    const result = await provider.chat(
      {
        model: getSetting<string | null>(db, `ai.model.${provider.id}`, null) ?? provider.defaultModel,
        system: "You write short, plain-language daily briefings for a busy young founder. Use Markdown with headings: Today, Overdue, Up next, What happened. Be concise. Do not invent tasks.",
        history: [],
        userText: `Date: ${new Date().toISOString().slice(0, 10)}\n\nOpen tasks:\n${tasks.map((t) => `- ${t.title} [${t.status}, ${t.priority}${t.due_date ? `, due ${t.due_date}` : ""}${t.project ? `, ${t.project}` : ""}]`).join("\n") || "(none)"}\n\nRecent activity:\n${acts.map((a) => `- ${a.ts.slice(0, 16)} ${a.message}`).join("\n") || "(none)"}`,
        tools: [],
        signal: jc.signal,
        maxTokens: 4000,
      },
      () => undefined,
    );
    const t = now();
    const noteId = Number(db.prepare("INSERT INTO notes (project_id, kind, title, body, tags, created_at, updated_at) VALUES (?, 'note', ?, ?, 'digest,ai', ?, ?)").run(p.project_id, `Daily digest ${t.slice(0, 10)}`, result.text, t, t).lastInsertRowid);
    logActivity(db, "automation", "ai_digest", `AI digest saved to the Knowledge Vault`, p.project_id);
    jc.log(`Saved note #${noteId}`);
    return { note_id: noteId };
  });
}

/** Checks every 30 s for automations that are due and enqueues them. */
export function startScheduler(ctx: AppContext) {
  const tick = () => {
    const due = ctx.db.prepare("SELECT * FROM automations WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?").all(now()) as any[];
    for (const a of due) {
      const running = ctx.db.prepare("SELECT 1 FROM jobs WHERE automation_id = ? AND status IN ('queued','running')").get(a.id);
      const sched = json<Schedule>(a.schedule, { type: "manual" });
      ctx.db.prepare("UPDATE automations SET next_run_at = ? WHERE id = ?").run(nextRun(sched), a.id);
      if (running) continue; // don't pile up runs
      ctx.jobs.enqueue(a.kind, a.name, json(a.config, {}), a.id);
      ctx.db.prepare("UPDATE automations SET last_run_at = ? WHERE id = ?").run(now(), a.id);
    }
  };
  tick();
  const timer = setInterval(tick, 30_000);
  timer.unref();
  return () => clearInterval(timer);
}
