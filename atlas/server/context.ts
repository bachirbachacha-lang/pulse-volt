import fs from "node:fs";
import path from "node:path";
import type { AtlasConfig } from "./config.js";
import type { DB } from "./db/index.js";
import { notFound } from "./lib/errors.js";
import type { MetricsSampler } from "./lib/metrics.js";
import type { JobQueue } from "./jobs/queue.js";
import type { ProviderRegistry } from "./ai/registry.js";

export interface AppContext {
  db: DB;
  config: AtlasConfig;
  metrics: MetricsSampler;
  jobs: JobQueue;
  ai: ProviderRegistry;
  paths: { data: string; uploads: string; backups: string; db: string };
  /** Random per-run secret in preview URLs, so other websites cannot guess them (previews allow CORS). */
  previewToken: string;
}

export function dataPaths(dataDir: string) {
  const p = {
    data: dataDir,
    uploads: path.join(dataDir, "uploads"),
    backups: path.join(dataDir, "backups"),
    db: path.join(dataDir, "atlas.db"),
  };
  for (const d of [p.data, p.uploads, p.backups]) fs.mkdirSync(d, { recursive: true, mode: 0o700 });
  return p;
}

export interface WorkspaceRow {
  id: number;
  name: string;
  path: string;
  created_at: string;
}

export function getWorkspace(db: DB, id: number): WorkspaceRow {
  const ws = db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id) as WorkspaceRow | undefined;
  if (!ws) throw notFound("Workspace");
  if (!fs.existsSync(ws.path)) throw notFound(`Workspace folder ${ws.path}`);
  return ws;
}
