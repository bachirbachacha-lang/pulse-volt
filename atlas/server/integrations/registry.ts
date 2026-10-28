import type { AppContext } from "../context.js";
import { run, which } from "../lib/exec.js";

export type IntegrationStatus = "connected" | "configured" | "not_configured" | "not_installed" | "planned" | "error";

export interface DetectedTool {
  id: string;
  name: string;
  path: string | null;
}

/** Desktop tools Atlas can hand files to. Detection only checks that the program exists. */
export function detectTools(): DetectedTool[] {
  const t = (id: string, name: string, bin: string, mac: string[]) => ({ id, name, path: which(bin, mac) });
  return [
    t("git", "Git", "git", ["/usr/bin/git", "/opt/homebrew/bin/git"]),
    t("vscode", "VS Code", "code", ["/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"]),
    t("blender", "Blender", "blender", ["/Applications/Blender.app/Contents/MacOS/Blender"]),
    t("freecad", "FreeCAD", "freecad", ["/Applications/FreeCAD.app/Contents/MacOS/FreeCAD"]),
    t("openscad", "OpenSCAD", "openscad", ["/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD"]),
    t("python", "Python 3", "python3", ["/usr/bin/python3", "/opt/homebrew/bin/python3"]),
    t("npm", "npm", "npm", ["/opt/homebrew/bin/npm", "/usr/local/bin/npm"]),
  ];
}

export interface IntegrationInfo {
  id: string;
  name: string;
  category: "AI" | "Code" | "Design" | "Engineering" | "Data" | "Business" | "Productivity";
  status: IntegrationStatus;
  detail: string;
  envVars: string[];
  usedBy: string[];
  testable: boolean;
  docsUrl?: string;
}

