// Browser-only stand-in for the Atlas server, used by the demo build.
// It answers the same /api routes from sample data kept in this browser (localStorage).
// Nothing here touches the real computer: scripts, git, AI and metrics are simulated and labelled as such.
import { backtest, syntheticBars, type Bar } from "../../../server/trading/engine";

type Row = Record<string, any>;
interface State {
  seq: number;
  projects: Row[];
  tasks: Row[];
  notes: Row[];
  activity: Row[];
  conversations: Row[];
  messages: Row[];
  experiments: Row[];
  calculations: Row[];
  boards: Row[];
  assets: Row[];
  datasets: Row[];
  bars: Record<number, Bar[]>;
  backtests: Row[];
  accounts: Row[];
  orders: Row[];
  quotes: Row[];
  automations: Row[];
  jobs: Row[];
  runs: Row[];
  files: Record<string, string>;
  /** Last committed copy of the files, for the simulated git status and diff. */
  committed: Record<string, string>;
  commits: Row[];
  settings: Row;
}

const KEY = "atlas-demo-v1";
const now = () => new Date().toISOString();
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

const svg = (bg: string, fg: string, label: string) =>
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${bg}"/><circle cx="200" cy="170" r="90" fill="${fg}" opacity=".85"/><text x="200" y="330" font-family="Helvetica,Arial" font-size="26" fill="${fg}" text-anchor="middle">${label}</text></svg>`);

const SITE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scalp Elixir</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header><b>SCALP ELIXIR</b><span>Rosemary hair oil · 50 ml</span></header>
  <main>
    <h1>Roots first.</h1>
    <p>Cold-pressed rosemary oil for a calm, healthy scalp. Coming soon.</p>
    <button onclick="this.textContent='Coming soon ✓'">Notify me</button>
  </main>
