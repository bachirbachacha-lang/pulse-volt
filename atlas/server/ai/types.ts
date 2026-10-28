import type { z } from "zod";

export type ProviderId = "anthropic" | "openai" | "ollama";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  /** Provider-native messages recorded for this turn, replayed unchanged when the same provider continues. */
  raw?: unknown[] | null;
  provider?: string | null;
}

export interface ToolSpec {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  jsonSchema: Record<string, unknown>;
  /** True if the tool changes data (shown to the user; never destructive). */
  mutates: boolean;
  run: (input: any) => Promise<string>;
}

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; id: string; name: string; status: "running" | "done" | "error"; summary?: string }
  | { type: "status"; message: string };

export interface ChatRequest {
  model: string;
  system: string;
  history: ChatTurn[];
  /** Content of the new user message (already includes attached file text). */
  userText: string;
  tools: ToolSpec[];
  signal: AbortSignal;
  maxTokens?: number;
}

export interface ChatResult {
  text: string;
  /** Provider-native messages for this turn (user message first). null when the turn should not be replayed raw. */
  raw: unknown[] | null;
  stopReason: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  servedBy?: string;
}

export interface ChatProvider {
  id: ProviderId;
  label: string;
  isConfigured(): boolean;
  setupHint: string;
  defaultModel: string;
  supportsTools: boolean;
  listModels(): Promise<string[]>;
  chat(req: ChatRequest, emit: (e: StreamEvent) => void): Promise<ChatResult>;
}

export const MAX_TOOL_ROUNDS = 8;

/** Runs one tool call with validation; returns content for the tool result and whether it failed. */
export async function runTool(tools: ToolSpec[], name: string, input: unknown): Promise<{ content: string; isError: boolean }> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return { content: `Unknown tool: ${name}`, isError: true };
  const parsed = tool.schema.safeParse(input);
  if (!parsed.success) return { content: `INVALID_INPUT: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`, isError: true };
  try {
    return { content: await tool.run(parsed.data), isError: false };
  } catch (e) {
    return { content: `Tool failed: ${e instanceof Error ? e.message : String(e)}`, isError: true };
  }
}