export function listIntegrations(ctx: AppContext, ollamaUp: boolean): IntegrationInfo[] {
  const c = ctx.config;
  const tools = Object.fromEntries(detectTools().map((t) => [t.id, t]));
  const key = (v: string | null) => (v ? "configured" : "not_configured") as IntegrationStatus;
  const installed = (id: string, usedBy: string[], category: IntegrationInfo["category"], docsUrl?: string): IntegrationInfo => ({
    id,
    name: tools[id].name,
    category,
    status: tools[id].path ? "connected" : "not_installed",
    detail: tools[id].path ? `Found at ${tools[id].path}` : "Not found on this computer",
    envVars: [],
    usedBy,
    testable: false,
    docsUrl,
  });
  return [
    { id: "anthropic", name: "Anthropic Claude", category: "AI", status: key(c.anthropic.apiKey), detail: c.anthropic.apiKey ? `Default model ${c.anthropic.model}` : "Add an API key from console.anthropic.com", envVars: ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"], usedBy: ["AI Assistant", "Automation (AI digest)"], testable: true, docsUrl: "https://console.anthropic.com" },
    { id: "openai", name: "OpenAI", category: "AI", status: key(c.openai.apiKey), detail: c.openai.apiKey ? `Chat ${c.openai.model}, images ${c.openai.imageModel}` : "Needed for image generation in Design Studio", envVars: ["OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_IMAGE_MODEL"], usedBy: ["AI Assistant", "Design Studio (image generation)"], testable: true, docsUrl: "https://platform.openai.com/api-keys" },
    { id: "ollama", name: "Ollama (local models)", category: "AI", status: ollamaUp ? "connected" : "not_installed", detail: ollamaUp ? `Running at ${c.ollama.baseURL}` : `Not reachable at ${c.ollama.baseURL}. Free, runs on your Mac.`, envVars: ["OLLAMA_BASE_URL", "OLLAMA_MODEL"], usedBy: ["AI Assistant"], testable: true, docsUrl: "https://ollama.com" },
    { id: "github", name: "GitHub", category: "Code", status: key(c.githubToken), detail: c.githubToken ? "Token present (connection test available)" : "Optional. Local git works without it.", envVars: ["GITHUB_TOKEN"], usedBy: ["Code Lab (planned: PRs and issues)"], testable: true, docsUrl: "https://github.com/settings/tokens" },
    installed("git", ["Code Lab"], "Code"),
    installed("vscode", ["Code Lab: Open in VS Code"], "Code", "https://code.visualstudio.com"),
    installed("npm", ["Code Lab: run scripts"], "Code", "https://nodejs.org"),
    installed("python", ["Planned: Python scripts"], "Code"),
    { id: "figma", name: "Figma", category: "Design", status: key(c.figmaToken), detail: c.figmaToken ? "Token present (connection test only; file import is planned)" : "Optional personal access token", envVars: ["FIGMA_TOKEN"], usedBy: ["Design Studio (planned)"], testable: true, docsUrl: "https://www.figma.com/developers/api#access-tokens" },
    installed("blender", ["Engineering Lab: open 3D models"], "Engineering", "https://www.blender.org"),
    installed("freecad", ["Engineering Lab: open CAD files"], "Engineering", "https://www.freecad.org"),
    installed("openscad", ["Engineering Lab: open .scad files"], "Engineering", "https://openscad.org"),
    { id: "alphavantage", name: "Alpha Vantage (market data)", category: "Data", status: key(c.alphaVantageKey), detail: c.alphaVantageKey ? "Daily price import enabled in Trading Lab" : "Free key; otherwise import CSV files", envVars: ["ALPHAVANTAGE_API_KEY"], usedBy: ["Trading Lab"], testable: true, docsUrl: "https://www.alphavantage.co/support/#api-key" },
    { id: "shopify", name: "Shopify", category: "Business", status: "planned", detail: "Planned: store orders and products in Mission Control", envVars: [], usedBy: [], testable: false },
    { id: "gdrive", name: "Google Drive", category: "Productivity", status: "planned", detail: "Planned: import documents into the Knowledge Vault", envVars: [], usedBy: [], testable: false },
    { id: "calendar", name: "Calendar", category: "Productivity", status: "planned", detail: "Planned: show school deadlines and events", envVars: [], usedBy: [], testable: false },
  ];
}

/** Makes one cheap, read-only request to confirm a credential works. */
export async function testIntegration(ctx: AppContext, id: string): Promise<{ ok: boolean; message: string }> {
  const c = ctx.config;
  const timeout = AbortSignal.timeout(8000);
  const check = async (url: string, headers: Record<string, string>, describe: (j: any) => string) => {
    try {
      const r = await fetch(url, { headers, signal: timeout });
      const j = await r.json().catch(() => ({}));
      return r.ok ? { ok: true, message: describe(j) } : { ok: false, message: `HTTP ${r.status}: ${j?.error?.message ?? j?.message ?? r.statusText}` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }
  };
  switch (id) {
    case "anthropic":
      if (!c.anthropic.apiKey) return { ok: false, message: "ANTHROPIC_API_KEY is not set" };
      return check(`${c.anthropic.baseURL ?? "https://api.anthropic.com"}/v1/models?limit=5`, { "x-api-key": c.anthropic.apiKey, "anthropic-version": "2023-06-01" }, (j) => `Key works. ${j.data?.length ?? 0} models visible.`);
    case "openai":
      if (!c.openai.apiKey) return { ok: false, message: "OPENAI_API_KEY is not set" };
      return check(`${c.openai.baseURL}/models`, { authorization: `Bearer ${c.openai.apiKey}` }, (j) => `Key works. ${j.data?.length ?? 0} models visible.`);
    case "ollama": {
      const models = await ctx.ai.refreshOllama(true);
      return models ? { ok: true, message: models.length ? `Running with ${models.length} model(s): ${models.slice(0, 5).join(", ")}` : "Running, but no models yet. Run `ollama pull llama3.2`." } : { ok: false, message: `Not reachable at ${c.ollama.baseURL}` };
    }
    case "github":
      if (!c.githubToken) return { ok: false, message: "GITHUB_TOKEN is not set" };
      return check("https://api.github.com/user", { authorization: `Bearer ${c.githubToken}`, "user-agent": "atlas" }, (j) => `Signed in as ${j.login}`);
    case "figma":
      if (!c.figmaToken) return { ok: false, message: "FIGMA_TOKEN is not set" };
      return check("https://api.figma.com/v1/me", { "x-figma-token": c.figmaToken }, (j) => `Signed in as ${j.handle ?? j.email}`);
    case "alphavantage":
      if (!c.alphaVantageKey) return { ok: false, message: "ALPHAVANTAGE_API_KEY is not set" };
      return check(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=${encodeURIComponent(c.alphaVantageKey)}`, {}, (j) => (j["Global Quote"] ? "Key works" : (j.Note ?? j.Information ?? "Unexpected response")));
    default:
      return { ok: false, message: "This integration has no connection test" };
  }
}

export async function gitVersion() {
  const r = await run("git", ["--version"]);
  return r.code === 0 ? r.stdout.trim() : null;
}
