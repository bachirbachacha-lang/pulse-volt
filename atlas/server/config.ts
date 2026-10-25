import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export interface AtlasConfig {
  port: number;
  host: string;
  accessToken: string | null;
  dataDir: string;
  isProduction: boolean;
  anthropic: { apiKey: string | null; model: string; baseURL?: string };
  openai: { apiKey: string | null; model: string; imageModel: string; baseURL: string };
  ollama: { baseURL: string; model: string };
  githubToken: string | null;
  figmaToken: string | null;
  alphaVantageKey: string | null;
}

/** Loads ./.env (if present) without overriding variables already set in the shell. */
export function loadEnvFile(file = path.join(APP_ROOT, ".env")) {
  if (!fs.existsSync(file)) return false;
  try {
    process.loadEnvFile(file);
    return true;
  } catch {
    return false;
  }
}

const str = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export function readConfig(env: NodeJS.ProcessEnv = process.env, overrides: Partial<AtlasConfig> = {}): AtlasConfig {
  const dataDir = path.resolve(str(env.ATLAS_DATA_DIR) ?? path.join(APP_ROOT, "data"));
  const cfg: AtlasConfig = {
    port: Number(env.ATLAS_PORT ?? 4317),
    host: str(env.ATLAS_HOST) ?? "127.0.0.1",
    accessToken: str(env.ATLAS_ACCESS_TOKEN),
    dataDir,
    isProduction: env.NODE_ENV === "production",
    anthropic: {
      apiKey: str(env.ANTHROPIC_API_KEY),
      model: str(env.ANTHROPIC_MODEL) ?? "claude-opus-5-5",
      // Deliberately not read from ANTHROPIC_BASE_URL: tooling environments set that for their own use.
      baseURL: str(env.ATLAS_ANTHROPIC_BASE_URL) ?? undefined,
    },
    openai: {
      apiKey: str(env.OPENAI_API_KEY),
      model: str(env.OPENAI_MODEL) ?? "gpt-5",
      imageModel: str(env.OPENAI_IMAGE_MODEL) ?? "gpt-image-1",
      baseURL: str(env.OPENAI_BASE_URL) ?? "https://api.openai.com/v1",
    },
    ollama: {
      baseURL: (str(env.OLLAMA_BASE_URL) ?? "http://127.0.0.1:11434").replace(/\/$/, ""),
      model: str(env.OLLAMA_MODEL) ?? "llama3.2",
    },
    githubToken: str(env.GITHUB_TOKEN),
    figmaToken: str(env.FIGMA_TOKEN),
    alphaVantageKey: str(env.ALPHAVANTAGE_API_KEY),
    ...overrides,
  };
  return cfg;
}

export function isLoopback(host: string) {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}
