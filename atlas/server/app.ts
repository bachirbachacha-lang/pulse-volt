import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { APP_ROOT, type AtlasConfig } from "./config.js";
import { dataPaths, type AppContext } from "./context.js";
import { getSetting, now, openDatabase } from "./db/index.js";
import { ProviderRegistry } from "./ai/registry.js";
import { registerAutomationHandlers, startScheduler } from "./jobs/automations.js";
import { JobQueue } from "./jobs/queue.js";
import { appLog } from "./lib/activity.js";
import { HttpError } from "./lib/errors.js";
import { MetricsSampler } from "./lib/metrics.js";
import { installSecurity } from "./lib/security.js";
import { assetRoutes } from "./routes/assets.js";
import { assistantRoutes } from "./routes/assistant.js";
import { codeLabRoutes, stopAllScripts } from "./routes/codelab.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { projectRoutes } from "./routes/projects.js";
import { systemRoutes } from "./routes/system.js";
import { tradingRoutes } from "./routes/trading.js";

export interface BuildOptions {
  /** Start background timers (metrics, jobs, scheduler). Tests turn this off. */
  background?: boolean;
  serveWeb?: boolean;
  dbFile?: string;
}

export async function buildApp(config: AtlasConfig, opts: BuildOptions = {}): Promise<{ app: FastifyInstance; ctx: AppContext }> {
  const paths = dataPaths(config.dataDir);
  const db = openDatabase(opts.dbFile ?? paths.db);
  const metrics = new MetricsSampler();
  const jobs = new JobQueue(db);
  const ctx: AppContext = { db, config, metrics, jobs, ai: new ProviderRegistry(config), paths, previewToken: crypto.randomBytes(16).toString("hex") };

  const app = Fastify({
    logger: { level: process.env.ATLAS_LOG_LEVEL ?? (config.isProduction ? "info" : "warn") },
    bodyLimit: 25 * 1024 * 1024,
    trustProxy: false,
  });
  installSecurity(app, config);
  await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024, files: 20 } });

  app.setErrorHandler((err: Error & { statusCode?: number; code?: string }, req, reply) => {
    if (err instanceof HttpError) return reply.code(err.status).send({ error: err.message, code: err.code });
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
    if (status >= 500) {
      req.log.error(err);
      appLog(db, "error", "http", `${req.method} ${req.url}: ${err.message}`);
    }
    return reply.code(status).send({ error: status >= 500 ? `Something went wrong: ${err.message}` : err.message, code: err.code ?? "error" });
  });

  app.get("/api/health", async () => ({ ok: true, version: "0.1.0", time: now() }));

  projectRoutes(app, ctx);
  assistantRoutes(app, ctx);
  codeLabRoutes(app, ctx);
  knowledgeRoutes(app, ctx);
  assetRoutes(app, ctx);
  tradingRoutes(app, ctx);
  systemRoutes(app, ctx);
  registerAutomationHandlers(ctx);
  seedDefaults(ctx);

  const dist = path.join(APP_ROOT, "dist");
  if (opts.serveWeb && fs.existsSync(dist)) {
    await app.register(fastifyStatic, { root: dist, prefix: "/", wildcard: false });
    // Single-page app: unknown non-API routes return index.html.
    app.setNotFoundHandler((req, reply) => {
      if (req.method === "GET" && !req.url.startsWith("/api/") && !req.url.startsWith("/preview/")) return reply.sendFile("index.html");
      return reply.code(404).send({ error: "Not found" });
    });
  }

  let stopScheduler = () => undefined as void;
  if (opts.background !== false) {
    metrics.start();
    jobs.start();
    stopScheduler = startScheduler(ctx);
  }
  app.addHook("onClose", async () => {
    stopScheduler();
    metrics.stop();
    jobs.stop();
    stopAllScripts();
    db.close();
  });
  return { app, ctx };
}

/** First-run defaults: a daily backup automation. Runs once. */
function seedDefaults(ctx: AppContext) {
  if (getSetting<boolean>(ctx.db, "seeded.v1", false)) return;
  const t = now();
  ctx.db.prepare("INSERT INTO automations (name, kind, config, schedule, enabled, next_run_at, created_at) VALUES (?, 'backup', ?, ?, 1, ?, ?)").run(
    "Daily database backup",
    JSON.stringify({ keep: 14 }),
    JSON.stringify({ type: "interval", minutes: 1440 }),
    new Date(Date.now() + 10 * 60_000).toISOString(),
    t,
  );
  ctx.db.prepare("INSERT INTO settings (key, value) VALUES ('seeded.v1', 'true')").run();
}