</body>
</html>
`;
const SITE_CSS = `body { margin: 0; font-family: Georgia, serif; background: #12261d; color: #f1ead9; }
header { display: flex; justify-content: space-between; padding: 20px 28px; font-family: Helvetica, sans-serif; font-size: 13px; letter-spacing: .2em; }
main { padding: 12vh 28px; max-width: 640px; }
h1 { font-size: 64px; margin: 0 0 12px; }
button { margin-top: 24px; padding: 14px 26px; border-radius: 999px; border: 0; background: #c9a86a; color: #12261d; font-size: 16px; }
`;

function seed(): State {
  const s: State = {
    seq: 100, projects: [], tasks: [], notes: [], activity: [], conversations: [], messages: [], experiments: [], calculations: [],
    boards: [], assets: [], datasets: [], bars: {}, backtests: [], accounts: [], orders: [], quotes: [], automations: [], jobs: [], runs: [], commits: [],
    files: {
      "README.md": "# Scalp Elixir site (demo copy)\n\nA tiny sample site so you can try Code Lab in the demo.\n\n- `index.html`: the page\n- `css/style.css`: the styles\n",
      "index.html": SITE_HTML,
      "css/style.css": SITE_CSS,
      "package.json": JSON.stringify({ name: "scalp-elixir-site", private: true, scripts: { build: "node build.js", test: "node test.js" } }, null, 2) + "\n",
    },
    committed: {},
    settings: { widgets: ["quick-actions", "projects", "tasks", "progress", "activity", "ai-jobs", "system"], defaultProvider: null, models: { anthropic: null, openai: null, ollama: null }, customInstructions: "Write customer messages in Arabic first, then English.", backupKeep: 14, userName: "" },
  };
  const P = (id: number, name: string, description: string, color: string, status = "active", pinned = false) =>
    s.projects.push({ id, name, description, status, color, workspace_id: id === 1 ? 1 : null, workspace_subpath: "", pinned, created_at: ago(60 * 24 * 20), updated_at: ago(30 * id) });
  P(1, "Scalp Elixir store", "Shopify store for rosemary hair oil (PURC 50 ml via CJdropshipping). Waiting on the Tap payments licence from Dad before launch. Posts daily on Instagram, TikTok and Snapchat.", "emerald", "active", true);
  P(2, "Pixel & Co.", "Websites for small Saudi businesses that have Instagram but no website. Free sample first, then 1,000–2,500 SAR (confirm with Dad).", "violet");
  P(3, "Winter store", "Second store for winter products (hoodie blanket first). Open after Scalp Elixir's first sales.", "amber");
  P(4, "VÉLOUR Drop 01", "Unisex luxury streetwear. 50 numbered pieces each. On hold: third priority.", "rose", "paused");
  const T = (project_id: number | null, title: string, extra: Row = {}) =>
    s.tasks.push({ id: s.tasks.length + 1, project_id, title, notes: "", status: "todo", priority: "medium", due_date: null, created_at: ago(60 * 24), updated_at: ago(60), completed_at: null, ...extra });
  T(1, "Plan the launch-day post and offer", { priority: "high", due_date: day(3) });
  T(1, "Ask Dad about the Tap licence", { status: "doing", priority: "high" });
  T(1, "Post scalp-elixir-ar-routine-night video", { due_date: day(0) });
  T(1, "Recheck massager stock in Shopify", { status: "done", completed_at: ago(60 * 26) });
  T(1, "Rename Beige colour to Gray", { status: "done", completed_at: ago(60 * 24 * 3) });
  T(2, "Follow up Bear be matcha (offer free menu customisation)", { priority: "high", due_date: day(-1) });
  T(2, "Free sample for riyadh.detailingbeast_autocare", { status: "doing" });
  T(2, "Send 20 new DMs (Arabic + English)", { due_date: day(1) });
  T(2, "Bear be matcha ordering sample", { status: "done", completed_at: ago(60 * 24 * 5) });
  T(3, "Check hoodie blanket sample quality", { due_date: day(6) });
  T(3, "Daylight photos and video of the blanket");
  T(4, "Pick tracksuit sets with partner", { priority: "low" });
  const A = (min: number, module: string, message: string, project_id: number | null = null) => s.activity.push({ id: s.activity.length + 1, ts: ago(min), module, action: "demo", message, project_id });
  A(400, "projects", 'Completed "Recheck massager stock in Shopify"', 1);
  A(300, "vault", 'Created note "CJ supplier notes"');
  A(200, "codelab", "Saved scalp-elixir-site/index.html");
  A(120, "trading", "Backtested sma_cross on SYNTH");
  A(45, "projects", 'Moved "Free sample for riyadh.detailingbeast_autocare" to doing', 2);
  A(10, "automation", "Database backed up (184 KB)");
  const N = (title: string, body: string, tags: string, project_id: number | null = null, kind = "note", pinned = false) =>
    s.notes.push({ id: s.notes.length + 1, title, body, tags, project_id, kind, pinned, created_at: ago(60 * 24 * 4), updated_at: ago(60 * (s.notes.length + 2)) });
  N("CJ supplier notes", "# CJ supplier\n\n- Product: **PURC Rosemary Hair Growth Essential Oil 50 ml**\n- SPU CJYD1932731, connected to the Shopify product\n- Ships to SA in 9–14 days (+1–3 processing)\n- Auto-pay **off** until Dad decides\n\n> Don't use CJ's before/after bald photo (medical claim).", "supplier,cj", 1, "note", true);
  N("Outreach DM template", "## Arabic\nمرحبا! أنا من Pixel & Co. نسوي مواقع للمشاريع الصغيرة. ممكن أسوي لكم نموذج مجاني؟\n\n## English\nHi! I'm from Pixel & Co. We make websites for small businesses. Can I make you a free sample?", "outreach,template", 2);
  N("Winter product research", "| Product | Cost to SA | Sell |\n|---|---|---|\n| Hoodie blanket | $16.30 | ~119 SAR |\n| USB hand warmer | $9.39 | — |\n\nPrefer **no-battery** products.", "research,winter", 3);
  N("Store architecture", "# How the store fits together\n\n```mermaid\nflowchart LR\n  ig[Instagram / TikTok] --> shop[Shopify store]\n  shop --> tap[Tap payments]\n  shop --> cj[CJ fulfilment]\n  cj --> customer[Customer in SA]\n```\n", "", 1, "doc");
  s.conversations.push({ id: 1, title: "What should I post this week?", project_id: 1, provider: "demo", model: "sample", created_at: ago(90), updated_at: ago(88) });
  s.messages.push(
    { id: 1, conversation_id: 1, role: "user", content: "What should I post this week?", tool_events: [], attachments: [], created_at: ago(90) },
    { id: 2, conversation_id: 1, role: "assistant", content: "**Demo reply (sample, not a real AI):**\n\nBased on your open tasks, a good week could be:\n\n1. **Today:** post the night-routine video.\n2. **Mid-week:** a behind-the-scenes clip of the real PURC bottle.\n3. **Weekend:** tease the launch offer (once Dad confirms the Tap licence).", tool_events: [{ id: "t1", name: "list_tasks", status: "done", summary: "3 open tasks" }], attachments: [], created_at: ago(88) },
  );
  s.experiments.push({ id: 1, project_id: 1, title: "Arabic-first captions vs English-first", hypothesis: "Arabic-first captions get more saves from Saudi viewers.", method: "Alternate for 2 weeks, compare saves per 1,000 views.", result: "", status: "running", created_at: ago(60 * 24 * 3), updated_at: ago(60 * 5) });
  s.calculations.push({ id: 1, project_id: null, label: "Hoodie blanket landed cost in SAR", expression: "16.30 * 3.75", result: "61.125", created_at: ago(60 * 30) });
  s.boards.push({ id: 1, name: "Scalp Elixir mood", kind: "moodboard", description: "Deep green, warm gold, clean labels. No before/after claims.", project_id: 1, created_at: ago(60 * 24 * 6), updated_at: ago(60 * 24) });
  const add = (name: string, bg: string, fg: string, tags: string) => s.assets.push({ id: s.assets.length + 1, area: "design", board_id: 1, project_id: 1, stored_name: name, original_name: name, mime: "image/svg+xml", size: 1200, tags, note: "Sample swatch", source: "upload", created_at: ago(60 * 24), demo_url: svg(bg, fg, name.replace(".svg", "")) });
  add("forest.svg", "#12261d", "#c9a86a", "palette");
  add("gold.svg", "#c9a86a", "#12261d", "palette");
  add("cream.svg", "#f1ead9", "#12261d", "palette");
  const bars = syntheticBars();
  s.datasets.push({ id: 1, symbol: "SYNTH", name: "Synthetic sample (not real market data)", source: "synthetic", interval: "1d", created_at: ago(60 * 24) });
  s.bars[1] = bars;
  s.accounts.push({ id: 1, name: "Practice account", starting_cash: 10000, created_at: ago(60 * 24 * 2) });
  s.orders.push({ id: 1, account_id: 1, symbol: "SYNTH", side: "buy", qty: 20, price: +bars[bars.length - 30].close.toFixed(2), fee: 0, note: "", ts: ago(60 * 24) });
  s.quotes.push({ account_id: 1, symbol: "SYNTH", price: +bars[bars.length - 1].close.toFixed(2), updated_at: ago(60) });
  s.automations.push(
    { id: 1, name: "Daily database backup", kind: "backup", config: { keep: 14 }, schedule: { type: "interval", minutes: 1440 }, enabled: true, last_run_at: ago(10), next_run_at: new Date(Date.now() + 86_400_000 - 600_000).toISOString(), created_at: ago(60 * 24 * 7), last_status: "succeeded" },
    { id: 2, name: "Check the store is online", kind: "http_check", config: { url: "https://example.com" }, schedule: { type: "interval", minutes: 60 }, enabled: true, last_run_at: ago(25), next_run_at: new Date(Date.now() + 35 * 60_000).toISOString(), created_at: ago(60 * 24 * 2), last_status: "succeeded" },
  );
  s.jobs.push(
    { id: 1, kind: "backup", title: "Daily database backup", status: "succeeded", error: null, log: "[demo] Wrote atlas-backup.db (184 KB)", result: { size: 188416 }, automation_id: 1, created_at: ago(10), started_at: ago(10), finished_at: ago(10) },
    { id: 2, kind: "http_check", title: "Check the store is online", status: "succeeded", error: null, log: "[demo] https://example.com → HTTP 200 in 212 ms", result: { status: 200, ms: 212 }, automation_id: 2, created_at: ago(25), started_at: ago(25), finished_at: ago(25) },
  );
  s.committed = { ...s.files };
  s.commits.push({ hash: "a1b2c3d", author: "You", date: ago(60 * 24), subject: "Add launch page" }, { hash: "9f8e7d6", author: "You", date: ago(60 * 24 * 3), subject: "First version of the site" });
  return s;
}

let state: State;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* storage blocked */
  }
  return seed();
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage blocked or full: keep working in memory */
  }
}
export function resetDemo() {
  state = seed();
  save();
}

const id = () => ++state.seq;
class Err extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
const nf = (what: string) => new Err(404, `${what} not found`);
const log = (module: string, message: string, project_id: number | null = null) => state.activity.push({ id: id(), ts: now(), module, action: "demo", message, project_id });
const projectName = (pid: number | null) => state.projects.find((p) => p.id === pid)?.name ?? null;

function projectView(p: Row) {
  const ts = state.tasks.filter((t) => t.project_id === p.id);
  const last = state.activity.filter((a) => a.project_id === p.id).map((a) => a.ts).sort().at(-1) ?? null;
  return { ...p, workspace_name: p.workspace_id ? "scalp-elixir-site (demo)" : null, task_total: ts.length, task_done: ts.filter((t) => t.status === "done").length, task_doing: ts.filter((t) => t.status === "doing").length, last_activity: last };
}
const taskView = (t: Row) => ({ ...t, project_name: projectName(t.project_id), project_color: state.projects.find((p) => p.id === t.project_id)?.color });
const order = { doing: 0, todo: 1, done: 2 } as Record<string, number>;
const sortTasks = (a: Row, b: Row) => order[a.status] - order[b.status] || (a.due_date ?? "9").localeCompare(b.due_date ?? "9") || b.id - a.id;

function accountState(aid: number) {
  const account = state.accounts.find((a) => a.id === aid);
  if (!account) throw nf("Paper account");
  const orders = state.orders.filter((o) => o.account_id === aid);
  let cash = account.starting_cash;
  const pos = new Map<string, { qty: number; cost: number; realized: number }>();
  for (const o of orders) {
    const p = pos.get(o.symbol) ?? { qty: 0, cost: 0, realized: 0 };
    if (o.side === "buy") (cash -= o.qty * o.price + o.fee), (p.cost += o.qty * o.price + o.fee), (p.qty += o.qty);
    else {
      const avg = p.qty ? p.cost / p.qty : 0;
      cash += o.qty * o.price - o.fee;
      p.realized += o.qty * (o.price - avg) - o.fee;
      p.cost -= avg * o.qty;
      p.qty -= o.qty;
    }
    pos.set(o.symbol, p);
  }
  const positions = [...pos.entries()].map(([symbol, p]) => {
    const q = state.quotes.find((x) => x.account_id === aid && x.symbol === symbol);
    const qty = Math.abs(p.qty) < 1e-9 ? 0 : p.qty;
    const avgCost = qty ? p.cost / qty : 0;
    return { symbol, qty, avgCost, realized: p.realized, price: q?.price ?? null, value: q ? qty * q.price : null, unrealized: q && qty ? qty * (q.price - avgCost) : qty ? null : 0 };
  });
  const invested = positions.reduce((a, p) => a + (p.value ?? p.qty * p.avgCost), 0);
  return { account, cash, positions, orders: orders.slice().reverse(), equity: cash + invested, missingQuotes: positions.filter((p) => p.qty && p.price === null).map((p) => p.symbol) };
}

const datasetView = (d: Row) => {
  const b = state.bars[d.id] ?? [];
  return { ...d, bars: b.length, first: b[0]?.ts, last: b.at(-1)?.ts, last_close: b.at(-1)?.close };
};

let mathPromise: Promise<any> | null = null;
async function calc(expr: string) {
  mathPromise ??= import("mathjs").then((m) => m.create(m.all));
  const math = await mathPromise;
  try {
    const v = math.evaluate(expr);
    return math.format(Array.isArray(v) ? v.at(-1) : v, { precision: 12 });
  } catch (e) {
    throw new Err(400, e instanceof Error ? e.message : "Could not evaluate");
  }
}

function metrics() {
  const cores = Math.max(1, Math.min(navigator.hardwareConcurrency || 8, 16));
  const t = Date.now();
  const wave = (i: number) => 18 + 10 * Math.sin((t / 1000 + i * 2) / 9) + 6 * Math.sin((t / 1000 + i * 2) / 2.3);
  const history = Array.from({ length: 60 }, (_, i) => ({ ts: t - (59 - i) * 2000, cpu: +wave(i - 59).toFixed(1), memUsed: (9.2 + 0.4 * Math.sin((t / 1000 + i) / 20)) * 1024 ** 3 }));
  const total = 16 * 1024 ** 3;
  const used = history.at(-1)!.memUsed;
  return {
    sampledAt: now(),
    host: { hostname: "demo-macbook", platform: "darwin", release: "demo", arch: "arm64", uptimeSec: 3 * 86400 + 4 * 3600 },
    cpu: { model: "Sample CPU (demo)", cores, usage: history.at(-1)!.cpu, perCore: Array.from({ length: cores }, (_, i) => Math.max(1, Math.round(wave(i) + (i % 3) * 7))), loadAvg: [1.84, 1.62, 1.4] },
    memory: { total, free: total - used, used, note: "Demo mode: these are sample numbers, not your device." },
    disks: [{ label: "Atlas data", path: "/Users/you/atlas/data", total: 494 * 1024 ** 3, free: 211 * 1024 ** 3, used: 283 * 1024 ** 3 }],
    process: { pid: 0, node: "demo", rss: 92 * 1024 ** 2, heapUsed: 40 * 1024 ** 2, uptimeSec: 7200 },
    network: [],
    history,
    unsupported: [
      { metric: "Demo mode", reason: "Every number on this page is a sample. The real app reads your Mac's CPU, memory and disk." },
      { metric: "CPU / GPU temperature", reason: "Not exposed by Node.js; needs a native helper." },
      { metric: "GPU usage", reason: "No cross-platform API available to Node.js." },
      { metric: "Battery", reason: "Not exposed by Node.js on the server side." },
    ],
    atlas: { dbSize: 188416, uploadsSize: 3600, jobs: [] },
  };
}

const INTEGRATIONS = [
  ["anthropic", "Anthropic Claude", "AI", "not_configured", "Add an API key from console.anthropic.com on your Mac", ["ANTHROPIC_API_KEY"], ["AI Assistant"], "https://console.anthropic.com"],
  ["openai", "OpenAI", "AI", "not_configured", "Needed for image generation in Design Studio", ["OPENAI_API_KEY"], ["AI Assistant", "Design Studio"], "https://platform.openai.com/api-keys"],
  ["ollama", "Ollama (local models)", "AI", "not_installed", "Free, runs on your Mac", ["OLLAMA_BASE_URL"], ["AI Assistant"], "https://ollama.com"],
  ["github", "GitHub", "Code", "not_configured", "Optional. Local git works without it.", ["GITHUB_TOKEN"], ["Code Lab"], "https://github.com/settings/tokens"],
  ["git", "Git", "Code", "not_installed", "Checked on your Mac when Atlas runs", [], ["Code Lab"], undefined],
  ["vscode", "VS Code", "Code", "not_installed", "Checked on your Mac when Atlas runs", [], ["Code Lab: Open in VS Code"], "https://code.visualstudio.com"],
  ["figma", "Figma", "Design", "not_configured", "Optional token (connection test only)", ["FIGMA_TOKEN"], ["Design Studio (planned)"], "https://www.figma.com/developers/api#access-tokens"],
  ["blender", "Blender", "Engineering", "not_installed", "Checked on your Mac when Atlas runs", [], ["Engineering Lab"], "https://www.blender.org"],
  ["freecad", "FreeCAD", "Engineering", "not_installed", "Checked on your Mac when Atlas runs", [], ["Engineering Lab"], "https://www.freecad.org"],
  ["alphavantage", "Alpha Vantage (market data)", "Data", "not_configured", "Free key; otherwise import CSV files", ["ALPHAVANTAGE_API_KEY"], ["Trading Lab"], "https://www.alphavantage.co/support/#api-key"],
  ["shopify", "Shopify", "Business", "planned", "Planned: store orders and products in Mission Control", [], [], undefined],
  ["calendar", "Calendar", "Productivity", "planned", "Planned: school deadlines and events", [], [], undefined],
].map(([id, name, category, status, detail, envVars, usedBy, docsUrl]) => ({ id, name, category, status, detail, envVars, usedBy, testable: ["anthropic", "openai", "ollama", "github", "figma", "alphavantage"].includes(id as string), docsUrl }));

/** Builds a scripted, clearly labelled demo reply, running a real (mock) tool when asked to add a task. */
function demoReply(message: string, projectId: number | null) {
  const p = state.projects.find((x) => x.id === projectId);
  const add = message.match(/(?:add|create|remind me to|task)[:\s]+(.{3,120})/i);
  const events: Row[] = [];
  let text = "**Demo reply** (a sample, not a real AI). On your Mac, Claude or another AI you connect answers here.\n\n";
  if (add) {
    const title = add[1].replace(/^(a task to|to)\s+/i, "").replace(/[.!?]+$/, "");
    const t = now();
    state.tasks.push({ id: id(), project_id: projectId, title, notes: "", status: "todo", priority: "medium", due_date: null, created_at: t, updated_at: t, completed_at: null });
    log("assistant", `AI assistant added task "${title}"`, projectId);
    events.push({ id: "tool-1", name: "create_task", status: "done", summary: `Created task "${title}"` });
    text += `I added the task **“${title}”**${p ? ` to ${p.name}` : ""}. You can see it in Project Manager.`;
  } else {
    const open = state.tasks.filter((t) => t.status !== "done" && (!projectId || t.project_id === projectId)).sort(sortTasks).slice(0, 5);
    events.push({ id: "tool-1", name: "list_tasks", status: "done", summary: `${open.length} open tasks` });
    text += `${p ? `For **${p.name}**, ` : ""}here's what's open:\n\n${open.map((t) => `- ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}`).join("\n") || "- Nothing open."}\n\nTry: *“add a task to film the unboxing video”* to see the assistant use a tool.`;
  }
  return { text, events };
}

async function handle(method: string, url: URL, body: any): Promise<any> {
  const p = url.pathname;
  const q = url.searchParams;
  const m = (re: RegExp) => p.match(re);
  let r: RegExpMatchArray | null;
  const s = state;

  // --- shell / settings ---
  if (p === "/api/health") return { ok: true, demo: true };
  if (p === "/api/ai/providers") return { providers: [{ id: "demo", label: "Demo replies", configured: true, defaultModel: "sample", supportsTools: true, setupHint: "", suggestedModels: [] }, { id: "anthropic", label: "Anthropic Claude", configured: false, defaultModel: "claude-opus-5-5", supportsTools: true, setupHint: "Add ANTHROPIC_API_KEY on your Mac", suggestedModels: ["claude-opus-5-5"] }, { id: "openai", label: "OpenAI", configured: false, defaultModel: "gpt-5", supportsTools: true, setupHint: "", suggestedModels: [] }], defaultProvider: "demo" };
  if (p === "/api/settings" && method === "GET") return { ...s.settings, server: { host: "demo", port: 0, dataDir: "this browser (demo)", tokenProtected: false }, previewToken: "demo" };
  if (p === "/api/settings" && method === "PATCH") return (Object.assign(s.settings, body, body.models ? { models: { ...s.settings.models, ...body.models } } : {}), { ok: true });
  if (p === "/api/dashboard") {
    const today = day(0);
    const open = s.tasks.filter((t) => t.status !== "done");
    return {
      counts: { active_projects: s.projects.filter((x) => x.status === "active").length, open_tasks: open.length, overdue: open.filter((t) => t.due_date && t.due_date < today).length, due_today: open.filter((t) => t.due_date === today).length, done_this_week: s.tasks.filter((t) => t.status === "done" && t.completed_at > ago(60 * 24 * 7)).length, notes: s.notes.length, conversations: s.conversations.length },
      aiJobs: s.jobs.filter((j) => /^(ai|image)/.test(j.kind)).slice(-8).reverse(),
      runningScripts: [],
      providers: [{ id: "anthropic", label: "Anthropic Claude", configured: false }, { id: "openai", label: "OpenAI", configured: false }, { id: "ollama", label: "Ollama (local)", configured: false }],
    };
  }
  if (p === "/api/search") {
    const term = (q.get("q") ?? "").toLowerCase().trim();
    if (!term) return { hits: [] };
    const has = (...v: unknown[]) => v.some((x) => String(x ?? "").toLowerCase().includes(term));
    return {
      query: term,
      hits: [
        ...s.projects.filter((x) => has(x.name, x.description)).map((x) => ({ type: "project", id: x.id, title: x.name, snippet: x.description.slice(0, 120), href: `/projects/${x.id}` })),
        ...s.tasks.filter((x) => has(x.title, x.notes)).slice(0, 6).map((x) => ({ type: "task", id: x.id, title: x.title, snippet: `${x.status}${projectName(x.project_id) ? " · " + projectName(x.project_id) : ""}`, href: x.project_id ? `/projects/${x.project_id}?task=${x.id}` : "/projects" })),
        ...s.notes.filter((x) => has(x.title, x.body, x.tags)).map((x) => ({ type: "note", id: x.id, title: x.title, snippet: x.body.replace(/\s+/g, " ").slice(0, 120), href: x.kind === "note" ? `/vault?note=${x.id}` : `/engineering?doc=${x.id}` })),
        ...s.conversations.filter((x) => has(x.title)).map((x) => ({ type: "conversation", id: x.id, title: x.title, snippet: "", href: `/assistant/${x.id}` })),
      ],
    };
  }
  if (p === "/api/activity") return s.activity.slice().reverse().slice(0, Number(q.get("limit") ?? 30)).map((a) => ({ ...a, project_name: projectName(a.project_id) }));

  // --- projects & tasks ---
  if (p === "/api/projects" && method === "GET") {
    const st = q.get("status");
    return s.projects.filter((x) => (st ? x.status === st : x.status !== "archived")).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at)).map(projectView);
  }
  if (p === "/api/projects" && method === "POST") {
    if (!body.name?.trim()) throw new Err(400, "name: Required");
    const t = now();
    const x = { id: id(), description: "", status: "active", color: "cyan", workspace_id: null, workspace_subpath: "", pinned: false, ...body, created_at: t, updated_at: t };
    s.projects.push(x);
    log("projects", `Created project "${x.name}"`, x.id);
    return projectView(x);
  }
  if ((r = m(/^\/api\/projects\/(\d+)$/))) {
    const x = s.projects.find((y) => y.id === Number(r![1]));
    if (!x) throw nf("Project");
    if (method === "GET")
      return {
        project: projectView(x),
        tasks: s.tasks.filter((t) => t.project_id === x.id).sort(sortTasks),
        notes: s.notes.filter((n) => n.project_id === x.id),
        conversations: s.conversations.filter((c) => c.project_id === x.id),
        activity: s.activity.filter((a) => a.project_id === x.id).slice().reverse(),
        boards: s.boards.filter((b) => b.project_id === x.id),
      };
    if (method === "PATCH") return (Object.assign(x, body, { updated_at: now() }), log("projects", `Updated project "${x.name}"`, x.id), projectView(x));
    if (method === "DELETE") return ((s.projects = s.projects.filter((y) => y !== x)), (s.tasks = s.tasks.filter((t) => t.project_id !== x.id)), log("projects", `Deleted project "${x.name}"`), { ok: true });
  }
  if (p === "/api/tasks" && method === "GET") {
    const st = q.get("status");
    const pid = q.get("project_id");
    return s.tasks.filter((t) => (st === "open" ? t.status !== "done" : st ? t.status === st : true) && (!pid || t.project_id === Number(pid))).sort(sortTasks).slice(0, Number(q.get("limit") ?? 200)).map(taskView);
  }
  if (p === "/api/tasks" && method === "POST") {
    if (!body.title?.trim()) throw new Err(400, "title: Required");
    const t = now();
    const x = { id: id(), project_id: null, notes: "", status: "todo", priority: "medium", due_date: null, ...body, created_at: t, updated_at: t, completed_at: body.status === "done" ? t : null };
    s.tasks.push(x);
    log("projects", `Added task "${x.title}"`, x.project_id);
    return x;
  }
  if ((r = m(/^\/api\/tasks\/(\d+)$/))) {
    const x = s.tasks.find((y) => y.id === Number(r![1]));
    if (!x) throw nf("Task");
    if (method === "PATCH") {
      const was = x.status;
      Object.assign(x, body, { updated_at: now() });
      x.completed_at = x.status === "done" ? (x.completed_at ?? now()) : null;
      if (body.status && body.status !== was) log("projects", body.status === "done" ? `Completed "${x.title}"` : `Moved "${x.title}" to ${body.status}`, x.project_id);
      return x;
    }
    if (method === "DELETE") return ((s.tasks = s.tasks.filter((y) => y !== x)), { ok: true });
  }

  // --- assistant ---
  if (p === "/api/conversations" && method === "GET") {
    const pid = q.get("project_id");
    return s.conversations.filter((c) => !pid || c.project_id === Number(pid)).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map((c) => ({ ...c, project_name: projectName(c.project_id) }));
  }
  if ((r = m(/^\/api\/conversations\/(\d+)$/))) {
    const c = s.conversations.find((y) => y.id === Number(r![1]));
    if (!c) throw nf("Conversation");
    if (method === "GET") return { conversation: { ...c, project_name: projectName(c.project_id) }, messages: s.messages.filter((x) => x.conversation_id === c.id) };
    if (method === "PATCH") return Object.assign(c, body, { updated_at: now() });
    if (method === "DELETE") return ((s.conversations = s.conversations.filter((y) => y !== c)), (s.messages = s.messages.filter((x) => x.conversation_id !== c.id)), { ok: true });
  }

  // --- knowledge ---
  if (p === "/api/notes/tags") {
    const counts = new Map<string, number>();
    for (const n of s.notes.filter((x) => x.kind === "note")) for (const t of String(n.tags).split(",").map((x) => x.trim()).filter(Boolean)) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].map(([tag, count]) => ({ tag, count }));
  }
  if (p === "/api/notes/import") throw new Err(424, "Importing folders works in the real app on your Mac.");
  if (p === "/api/notes" && method === "GET") {
    const kind = q.get("kind");
    const term = (q.get("q") ?? "").toLowerCase();
    const tag = q.get("tag");
    return s.notes
      .filter((n) => (!kind || n.kind === kind) && (!term || `${n.title} ${n.body} ${n.tags}`.toLowerCase().includes(term)) && (!tag || String(n.tags).split(",").map((x) => x.trim()).includes(tag)))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at))
      .map((n) => ({ ...n, project_name: projectName(n.project_id), excerpt: n.body.slice(0, 240) }));
  }
  if (p === "/api/notes" && method === "POST") {
    const t = now();
    const n = { id: id(), project_id: null, kind: "note", body: "", tags: "", pinned: false, ...body, created_at: t, updated_at: t };
    s.notes.push(n);
    log("vault", `Created ${n.kind} "${n.title}"`, n.project_id);
    return n;
  }
  if ((r = m(/^\/api\/notes\/(\d+)$/))) {
    const n = s.notes.find((y) => y.id === Number(r![1]));
    if (!n) throw nf("Note");
    if (method === "GET") return { ...n, project_name: projectName(n.project_id) };
    if (method === "PATCH") return Object.assign(n, body, { updated_at: now() });
    if (method === "DELETE") return ((s.notes = s.notes.filter((y) => y !== n)), { ok: true });
  }
  if (p === "/api/experiments" && method === "GET") return s.experiments.slice().reverse().map((e) => ({ ...e, project_name: projectName(e.project_id) }));
  if (p === "/api/experiments" && method === "POST") return (s.experiments.push({ id: id(), hypothesis: "", method: "", result: "", status: "planned", project_id: null, ...body, created_at: now(), updated_at: now() }), s.experiments.at(-1));
  if ((r = m(/^\/api\/experiments\/(\d+)$/))) {
    const e = s.experiments.find((y) => y.id === Number(r![1]));
    if (!e) throw nf("Experiment");
    if (method === "PATCH") return Object.assign(e, body, { updated_at: now() });
    if (method === "DELETE") return ((s.experiments = s.experiments.filter((y) => y !== e)), { ok: true });
  }
  if (p === "/api/calculate") {
    const result = await calc(body.expression);
    if (body.save) s.calculations.push({ id: id(), project_id: null, label: body.label ?? "", expression: body.expression, result, created_at: now() });
    return { result };
  }
  if (p === "/api/calculations") return s.calculations.slice().reverse();
  if ((r = m(/^\/api\/calculations\/(\d+)$/))) return ((s.calculations = s.calculations.filter((c) => c.id !== Number(r![1]))), { ok: true });

  // --- code lab (one sample workspace, kept in this browser) ---
  if (p === "/api/workspaces" && method === "GET") return [{ id: 1, name: "scalp-elixir-site (demo)", path: "/Users/you/Projects/scalp-elixir-site", created_at: ago(60 * 24 * 7), exists: true }];
  if (p === "/api/workspaces" && method === "POST") throw new Err(424, "Adding your own folders works in the real app on your Mac. The demo has one sample workspace.");
  if ((r = m(/^\/api\/workspaces\/1\/tree$/))) {
    const dir = q.get("path") ?? "";
    const prefix = dir ? dir + "/" : "";
    const names = new Map<string, "dir" | "file">();
    for (const f of Object.keys(s.files)) if (f.startsWith(prefix)) {
      const rest = f.slice(prefix.length);
      const [head, ...more] = rest.split("/");
      names.set(head, more.length ? "dir" : "file");
    }
    const entries = [...names.entries()].map(([name, type]) => ({ name, path: prefix + name, type, size: type === "file" ? s.files[prefix + name].length : 0, mtime: ago(60) })).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    return { path: dir, entries };
  }
  if ((r = m(/^\/api\/workspaces\/1\/file$/))) {
    if (method === "GET") {
      const path = q.get("path") ?? "";
      if (!(path in s.files)) throw nf("File");
      return { path, size: s.files[path].length, mtime: "demo", mime: "text/plain", isText: true, tooLarge: false, content: s.files[path] };
    }
    if (method === "PUT") {
      s.files[body.path] = body.content;
      log("codelab", `Saved ${body.path} (demo copy)`);
      return { ok: true, mtime: "demo" };
    }
  }
  if (p === "/api/workspaces/1/open-editor") throw new Err(424, "Opening VS Code works in the real app on your Mac.");
  if (p === "/api/workspaces/1/git/status")
    return { available: true, root: "/Users/you/Projects/scalp-elixir-site", branch: "main", upstream: "origin/main", ahead: s.commits.length > 2 ? s.commits.length - 2 : 0, behind: 0, files: Object.keys(s.files).filter((f) => s.files[f] !== s.committed[f]).map((f) => ({ index: " ", worktree: "M", path: f })), commits: s.commits, branches: ["main"] };
  if (p === "/api/workspaces/1/git/diff") {
    const f = q.get("path");
    if (q.get("commit")) return { diff: `commit ${q.get("commit")}\n\n    (demo) Commit details appear here in the real app.` };
    const before = s.committed[f ?? ""] ?? "";
    const after = s.files[f ?? ""] ?? "";
    return { diff: `--- a/${f}\n+++ b/${f}\n@@ demo diff @@\n${before.split("\n").map((l) => "-" + l).join("\n")}\n${after.split("\n").map((l) => "+" + l).join("\n")}` };
  }
  if (p === "/api/workspaces/1/git/commit") {
    s.commits.unshift({ hash: Math.random().toString(16).slice(2, 9), author: "You", date: now(), subject: body.message });
    log("codelab", `Committed (demo): ${body.message}`);
    s.committed = { ...s.files };
    return { ok: true, output: "(demo) committed" };
  }
  if (p === "/api/workspaces/1/scripts") return { cwd: "", hasPackageJson: true, hasNodeModules: true, npm: true, scripts: Object.entries(JSON.parse(s.files["package.json"] ?? "{}").scripts ?? {}).map(([name, command]) => ({ name, command })) };
  if (p === "/api/workspaces/1/scripts/run") {
    const label = body.install ? "npm install" : `npm run ${body.script}`;
    const run = { id: id(), workspace_id: 1, workspace_name: "scalp-elixir-site (demo)", cwd: "", label, command: label, status: "running", exit_code: null, log: "", started_at: now(), finished_at: null };
    s.runs.push(run);
    const lines = body.script === "test" ? ["> test", "✓ page has a title", "✓ button says Notify me", "", "2 passed (demo output)"] : ["> build", "Building site…", "Copied index.html, css/style.css", "", "Done in 0.4s (demo output)"];
    lines.forEach((l, i) => setTimeout(() => {
      run.log += l + "\n";
      if (i === lines.length - 1) Object.assign(run, { status: "succeeded", exit_code: 0, finished_at: now() });
      save();
    }, 350 * (i + 1)));
    return { id: run.id };
  }
  if (p === "/api/runs") return s.runs.slice().reverse();
  if ((r = m(/^\/api\/runs\/(\d+)$/))) return s.runs.find((x) => x.id === Number(r![1])) ?? (() => { throw nf("Run"); })();
  if ((r = m(/^\/api\/runs\/(\d+)\/stop$/))) return (Object.assign(s.runs.find((x) => x.id === Number(r![1])) ?? {}, { status: "cancelled", finished_at: now() }), { ok: true });

  // --- design & engineering assets ---
  if (p === "/api/boards" && method === "GET") return s.boards.map((b) => ({ ...b, project_name: projectName(b.project_id), asset_count: s.assets.filter((a) => a.board_id === b.id).length }));
  if (p === "/api/boards" && method === "POST") return (s.boards.push({ id: id(), description: "", project_id: null, kind: "moodboard", ...body, created_at: now(), updated_at: now() }), s.boards.at(-1));
  if ((r = m(/^\/api\/boards\/(\d+)$/))) {
    const b = s.boards.find((y) => y.id === Number(r![1]));
    if (!b) throw nf("Board");
    if (method === "PATCH") return Object.assign(b, body);
    if (method === "DELETE") return ((s.boards = s.boards.filter((y) => y !== b)), s.assets.forEach((a) => a.board_id === b.id && (a.board_id = null)), { ok: true });
  }
  if (p === "/api/assets" && method === "GET") {
    const area = q.get("area") ?? "design";
    const board = q.get("board_id");
    const term = (q.get("q") ?? "").toLowerCase();
    return s.assets.filter((a) => a.area === area && (!board || (board === "none" ? a.board_id == null : a.board_id === Number(board))) && (!term || `${a.original_name} ${a.tags}`.toLowerCase().includes(term))).slice().reverse().map((a) => ({ ...a, board_name: s.boards.find((b) => b.id === a.board_id)?.name }));
  }
  if (p === "/api/assets/upload") {
    const files = (body as FormData).getAll("file") as File[];
    const ids: number[] = [];
    for (const f of files) {
      // Small files are kept as data URLs so they survive a reload; big ones last only for this visit.
      const demo_url = f.size < 400_000 ? await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(f); }) : URL.createObjectURL(f);
      const a = { id: id(), area: q.get("area") === "engineering" ? "engineering" : "design", board_id: q.get("board_id") ? Number(q.get("board_id")) : null, project_id: null, stored_name: f.name, original_name: f.name, mime: f.type || "application/octet-stream", size: f.size, tags: "", note: "", source: "upload", created_at: now(), demo_url };
      s.assets.push(a);
      ids.push(a.id);
    }
    return { ids };
  }
  if ((r = m(/^\/api\/assets\/(\d+)$/))) {
    const a = s.assets.find((y) => y.id === Number(r![1]));
    if (!a) throw nf("Asset");
    if (method === "PATCH") return Object.assign(a, body);
    if (method === "DELETE") return ((s.assets = s.assets.filter((y) => y !== a)), { ok: true });
  }
  if (m(/^\/api\/assets\/\d+\/open-with$/)) throw new Err(424, "Opening files in Blender or FreeCAD works in the real app on your Mac.");
  if (p === "/api/design/generate") throw new Err(424, "Image generation needs an OpenAI key in the real app.");

  // --- trading ---
  if (p === "/api/trading/datasets") return s.datasets.slice().reverse().map(datasetView);
  if ((r = m(/^\/api\/trading\/datasets\/(\d+)\/bars$/))) return s.bars[Number(r[1])] ?? [];
  if (p === "/api/trading/datasets/sample") {
    const d = { id: id(), symbol: "SYNTH", name: "Synthetic sample (not real market data)", source: "synthetic", interval: "1d", created_at: now() };
    s.datasets.push(d);
    s.bars[d.id] = syntheticBars(750, d.id);
    return { id: d.id, bars: 750 };
  }
  if (p === "/api/trading/datasets/csv") {
    const { parseCsv } = await import("../../../server/trading/engine");
    let bars: Bar[];
    try {
      bars = parseCsv(body.csv);
    } catch (e) {
      throw new Err(400, e instanceof Error ? e.message : "Could not read CSV");
    }
    const d = { id: id(), symbol: String(body.symbol).toUpperCase(), name: body.name || body.symbol, source: "csv", interval: "1d", created_at: now() };
    s.datasets.push(d);
    s.bars[d.id] = bars;
    return { id: d.id, bars: bars.length };
  }
  if (p === "/api/trading/datasets/alphavantage") throw new Err(424, "Downloading prices needs an Alpha Vantage key in the real app.");
  if ((r = m(/^\/api\/trading\/datasets\/(\d+)$/)) && method === "DELETE") return ((s.datasets = s.datasets.filter((d) => d.id !== Number(r![1]))), { ok: true });
  if (p === "/api/trading/backtests" && method === "POST") {
    const ds = s.datasets.find((d) => d.id === body.dataset_id);
    if (!ds) throw nf("Dataset");
    let res;
    try {
      res = backtest(s.bars[ds.id], { strategy: body.strategy, params: body.params ?? {}, startingCash: body.starting_cash ?? 10000, feeBps: body.fee_bps ?? 10, slippageBps: body.slippage_bps ?? 5 });
    } catch (e) {
      throw new Err(400, e instanceof Error ? e.message : "Backtest failed");
    }
    const bt = { id: id(), dataset_id: ds.id, symbol: ds.symbol, strategy: body.strategy, params: body.params, metrics: { ...res.metrics, warnings: res.warnings }, created_at: now() };
    s.backtests.push(bt);
    log("trading", `Backtested ${body.strategy} on ${ds.symbol}: ${res.metrics.totalReturnPct}%`);
    // Equity curves are recomputed on open instead of stored, to keep browser storage small.
    return { id: bt.id, strategy: body.strategy, ...res, dataset: datasetView(ds) };
  }
  if (p === "/api/trading/backtests") return s.backtests.slice().reverse();
  if ((r = m(/^\/api\/trading\/backtests\/(\d+)$/))) {
    const bt = s.backtests.find((b) => b.id === Number(r![1]));
    if (!bt) throw nf("Backtest");
    if (method === "DELETE") return ((s.backtests = s.backtests.filter((b) => b !== bt)), { ok: true });
    const ds = s.datasets.find((d) => d.id === bt.dataset_id)!;
    const res = backtest(s.bars[ds.id], { strategy: bt.strategy, params: bt.params ?? {}, startingCash: 10000, feeBps: 10, slippageBps: 5 });
    return { ...bt, ...res, dataset: datasetView(ds) };
  }
  if (p === "/api/trading/paper" && method === "GET") return s.accounts.map((a) => { const st = accountState(a.id); return { ...a, cash: st.cash, equity: st.equity, positions: st.positions.filter((x) => x.qty).length }; });
  if (p === "/api/trading/paper" && method === "POST") {
    const a = { id: id(), name: body.name, starting_cash: body.starting_cash, created_at: now() };
    s.accounts.push(a);
    return accountState(a.id);
  }
  if ((r = m(/^\/api\/trading\/paper\/(\d+)$/))) {
    const aid = Number(r[1]);
    if (method === "DELETE") return ((s.accounts = s.accounts.filter((a) => a.id !== aid)), (s.orders = s.orders.filter((o) => o.account_id !== aid)), { ok: true });
    return accountState(aid);
  }
  if ((r = m(/^\/api\/trading\/paper\/(\d+)\/quotes$/))) {
    const aid = Number(r[1]);
    const sym = String(body.symbol).toUpperCase();
    const price = body.price ?? s.bars[body.dataset_id]?.at(-1)?.close;
    if (!price) throw new Err(400, "Give a price or a dataset to take the latest close from");
    s.quotes = s.quotes.filter((x) => !(x.account_id === aid && x.symbol === sym));
    s.quotes.push({ account_id: aid, symbol: sym, price, updated_at: now() });
    return accountState(aid);
  }
  if ((r = m(/^\/api\/trading\/paper\/(\d+)\/orders$/))) {
    const aid = Number(r[1]);
    const sym = String(body.symbol).toUpperCase();
    const st = accountState(aid);
    if (!(body.qty > 0) || !(body.price > 0)) throw new Err(400, "Quantity and price must be above zero");
    if (body.side === "buy" && body.qty * body.price + (body.fee ?? 0) > st.cash + 1e-9) throw new Err(400, `Not enough virtual cash: need ${(body.qty * body.price).toFixed(2)}, have ${st.cash.toFixed(2)}`);
    if (body.side === "sell" && body.qty > (st.positions.find((x) => x.symbol === sym)?.qty ?? 0) + 1e-9) throw new Err(400, `You don't hold that many ${sym}; short selling is not supported`);
    s.orders.push({ id: id(), account_id: aid, symbol: sym, side: body.side, qty: body.qty, price: body.price, fee: body.fee ?? 0, note: "", ts: now() });
    s.quotes = s.quotes.filter((x) => !(x.account_id === aid && x.symbol === sym));
    s.quotes.push({ account_id: aid, symbol: sym, price: body.price, updated_at: now() });
    log("trading", `Paper ${body.side} ${body.qty} ${sym} @ ${body.price}`);
    return accountState(aid);
  }

  // --- automation & jobs ---
  if (p === "/api/automations/kinds") return [{ id: "backup", label: "Back up the Atlas database" }, { id: "http_check", label: "Check a website is up" }, { id: "git_snapshot", label: "Record git status of a workspace" }, { id: "script", label: "Run a package.json script" }, { id: "ai_digest", label: "AI summary of open tasks → Knowledge Vault" }];
  if (p === "/api/automations" && method === "GET") return s.automations;
  if (p === "/api/automations" && method === "POST") {
    const a = { id: id(), enabled: true, last_run_at: null, next_run_at: body.schedule?.type === "manual" ? null : new Date(Date.now() + (body.schedule?.minutes ?? 1440) * 60_000).toISOString(), created_at: now(), last_status: null, ...body };
    s.automations.push(a);
    return a;
  }
  if ((r = m(/^\/api\/automations\/(\d+)$/))) {
    const a = s.automations.find((y) => y.id === Number(r![1]));
    if (!a) throw nf("Automation");
    if (method === "PATCH") return Object.assign(a, body);
    if (method === "DELETE") return ((s.automations = s.automations.filter((y) => y !== a)), { ok: true });
  }
  if ((r = m(/^\/api\/automations\/(\d+)\/run$/))) {
    const a = s.automations.find((y) => y.id === Number(r![1]));
    if (!a) throw nf("Automation");
    const j = { id: id(), kind: a.kind, title: a.name, status: "running", error: null, log: "", result: null, automation_id: a.id, created_at: now(), started_at: now(), finished_at: null };
    s.jobs.push(j);
    Object.assign(a, { last_run_at: now(), last_status: "running" });
    setTimeout(() => {
      const ai = a.kind === "ai_digest";
      Object.assign(j, ai ? { status: "failed", error: "No AI provider is configured (demo)." } : { status: "succeeded", result: { demo: true } }, { log: `[demo] ${ai ? "Needs an AI key on your Mac." : `Simulated "${a.name}". On your Mac this really runs.`}`, finished_at: now() });
      a.last_status = j.status;
      save();
    }, 900);
    return { job_id: j.id };
  }
  if (p === "/api/jobs") return s.jobs.slice().reverse().slice(0, 60);
  if ((r = m(/^\/api\/jobs\/(\d+)$/))) return s.jobs.find((j) => j.id === Number(r![1])) ?? (() => { throw nf("Job"); })();
  if (m(/^\/api\/jobs\/\d+\/cancel$/)) return { ok: true };
  if (p === "/api/backups" && method === "GET") return [];
  if (p === "/api/backups" && method === "POST") return (log("automation", "Backup (demo): on your Mac this saves a copy of the database"), { file: "demo", size: 0 });

  // --- system & integrations ---
  if (p === "/api/system/metrics") return metrics();
  if (p === "/api/system/security")
    return {
      checkedAt: now(),
      checks: [
        { id: "demo", title: "This is the demo", status: "info", detail: "The real security review checks your Mac: network exposure, .env safety, backups and secrets committed in your projects." },
        { id: "bind", title: "Only this computer can open Atlas", status: "pass", detail: "Sample result" },
        { id: "env-git", title: ".env is not in git", status: "pass", detail: "Sample result" },
        { id: "backup", title: "Recent database backup", status: "pass", detail: "Sample result" },
        { id: "design", title: "How Atlas protects you", status: "info", detail: "API keys are read only by the server and never sent to the browser. File access is limited to workspaces you add. Deleting, saving files, running scripts and commits need your confirmation." },
      ],
    };
  if (p === "/api/system/logs") return [];
  if (p === "/api/integrations") return INTEGRATIONS;
  if (m(/^\/api\/integrations\/[\w-]+\/test$/)) return { ok: false, message: "Connection tests run in the real app on your Mac, after you add a key." };

  throw new Err(501, "This part isn't available in the demo.");
}

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

