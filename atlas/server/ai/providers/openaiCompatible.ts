import { MAX_TOOL_ROUNDS, runTool, type ChatProvider, type ChatRequest, type ChatResult, type ProviderId, type StreamEvent } from "../types.js";

interface OAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

/** Reads a text/event-stream body and yields each `data:` payload. */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, "");
      buf = buf.slice(idx + 1);
      if (line.startsWith("data:")) yield line.slice(5).trimStart();
    }
  }
  if (buf.startsWith("data:")) yield buf.slice(5).trimStart();
}

interface Options {
  id: ProviderId;
  label: string;
  baseURL: string; // e.g. https://api.openai.com/v1
  apiKey: string | null;
  model: string;
  requiresKey: boolean;
  supportsTools: boolean;
  setupHint: string;
  listModels: () => Promise<string[]>;
  isConfigured?: () => boolean;
}

/** One adapter for OpenAI and any OpenAI-compatible server (Ollama exposes /v1/chat/completions). */
export function openAICompatibleProvider(o: Options): ChatProvider {
  return {
    id: o.id,
    label: o.label,
    isConfigured: o.isConfigured ?? (() => !o.requiresKey || Boolean(o.apiKey)),
    setupHint: o.setupHint,
    defaultModel: o.model,
    supportsTools: o.supportsTools,
    listModels: o.listModels,

    async chat(req: ChatRequest, emit: (e: StreamEvent) => void): Promise<ChatResult> {
      const messages: OAIMessage[] = [{ role: "system", content: req.system }];
      for (const turn of req.history) {
        if (turn.provider === o.id && Array.isArray(turn.raw) && turn.raw.length) messages.push(...(turn.raw as OAIMessage[]));
        else if (turn.text) messages.push({ role: turn.role, content: turn.text });
      }
      const userMsg: OAIMessage = { role: "user", content: req.userText };
      messages.push(userMsg);
      const turnRaw: OAIMessage[] = [userMsg];
      const tools = o.supportsTools
        ? req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.jsonSchema } }))
        : [];

      let text = "";
      let stopReason = "stop";
      let completed = false;
      const usage = { inputTokens: 0, outputTokens: 0 };

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const res = await fetch(`${o.baseURL.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          signal: req.signal,
          headers: { "content-type": "application/json", ...(o.apiKey ? { authorization: `Bearer ${o.apiKey}` } : {}) },
          body: JSON.stringify({
            model: req.model,
            messages,
            stream: true,
            stream_options: { include_usage: true },
            ...(tools.length ? { tools } : {}),
          }),
        });
        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          throw new Error(`${o.label} returned ${res.status}: ${detail.slice(0, 400)}`);
        }
        let roundText = "";
        const calls: { id: string; name: string; args: string }[] = [];
        for await (const data of sseData(res.body)) {
          if (data === "[DONE]") break;
          let chunk: any;
          try {
            chunk = JSON.parse(data);
          } catch {
            continue;
          }
          if (chunk.error) throw new Error(chunk.error.message ?? "Provider error");
          if (chunk.usage) {
            usage.inputTokens += chunk.usage.prompt_tokens ?? 0;
            usage.outputTokens += chunk.usage.completion_tokens ?? 0;
          }
          const choice = chunk.choices?.[0];
          if (!choice) continue;
          const delta = choice.delta ?? {};
          if (typeof delta.content === "string" && delta.content) {
            roundText += delta.content;
            emit({ type: "text", delta: delta.content });
          }
          for (const tc of delta.tool_calls ?? []) {
            const i = tc.index ?? 0;
            if (!calls[i]) {
              calls[i] = { id: tc.id ?? `call_${round}_${i}`, name: tc.function?.name ?? "", args: "" };
              if (calls[i].name) emit({ type: "tool", id: calls[i].id, name: calls[i].name, status: "running" });
            } else if (tc.function?.name && !calls[i].name) {
              calls[i].name = tc.function.name;
            }
            if (tc.function?.arguments) calls[i].args += tc.function.arguments;
          }
          if (choice.finish_reason) stopReason = choice.finish_reason;
        }
        text += roundText;
        const toolCalls = calls.filter(Boolean);
        const assistant: OAIMessage = {
          role: "assistant",
          content: roundText || null,
          ...(toolCalls.length ? { tool_calls: toolCalls.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: c.args } })) } : {}),
        };
        messages.push(assistant);
        turnRaw.push(assistant);
        if (!toolCalls.length || stopReason === "length") {
          completed = stopReason !== "length";
          break;
        }
        for (const c of toolCalls) {
          let input: unknown = {};
          let r: { content: string; isError: boolean };
          try {
            input = c.args ? JSON.parse(c.args) : {};
            r = await runTool(req.tools, c.name, input);
          } catch {
            r = { content: "INVALID_JSON: tool arguments were not valid JSON", isError: true };
          }
          emit({ type: "tool", id: c.id, name: c.name, status: r.isError ? "error" : "done", summary: r.content.slice(0, 240) });
          const toolMsg: OAIMessage = { role: "tool", tool_call_id: c.id, content: r.content };
          messages.push(toolMsg);
          turnRaw.push(toolMsg);
        }
        if (text && !text.endsWith("\n")) {
          text += "\n\n";
          emit({ type: "text", delta: "\n\n" });
        }
      }
      return { text, raw: completed ? turnRaw : null, stopReason, usage, servedBy: req.model };
    },
  };
}
