import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildApp } from "../../server/app.js";
import { readConfig } from "../../server/config.js";

export async function makeApp(env: Record<string, string> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-test-"));
  const config = readConfig({ ATLAS_DATA_DIR: path.join(dir, "data"), ...env } as NodeJS.ProcessEnv);
  const { app, ctx } = await buildApp(config, { background: false });
  const H = { host: "127.0.0.1:4317", "x-atlas-client": "web" };
  const call = async (method: string, url: string, body?: unknown, extra: Record<string, string> = {}) => {
    const res = await app.inject({ method: method as any, url, headers: { ...H, ...(body !== undefined ? { "content-type": "application/json" } : {}), ...extra }, payload: body === undefined ? undefined : JSON.stringify(body) });
    let json: any = null;
    try {
      json = res.json();
    } catch {
      /* not json */
    }
    return { status: res.statusCode, json, body: res.body, headers: res.headers };
  };
  return {
    app,
    ctx,
    dir,
    get: (url: string) => call("GET", url),
    post: (url: string, body: unknown = {}, confirm = false) => call("POST", url, body, confirm ? { "x-atlas-confirm": "yes" } : {}),
    patch: (url: string, body: unknown) => call("PATCH", url, body),
    put: (url: string, body: unknown, confirm = false) => call("PUT", url, body, confirm ? { "x-atlas-confirm": "yes" } : {}),
    del: (url: string, confirm = true) => call("DELETE", url, undefined, confirm ? { "x-atlas-confirm": "yes" } : {}),
    raw: call,
    close: async () => {
      await app.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
