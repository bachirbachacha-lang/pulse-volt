// End-to-end smoke test: starts the production server on a temp data folder, drives every module in Chromium,
// fails on console errors, and saves screenshots to tests/e2e/screens/.
// Usage: npm run build && npm run test:e2e
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// Playwright is not a project dependency (it downloads browsers). Install once with:
//   npm i -D playwright && npx playwright install chromium
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)("playwright"));
} catch {
  console.error("Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium");
  process.exit(2);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repo = path.resolve(root, "..");
const shots = path.join(root, "tests/e2e/screens");
fs.mkdirSync(shots, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-e2e-"));
const PORT = 4391;
const base = `http://127.0.0.1:${PORT}`;

const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "--import", "tsx", "server/index.ts"], {
  cwd: root,
  env: { ...process.env, NODE_ENV: "production", ATLAS_PORT: String(PORT), ATLAS_DATA_DIR: dataDir, ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "", GITHUB_TOKEN: "" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

const api = (p, body, confirm) =>
  fetch(base + p, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", "x-atlas-client": "web", ...(confirm ? { "x-atlas-confirm": "yes" } : {}) }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const failures = [];
const step = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures.push(`${name}: ${e.message.split("\n")[0]}`);
    console.log(`  ✗ ${name}: ${e.message.split("\n")[0]}`);
  }
};

try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base + "/api/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  // Seed through the API so screens have real content.
  const p = await api("/api/projects", { name: "Scalp Elixir store", description: "Shopify store for rosemary hair oil. Waiting on the Tap payments licence.", color: "emerald" });
  await api("/api/projects", { name: "Pixel & Co.", description: "Websites for small Saudi businesses.", color: "violet" });
  await api("/api/tasks", { title: "Plan launch-day post", project_id: p.id, due_date: new Date().toISOString().slice(0, 10), priority: "high" });
  await api("/api/tasks", { title: "Film night routine video", project_id: p.id, status: "doing" });
  await api("/api/notes", { title: "Supplier notes", body: "# CJ supplier\n\n- PURC 50 ml bottle\n- Ships to SA in 9-14 days", tags: "supplier" });
  const ws = await api("/api/workspaces", { name: "pulse-volt", path: repo }, true);
  const ds = await api("/api/trading/datasets/sample", {});

  const browser = await chromium.launch();
  for (const vp of [{ name: "desktop", width: 1440, height: 900 }, { name: "ipad", width: 1024, height: 1366 }, { name: "phone", width: 390, height: 844 }]) {
    console.log(`\n${vp.name} ${vp.width}x${vp.height}`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    const shot = (n) => page.screenshot({ path: path.join(shots, `${vp.name}-${n}.png`), fullPage: false });
    const visit = async (url, text, n) => {
      await page.goto(base + url);
      await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(600);
      await shot(n);
    };
    await step("Mission Control", () => visit("/", "Quick actions", "01-mission"));
    if (vp.width < 1024) {
      await step("Mobile menu opens", async () => {
        await page.getByRole("button", { name: "Open menu" }).click();
        await page.getByRole("navigation", { name: "Modules" }).last().getByText("Trading Lab").waitFor();
        await shot("00-menu");
        await page.getByRole("button", { name: "Close menu" }).click();
      });
    }
    await step("Projects", () => visit("/projects", "Scalp Elixir store", "02-projects"));
    await step("Project detail + AI panel context", async () => {
      await visit(`/projects/${p.id}`, "Plan launch-day post", "03-project");
      await page.getByRole("button", { name: "Ask AI" }).first().click();
      await page.getByText("Context: Scalp Elixir store").waitFor();
      await page.getByText("No AI provider is set up yet").first().waitFor();
      await shot("04-ai-panel");
      await page.getByRole("button", { name: "Close AI panel" }).click();
    });
    await step("Assistant", () => visit("/assistant", "No AI provider is set up yet", "05-assistant"));
    await step("Code Lab tree + editor", async () => {
      await visit(`/code?ws=${ws.id}`, "README.md", "06-code");
      await page.getByRole("button", { name: "README.md" }).click();
      await page.locator(".cm-content").waitFor();
      await page.waitForTimeout(500);
      await shot("07-code-editor");
    });
    await step("Code Lab git", async () => {
      await page.getByRole("tab", { name: "Git" }).click();
      await page.getByText("Recent commits").waitFor();
      await shot("08-code-git");
    });
    await step("Code Lab preview", async () => {
      await page.getByRole("tab", { name: "Preview" }).click();
      await page.waitForTimeout(1500);
      await shot("09-code-preview");
    });
    await step("Design Studio", () => visit("/design", "Boards", "10-design"));
    await step("Engineering calculator", async () => {
      await visit("/engineering?tab=calc", "Calculator with units", "11-eng-calc");
      await page.getByLabel("Expression").fill("5 kg * 9.81 m/s^2 to N");
      await page.getByText("= 49.05 N").waitFor();
      await shot("11-eng-calc");
    });
    await step("Engineering diagram", async () => {
      await page.goto(base + "/engineering?tab=docs");
      await page.getByRole("button", { name: "Diagram", exact: true }).click();
      await page.locator("svg[id^=m]").first().waitFor({ timeout: 15000 });
      await page.waitForTimeout(400);
      await shot("12-eng-diagram");
    });
    await step("Trading research", () => visit(`/trading?tab=research&dataset=${ds.id}`, "Synthetic practice data", "13-trading"));
    await step("Trading backtest", async () => {
      await page.goto(base + "/trading?tab=backtest");
      await page.getByRole("button", { name: "Run backtest" }).click();
      await page.getByText("Buy & hold return").waitFor();
      await page.waitForTimeout(400);
      await shot("14-backtest");
    });
    await step("Knowledge Vault", async () => {
      await visit("/vault", "Supplier notes", "15-vault");
      await page.getByRole("button", { name: /Supplier notes/ }).click();
      await page.getByText("Ships to SA").waitFor();
      await shot("15-vault");
    });
    await step("Automation", () => visit("/automation", "Daily database backup", "16-automation"));
    await step("System Monitor", () => visit("/system", "Load average", "17-system"));
    await step("Security review", async () => {
      await page.getByRole("tab", { name: "Security" }).click();
      await page.getByText("Only this computer can open Atlas").waitFor();
      await shot("18-security");
    });
    await step("Integrations", () => visit("/integrations", "Anthropic Claude", "19-integrations"));
    await step("Settings", () => visit("/settings", "Standing instructions", "20-settings"));
    await step("Command palette search", async () => {
      await page.goto(base + "/");
      await page.getByText("Quick actions").waitFor();
      await page.keyboard.press("Control+k");
      await page.getByPlaceholder(/Search projects/).fill("supplier");
      await page.getByRole("option", { name: /Supplier notes/ }).waitFor();
      await shot("21-palette");
      await page.keyboard.press("Escape");
    });
    if (vp.name === "desktop") {
      await step("Add task from Mission Control and complete it", async () => {
        await page.goto(base + "/");
        await page.getByRole("button", { name: "New task" }).first().click();
        await page.getByRole("dialog").getByLabel("Task", { exact: true }).fill("E2E created task");
        await page.getByRole("button", { name: "Add task" }).click();
        await page.getByText("E2E created task").first().waitFor();
        await page.getByRole("button", { name: "Mark “E2E created task” done" }).click();
        await page.getByRole("button", { name: "Mark “E2E created task” done" }).waitFor({ state: "detached" });
        const done = await api("/api/tasks?status=done");
        if (!done.some((t) => t.title === "E2E created task")) throw new Error("task not stored as done");
      });
      await step("Keyboard navigation g then t", async () => {
        await page.goto(base + "/");
        await page.getByText("Quick actions").waitFor();
        await page.keyboard.press("g");
        await page.keyboard.press("t");
        await page.getByRole("heading", { name: "Trading Lab" }).waitFor();
      });
      await step("Customize widgets hides a widget", async () => {
        await page.goto(base + "/");
        await page.getByRole("button", { name: "Customize" }).click();
        await page.getByRole("button", { name: "Hide System status" }).click();
        await page.getByRole("button", { name: "Done", exact: true }).click();
        await page.waitForTimeout(400);
        if (await page.getByRole("heading", { name: "System status" }).count()) throw new Error("widget still visible");
        await page.getByRole("button", { name: "Customize" }).click();
        await page.getByRole("button", { name: "Show System status" }).click();
        await page.getByRole("button", { name: "Done", exact: true }).click();
      });
      await step("Delete project needs typed confirmation", async () => {
        const tmp = await api("/api/projects", { name: "Throwaway" });
        await page.goto(base + `/projects/${tmp.id}`);
        await page.getByRole("button", { name: "Delete project" }).click();
        const btn = page.getByRole("dialog").getByRole("button", { name: "Delete project" });
        if (await btn.isEnabled()) throw new Error("delete enabled before typing name");
        await page.getByRole("dialog").getByRole("textbox").fill("Throwaway");
        await btn.click();
        await page.waitForURL(base + "/projects");
      });
    }
    // Horizontal overflow check.
    await step("No horizontal page scroll", async () => {
      await page.goto(base + "/");
      await page.getByText("Quick actions").waitFor();
      const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (w > 1) throw new Error(`page is ${w}px wider than the viewport`);
    });
    const real = errors.filter((e) => !/Failed to load resource.*(424|404)/.test(e));
    if (real.length) failures.push(`${vp.name} console errors:\n    ${[...new Set(real)].join("\n    ")}`);
    await page.close();
  }
  await browser.close();
} finally {
  server.kill("SIGTERM");
  fs.rmSync(dataDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\n${failures.length} failure(s):\n- ${failures.join("\n- ")}`);
  if (process.env.SHOW_SERVER_LOG) console.error(serverLog);
  process.exit(1);
}
console.log(`\nAll e2e checks passed. Screenshots in ${path.relative(process.cwd(), shots)}/`);
