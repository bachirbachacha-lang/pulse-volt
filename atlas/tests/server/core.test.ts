import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { calculate } from "../../server/routes/knowledge.js";
import { makeApp } from "./helpers.js";

let t: Awaited<ReturnType<typeof makeApp>>;
beforeAll(async () => (t = await makeApp()));
afterAll(async () => t.close());

describe("projects and tasks", () => {
  it("creates a project, tracks progress and logs activity", async () => {
    const p = (await t.post("/api/projects", { name: "Scalp Elixir", description: "Shopify store" })).json;
    expect(p.task_total).toBe(0);
    const a = (await t.post("/api/tasks", { title: "Write launch post", project_id: p.id, due_date: "2026-11-01" })).json;
    await t.post("/api/tasks", { title: "Check Tap licence", project_id: p.id, priority: "high" });
    const done = await t.patch(`/api/tasks/${a.id}`, { status: "done" });
    expect(done.json.completed_at).toBeTruthy();
    const detail = (await t.get(`/api/projects/${p.id}`)).json;
    expect(detail.project.task_total).toBe(2);
    expect(detail.project.task_done).toBe(1);
    expect(detail.activity.some((x: any) => x.action === "task.completed")).toBe(true);
    const dash = (await t.get("/api/dashboard")).json;
    expect(dash.counts.open_tasks).toBe(1);
    expect(dash.counts.done_this_week).toBe(1);
  });

  it("validates input", async () => {
    expect((await t.post("/api/projects", { name: "" })).status).toBe(400);
    expect((await t.post("/api/tasks", { title: "x", due_date: "tomorrow" })).status).toBe(400);
    expect((await t.post("/api/tasks", { title: "x", project_id: 9999 })).status).toBe(404);
  });
});

describe("knowledge vault and search", () => {
  it("full-text searches notes, tasks and projects", async () => {
    await t.post("/api/notes", { title: "Rosemary oil supplier", body: "CJdropshipping PURC bottle, 50 ml", tags: "supplier,cj" });
    const hits = (await t.get("/api/search?q=rosem")).json.hits;
    expect(hits.find((h: any) => h.type === "note")?.title).toBe("Rosemary oil supplier");
    const proj = (await t.get("/api/search?q=Scalp")).json.hits;
    expect(proj.some((h: any) => h.type === "project")).toBe(true);
    const tags = (await t.get("/api/notes/tags")).json;
    expect(tags.map((x: any) => x.tag)).toContain("supplier");
    // FTS special characters must not crash the query.
    expect((await t.get(`/api/search?q=${encodeURIComponent('"(*^:')}`)).status).toBe(200);
  });

  it("keeps the FTS index in sync on update and delete", async () => {
    const n = (await t.post("/api/notes", { title: "Temp", body: "zebracorn" })).json;
    await t.patch(`/api/notes/${n.id}`, { body: "unicornzebra" });
    expect((await t.get("/api/notes?q=zebracorn")).json).toHaveLength(0);
    expect((await t.get("/api/notes?q=unicornzebra")).json).toHaveLength(1);
    await t.del(`/api/notes/${n.id}`);
    expect((await t.get("/api/notes?q=unicornzebra")).json).toHaveLength(0);
  });
});

describe("engineering calculator", () => {
  it("handles units and blocks escape hatches", () => {
    expect(calculate("5 kg * 9.81 m/s^2 to N")).toBe("49.05 N");
    expect(calculate("2 inch to mm")).toBe("50.8 mm");
    expect(() => calculate('import({a: 1})')).toThrow();
    expect(() => calculate('evaluate("1+1")')).toThrow();
    expect(() => calculate("createUnit('foo')")).toThrow();
  });
});

describe("settings", () => {
  it("persists widget layout", async () => {
    await t.patch("/api/settings", { widgets: ["tasks", "system"] });
    expect((await t.get("/api/settings")).json.widgets).toEqual(["tasks", "system"]);
  });
});
