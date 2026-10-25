import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveInside, isSecretFile } from "../../server/lib/paths.js";
import { makeApp } from "./helpers.js";

let t: Awaited<ReturnType<typeof makeApp>>;
beforeAll(async () => (t = await makeApp()));
afterAll(async () => t.close());

describe("request protections", () => {
  it("rejects non-localhost Host headers (DNS rebinding)", async () => {
    const r = await t.app.inject({ method: "GET", url: "/api/health", headers: { host: "evil.example:4317" } });
    expect(r.statusCode).toBe(421);
  });

  it("requires the x-atlas-client header on writes", async () => {
    const r = await t.app.inject({ method: "POST", url: "/api/projects", headers: { host: "127.0.0.1", "content-type": "application/json" }, payload: JSON.stringify({ name: "x" }) });
    expect(r.statusCode).toBe(403);
  });

  it("blocks cross-origin writes", async () => {
    const r = await t.raw("POST", "/api/projects", { name: "x" }, { origin: "https://evil.example" });
    expect(r.status).toBe(403);
  });

  it("requires confirmation for destructive actions", async () => {
    const p = await t.post("/api/projects", { name: "Keep me" });
    const r = await t.del(`/api/projects/${p.json.id}`, false);
    expect(r.status).toBe(428);
    expect((await t.get(`/api/projects/${p.json.id}`)).status).toBe(200);
    expect((await t.del(`/api/projects/${p.json.id}`, true)).status).toBe(200);
  });

  it("sandboxes previews with a CSP header", async () => {
    const ws = path.join(t.dir, "site");
    fs.mkdirSync(ws);
    fs.writeFileSync(path.join(ws, "index.html"), "<h1>hi</h1>");
    const w = await t.post("/api/workspaces", { name: "site", path: ws }, true);
    expect((await t.get(`/preview/wrongtoken/${w.json.id}/index.html`)).status).toBe(404);
    const token = (await t.get("/api/settings")).json.previewToken;
    const r = await t.get(`/preview/${token}/${w.json.id}/index.html`);
    expect(r.status).toBe(200);
    expect(r.headers["content-security-policy"]).toContain("sandbox");
    expect(r.body).toContain("<h1>hi</h1>");
  });
});

describe("access token mode", () => {
  it("demands the token and accepts it via cookie", async () => {
    const a = await makeApp({ ATLAS_ACCESS_TOKEN: "a-very-long-secret-token-123456", ATLAS_HOST: "0.0.0.0" });
    try {
      const no = await a.app.inject({ method: "GET", url: "/api/health", headers: { host: "192.168.1.5:4317" } });
      expect(no.statusCode).toBe(401);
      const login = await a.app.inject({ method: "GET", url: "/?token=a-very-long-secret-token-123456", headers: { host: "192.168.1.5:4317" } });
      expect(login.statusCode).toBe(302);
      const cookie = String(login.headers["set-cookie"]).split(";")[0];
      const ok = await a.app.inject({ method: "GET", url: "/api/health", headers: { host: "192.168.1.5:4317", cookie } });
      expect(ok.statusCode).toBe(200);
    } finally {
      await a.close();
    }
  });
});

describe("workspace path guard", () => {
  it("blocks traversal, symlink escapes and secret files", () => {
    const root = path.join(t.dir, "ws-guard");
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "a.ts"), "x");
    fs.writeFileSync(path.join(root, ".env"), "KEY=1");
    fs.symlinkSync(t.dir, path.join(root, "escape"));
    expect(resolveInside(root, "src/a.ts").rel).toBe("src/a.ts");
    expect(() => resolveInside(root, "../x")).toThrow(/\.\./);
    expect(() => resolveInside(root, "escape/data")).toThrow(/outside/);
    expect(() => resolveInside(root, ".env")).toThrow(/Secret/);
    expect(isSecretFile(".env.example")).toBe(false);
    expect(isSecretFile("id_ed25519")).toBe(true);
  });

  it("refuses overly broad workspace folders", async () => {
    const r = await t.post("/api/workspaces", { name: "root", path: "/" }, true);
    expect(r.status).toBe(403);
  });
});
