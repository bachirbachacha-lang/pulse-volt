import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeApp } from "./helpers.js";

let t: Awaited<ReturnType<typeof makeApp>>;
let wsId: number;
let root: string;

beforeAll(async () => {
  t = await makeApp();
  root = path.join(t.dir, "my-site");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "index.html"), "<h1>Pulse</h1>");
  fs.writeFileSync(path.join(root, "src", "app.js"), "console.log('hi')\n");
  fs.writeFileSync(path.join(root, ".env"), "SECRET=1");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "s", scripts: { hello: "node -e \"console.log('built ok')\"", fail: "node -e \"console.error('Error: boom'); process.exit(3)\"" } }));
  const git = (...a: string[]) => execFileSync("git", a, { cwd: root });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "Test");
  fs.writeFileSync(path.join(root, ".gitignore"), ".env\n");
  git("add", "-A");
  git("commit", "-q", "-m", "init");
  wsId = (await t.post("/api/workspaces", { name: "my-site", path: root }, true)).json.id;
});
afterAll(async () => t.close());

describe("Code Lab", () => {
  it("needs confirmation to add a workspace", async () => {
    expect((await t.post("/api/workspaces", { name: "x", path: root })).status).toBe(428);
  });

  it("lists files without secrets or node_modules", async () => {
    const tree = (await t.get(`/api/workspaces/${wsId}/tree`)).json;
    const names = tree.entries.map((e: any) => e.name);
    expect(names).toContain("index.html");
    expect(names).not.toContain(".env");
    expect((await t.get(`/api/workspaces/${wsId}/file?path=.env`)).status).toBe(403);
  });

  it("saves files with confirmation, conflict detection and a backup copy", async () => {
    const f = (await t.get(`/api/workspaces/${wsId}/file?path=src/app.js`)).json;
    expect(f.content).toContain("hi");
    expect((await t.put(`/api/workspaces/${wsId}/file`, { path: "src/app.js", content: "x" })).status).toBe(428);
    const ok = await t.put(`/api/workspaces/${wsId}/file`, { path: "src/app.js", content: "console.log('bye')\n", expected_mtime: f.mtime }, true);
    expect(ok.status).toBe(200);
    const stale = await t.put(`/api/workspaces/${wsId}/file`, { path: "src/app.js", content: "y", expected_mtime: f.mtime }, true);
    expect(stale.status).toBe(409);
    const backups = fs.readdirSync(path.join(t.ctx.paths.backups, "files", String(wsId), "src"));
    expect(backups.some((b) => b.startsWith("app.js."))).toBe(true);
    expect((await t.put(`/api/workspaces/${wsId}/file`, { path: ".git/config", content: "x" }, true)).status).toBe(403);
  });

  it("shows git status, diffs and commits (refusing secrets)", async () => {
    const st = (await t.get(`/api/workspaces/${wsId}/git/status`)).json;
    expect(st.available).toBe(true);
    expect(st.branch).toBe("main");
    expect(st.files.map((f: any) => f.path)).toContain("src/app.js");
    const diff = (await t.get(`/api/workspaces/${wsId}/git/diff?path=src/app.js`)).json.diff;
    expect(diff).toContain("+console.log('bye')");
    expect((await t.post(`/api/workspaces/${wsId}/git/commit`, { message: "update" })).status).toBe(428);
    const c = await t.post(`/api/workspaces/${wsId}/git/commit`, { message: "Update app" }, true);
    expect(c.status).toBe(200);
    const after = (await t.get(`/api/workspaces/${wsId}/git/status`)).json;
    expect(after.files).toHaveLength(0);
    expect(after.commits[0].subject).toBe("Update app");
  });

  it("runs only package.json scripts, streams logs and reports failures", async () => {
    expect((await t.post(`/api/workspaces/${wsId}/scripts/run`, { script: "rm -rf /" }, true)).status).toBe(400);
    expect((await t.post(`/api/workspaces/${wsId}/scripts/run`, { script: "hello" })).status).toBe(428);
    const okRun = (await t.post(`/api/workspaces/${wsId}/scripts/run`, { script: "hello" }, true)).json;
    const failRun = (await t.post(`/api/workspaces/${wsId}/scripts/run`, { script: "fail" }, true)).json;
    const wait = async (id: number) => {
      for (let i = 0; i < 100; i++) {
        const r = (await t.get(`/api/runs/${id}`)).json;
        if (r.status !== "running") return r;
        await new Promise((res) => setTimeout(res, 100));
      }
      throw new Error("timeout");
    };
    const a = await wait(okRun.id);
    expect(a.status).toBe("succeeded");
    expect(a.log).toContain("built ok");
    const b = await wait(failRun.id);
    expect(b.status).toBe("failed");
    expect(b.exit_code).toBe(3);
    expect(b.log).toContain("Error: boom");
  });

  it("imports markdown from a workspace into the vault", async () => {
    fs.mkdirSync(path.join(root, "docs"));
    fs.writeFileSync(path.join(root, "docs", "plan.md"), "# Launch plan\nPost daily.");
    const r = await t.post("/api/notes/import", { workspace_id: wsId, path: "docs" });
    expect(r.json.imported).toBe(1);
    expect((await t.get("/api/notes?q=launch")).json[0].title).toBe("Launch plan");
  });

  it("security review flags committed secret files", async () => {
    fs.writeFileSync(path.join(root, "server.key"), "k");
    execFileSync("git", ["add", "-f", "server.key"], { cwd: root });
    execFileSync("git", ["commit", "-q", "-m", "oops"], { cwd: root });
    const checks = (await t.get("/api/system/security")).json.checks;
    expect(checks.find((c: any) => c.id === `ws-${wsId}`).status).toBe("fail");
  });
});
