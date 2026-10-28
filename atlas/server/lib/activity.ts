import type { DB } from "../db/index.js";
import { now } from "../db/index.js";

export type Level = "info" | "warn" | "error";

export function logActivity(
  db: DB,
  module: string,
  action: string,
  message: string,
  projectId: number | null = null,
  meta?: unknown,
) {
  db.prepare("INSERT INTO activity (ts, module, action, message, project_id, meta) VALUES (?, ?, ?, ?, ?, ?)").run(
    now(),
    module,
    action,
    message,
    projectId,
    meta === undefined ? null : JSON.stringify(meta),
  );
}

export function appLog(db: DB, level: Level, source: string, message: string) {
  db.prepare("INSERT INTO app_log (ts, level, source, message) VALUES (?, ?, ?, ?)").run(now(), level, source, message.slice(0, 4000));
  // Keep the log bounded.
  db.prepare("DELETE FROM app_log WHERE id <= (SELECT id FROM app_log ORDER BY id DESC LIMIT 1 OFFSET 5000)").run();
}