/** Streams a scripted chat reply in the same NDJSON format as the real server. */
function chatStream(body: any) {
  const s = state;
  let conv = body.conversation_id ? s.conversations.find((c) => c.id === body.conversation_id) : null;
  if (!conv) {
    conv = { id: id(), title: String(body.message).split("\n")[0].slice(0, 80), project_id: body.project_id ?? null, provider: "demo", model: "sample", created_at: now(), updated_at: now() };
    s.conversations.push(conv);
  }
  const pid = conv.project_id;
  s.messages.push({ id: id(), conversation_id: conv.id, role: "user", content: body.message, tool_events: [], attachments: (body.attachments ?? []).map((a: any) => ({ kind: a.kind, label: a.path ?? `note ${a.id}` })), created_at: now() });
  const { text, events } = demoReply(body.message, pid);
  const words = text.split(/(\s+)/);
  const enc = new TextEncoder();
  const convId = conv.id;
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: unknown) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      send({ type: "start", conversation_id: convId, provider: "demo", model: "sample" });
      await wait(250);
      for (const e of events) {
        send({ type: "tool", id: e.id, name: e.name, status: "running" });
        await wait(450);
        send({ type: "tool", ...e });
      }
      for (let i = 0; i < words.length; i += 3) {
        send({ type: "text", delta: words.slice(i, i + 3).join("") });
        await wait(30);
      }
      s.messages.push({ id: id(), conversation_id: convId, role: "assistant", content: text, tool_events: events, attachments: [], created_at: now() });
      conv!.updated_at = now();
      save();
      send({ type: "done", message_id: 0 });
      ctrl.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "content-type": "application/x-ndjson" } });
}

/** Replaces fetch for /api/* with the in-browser mock. Other requests pass through. */
export function installDemo() {
  state = load();
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, "http://demo.local");
    if (!url.pathname.startsWith("/api/") || (url.origin !== "http://demo.local" && url.origin !== location.origin)) return realFetch(input, init);
    const method = (init?.method ?? "GET").toUpperCase();
    let body: any = undefined;
    if (init?.body instanceof FormData) body = init.body;
    else if (typeof init?.body === "string" && init.body) body = JSON.parse(init.body);
    await new Promise((r) => setTimeout(r, 60));
    if (url.pathname === "/api/ai/chat") return chatStream(body);
    try {
      const data = await handle(method, url, body ?? {});
      if (method !== "GET") save();
      return json(method === "POST" ? 201 : 200, data);
    } catch (e) {
      return json(e instanceof Err ? e.status : 500, { error: e instanceof Error ? e.message : String(e) });
    }
  };
}
