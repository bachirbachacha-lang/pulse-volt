import Anthropic from "@anthropic-ai/sdk";
import type { AtlasConfig } from "../../config.js";
import { MAX_TOOL_ROUNDS, runTool, type ChatProvider, type ChatRequest, type ChatResult, type StreamEvent } from "../types.js";

// Models that accept the server-side refusal fallback ("default" routing by refusal category).
const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

export const ANTHROPIC_MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-1"];

export function anthropicProvider(cfg: AtlasConfig["anthropic"]): ChatProvider {
  const client = () => new Anthropic({ apiKey: cfg.apiKey ?? undefined, baseURL: cfg.baseURL, maxRetries: 2 });

  return {
    id: "anthropic",
    label: "Anthropic Claude",
    isConfigured: () => Boolean(cfg.apiKey),
    setupHint: "Add ANTHROPIC_API_KEY to atlas/.env and restart Atlas.",
    defaultModel: cfg.model,
    supportsTools: true,
    async listModels() {
      if (!cfg.apiKey) return ANTHROPIC_MODELS;
      try {
        const ids: string[] = [];
        for await (const m of client().models.list({ limit: 100 })) ids.push(m.id);
        return ids.length ? ids : ANTHROPIC_MODELS;
      } catch {
        return ANTHROPIC_MODELS;
      }
    },

    async chat(req: ChatRequest, emit: (e: StreamEvent) => void): Promise<ChatResult> {
      const api = client();
      const messages: Anthropic.Beta.BetaMessageParam[] = [];
      for (const turn of req.history) {
        if (turn.provider === "anthropic" && Array.isArray(turn.raw) && turn.raw.length) {
          messages.push(...(turn.raw as Anthropic.Beta.BetaMessageParam[]));
        } else if (turn.text) {
          messages.push({ role: turn.role, content: turn.text });
        }
      }
      const userMsg: Anthropic.Beta.BetaMessageParam = { role: "user", content: req.userText };
      messages.push(userMsg);
      const turnRaw: Anthropic.Beta.BetaMessageParam[] = [userMsg];

      const tools: Anthropic.Beta.BetaTool[] = req.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.jsonSchema as Anthropic.Beta.BetaTool.InputSchema,
        eager_input_streaming: true,
      }));
      const useFallback = FALLBACK_MODELS.has(req.model);

      let text = "";
      let stopReason = "end_turn";
      let servedBy = req.model;
      const usage = { inputTokens: 0, outputTokens: 0 };
      let completed = false;

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const stream = api.beta.messages.stream(
          {
            model: req.model,
            max_tokens: req.maxTokens ?? 32000,
            system: req.system,
            messages,
            ...(tools.length ? { tools } : {}),
            thinking: { type: "adaptive" },
            ...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
          },
          { signal: req.signal },
        );
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            text += event.delta.text;
            emit({ type: "text", delta: event.delta.text });
          } else if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
            emit({ type: "tool", id: event.content_block.id, name: event.content_block.name, status: "running" });
          }
        }
        const msg = await stream.finalMessage();
        servedBy = msg.model;
        usage.inputTokens += msg.usage.input_tokens;
        usage.outputTokens += msg.usage.output_tokens;
        stopReason = msg.stop_reason ?? "end_turn";
        const assistant: Anthropic.Beta.BetaMessageParam = { role: "assistant", content: msg.content as Anthropic.Beta.BetaContentBlockParam[] };
        messages.push(assistant);
        turnRaw.push(assistant);

        if (stopReason === "refusal") {
          const note = "\n\n_The model declined this request._";
          text += note;
          emit({ type: "text", delta: note });
          break;
        }
        const toolUses = msg.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
        if (stopReason === "max_tokens") {
          if (toolUses.length) emit({ type: "status", message: "Response hit the length limit before a tool call finished; the tool was not run." });
          break;
        }
        if (stopReason !== "tool_use" || toolUses.length === 0) {
          completed = true;
          break;
        }
        const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const tu of toolUses) {
          const r = await runTool(req.tools, tu.name, tu.input);
          emit({ type: "tool", id: tu.id, name: tu.name, status: r.isError ? "error" : "done", summary: r.content.slice(0, 240) });
          results.push({ type: "tool_result", tool_use_id: tu.id, content: r.content, ...(r.isError ? { is_error: true } : {}) });
        }
        const toolMsg: Anthropic.Beta.BetaMessageParam = { role: "user", content: results };
        messages.push(toolMsg);
        turnRaw.push(toolMsg);
        if (text && !text.endsWith("\n")) {
          text += "\n\n";
          emit({ type: "text", delta: "\n\n" });
        }
      }

      // Only replay the native transcript when the turn finished cleanly (keeps history append-only and valid).
      return { text, raw: completed ? turnRaw : null, stopReason, usage, servedBy };
    },
  };
}
