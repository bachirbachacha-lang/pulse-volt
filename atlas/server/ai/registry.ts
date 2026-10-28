import type { AtlasConfig } from "../config.js";
import { anthropicProvider, ANTHROPIC_MODELS } from "./providers/anthropic.js";
import { openAICompatibleProvider } from "./providers/openaiCompatible.js";
import type { ChatProvider, ProviderId } from "./types.js";

export async function pingOllama(baseURL: string, timeoutMs = 1500): Promise<string[] | null> {
  try {
    const res = await fetch(`${baseURL}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const data = (await res.json()) as { models?: { name: string }[] };
    return (data.models ?? []).map((m) => m.name);
  } catch {
    return null;
  }
}

export class ProviderRegistry {
  private providers = new Map<ProviderId, ChatProvider>();
  private ollamaModels: string[] | null = null;
  private ollamaCheckedAt = 0;

  constructor(private cfg: AtlasConfig) {
    this.providers.set("anthropic", anthropicProvider(cfg.anthropic));
    this.providers.set(
      "openai",
      openAICompatibleProvider({
        id: "openai",
        label: "OpenAI",
        baseURL: cfg.openai.baseURL,
        apiKey: cfg.openai.apiKey,
        model: cfg.openai.model,
        requiresKey: true,
        supportsTools: true,
        setupHint: "Add OPENAI_API_KEY to atlas/.env and restart Atlas.",
        listModels: async () => {
          if (!cfg.openai.apiKey) return [cfg.openai.model];
          try {
            const r = await fetch(`${cfg.openai.baseURL}/models`, { headers: { authorization: `Bearer ${cfg.openai.apiKey}` }, signal: AbortSignal.timeout(5000) });
            const d = (await r.json()) as { data?: { id: string }[] };
            const ids = (d.data ?? []).map((m) => m.id).filter((id) => /^(gpt|o\d|chatgpt)/.test(id)).sort();
            return ids.length ? ids : [cfg.openai.model];
          } catch {
            return [cfg.openai.model];
          }
        },
      }),
    );
    this.providers.set(
      "ollama",
      openAICompatibleProvider({
        id: "ollama",
        label: "Ollama (local)",
        baseURL: `${cfg.ollama.baseURL}/v1`,
        apiKey: null,
        model: cfg.ollama.model,
        requiresKey: false,
        supportsTools: process.env.OLLAMA_TOOLS === "1",
        setupHint: "Install Ollama from ollama.com, run `ollama pull llama3.2`, and keep it running.",
        isConfigured: () => Boolean(this.ollamaModels && this.ollamaModels.length),
        listModels: async () => (await this.refreshOllama(true)) ?? [],
      }),
    );
  }

  async refreshOllama(force = false) {
    if (force || Date.now() - this.ollamaCheckedAt > 30_000) {
      this.ollamaModels = await pingOllama(this.cfg.ollama.baseURL);
      this.ollamaCheckedAt = Date.now();
    }
    return this.ollamaModels;
  }

  /** Test hook: replace a provider (e.g. with one pointing at a local mock server). */
  set(p: ChatProvider) {
    this.providers.set(p.id, p);
  }

  get(id: string): ChatProvider | undefined {
    return this.providers.get(id as ProviderId);
  }

  async describe() {
    await this.refreshOllama();
    return [...this.providers.values()].map((p) => ({
      id: p.id,
      label: p.label,
      configured: p.isConfigured(),
      defaultModel: p.defaultModel,
      supportsTools: p.supportsTools,
      setupHint: p.setupHint,
      suggestedModels: p.id === "anthropic" ? ANTHROPIC_MODELS : p.id === "ollama" ? (this.ollamaModels ?? []) : [p.defaultModel],
    }));
  }

  /** The first configured provider, preferring the user's saved default. */
  async pickDefault(preferred?: string | null): Promise<ChatProvider | null> {
    await this.refreshOllama();
    if (preferred) {
      const p = this.get(preferred);
      if (p?.isConfigured()) return p;
    }
    for (const p of this.providers.values()) if (p.isConfigured()) return p;
    return null;
  }
}
