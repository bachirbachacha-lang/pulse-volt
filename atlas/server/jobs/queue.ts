import type { DB } from "../db/index.js";
import { json, now } from "../db/index.js";
import { appLog } from "../lib/activity.js";

export interface JobContext {
  jobId: number;
  log: (line: string) => void;
  signal: AbortSignal;
}

export type JobHandler = (payload: any, ctx: JobContext) => Promise<unknown>;

export interface JobRow {
  id: number;
  kind: string;
  title: string;
  payload: unknown;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  result: unknown;
  error: string | null;
  log: string;
  automation_id: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

/**
 * A small persistent job queue in SQLite with an in-process worker.
 * Good enough for one person on one computer; swap for a real queue only if that stops being true.
 */
export class JobQueue {
  private handlers = new Map<string, JobHandler>();
  private running = new Map<number, AbortController>();
  private timer: NodeJS.Timeout | null = null;
  private busy = false;

  constructor(
    private db: DB,
    private concurrency = 2,
  ) {
    // Anything left "running" from a previous process was interrupted.
    db.prepare("UPDATE jobs SET status = 'failed', error = 'Interrupted: Atlas was restarted while this job ran', finished_at = ? WHERE status = 'running'").run(now());
  }

  register(kind: string, handler: JobHandler) {
    this.handlers.set(kind, handler);
  }

  kinds() {
    return [...this.handlers.keys()];
  }

  enqueue(kind: string, title: string, payload: unknown, automationId: number | null = null): number {
    if (!this.handlers.has(kind)) throw new Error(`Unknown job kind: ${kind}`);
    const r = this.db
      .prepare("INSERT INTO jobs (kind, title, payload, status, automation_id, created_at) VALUES (?, ?, ?, 'queued', ?, ?)")
      .run(kind, title, JSON.stringify(payload ?? {}), automationId, now());
    queueMicrotask(() => void this.tick());
    return Number(r.lastInsertRowid);
  }

  cancel(id: number) {
    const ctl = this.running.get(id);
    if (ctl) {
      ctl.abort();
      return true;
    }
    const r = this.db.prepare("UPDATE jobs SET status = 'cancelled', finished_at = ? WHERE id = ? AND status = 'queued'").run(now(), id);
    return r.changes > 0;
  }

  get(id: number): JobRow | null {
    const row = this.db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
    return row ? JobQueue.hydrate(row) : null;
  }

  static hydrate(row: any): JobRow {
    return { ...row, payload: json(row.payload, {}), result: json(row.result, null) };
  }

  start(intervalMs = 1000) {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const c of this.running.values()) c.abort();
  }

  /** Waits until a job reaches a final state (used by tests and synchronous callers). */
  async waitFor(id: number, timeoutMs = 15000): Promise<JobRow> {
    const until = Date.now() + timeoutMs;
    for (;;) {
      await this.tick();
      const j = this.get(id);
      if (j && !["queued", "running"].includes(j.status)) return j;
      if (Date.now() > until) throw new Error(`Job ${id} did not finish in time`);
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      while (this.running.size < this.concurrency) {
        const row = this.db.prepare("SELECT * FROM jobs WHERE status = 'queued' ORDER BY id LIMIT 1").get() as any;
        if (!row) break;
        const claimed = this.db.prepare("UPDATE jobs SET status = 'running', started_at = ? WHERE id = ? AND status = 'queued'").run(now(), row.id);
        if (claimed.changes === 0) continue;
        void this.execute(JobQueue.hydrate(row));
      }
    } finally {
      this.busy = false;
    }
  }

  private async execute(job: JobRow) {
    const handler = this.handlers.get(job.kind);
    const ctl = new AbortController();
    this.running.set(job.id, ctl);
    const lines: string[] = [];
    const flush = () => this.db.prepare("UPDATE jobs SET log = ? WHERE id = ?").run(lines.join("\n").slice(-200_000), job.id);
    const log = (line: string) => {
      lines.push(`[${new Date().toLocaleTimeString()}] ${line}`);
      flush();
    };
    try {
      if (!handler) throw new Error(`No handler for ${job.kind}`);
      const result = await handler(job.payload, { jobId: job.id, log, signal: ctl.signal });
      const status = ctl.signal.aborted ? "cancelled" : "succeeded";
      this.db.prepare("UPDATE jobs SET status = ?, result = ?, finished_at = ? WHERE id = ?").run(status, JSON.stringify(result ?? null), now(), job.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = ctl.signal.aborted ? "cancelled" : "failed";
      this.db.prepare("UPDATE jobs SET status = ?, error = ?, finished_at = ? WHERE id = ?").run(status, msg, now(), job.id);
      appLog(this.db, "error", `job:${job.kind}`, `#${job.id} ${job.title}: ${msg}`);
    } finally {
      this.running.delete(job.id);
      queueMicrotask(() => void this.tick());
    }
  }
}
