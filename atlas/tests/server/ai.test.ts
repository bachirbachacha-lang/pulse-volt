import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anthropicProvider } from "../../server/ai/providers/anthropic.js";
import { openAICompatibleProvider } from "../../server/ai/providers/openaiCompatible.js";
import { makeApp } from "./helpers.js";

/** Minimal mock HTTP server that records requests and replies via a handler. */
async function mockServer(handler: (body: any, req: http.IncomingMessage, res: http.ServerResponse, n: number) => void) {
  const requests: { body: any; headers: http.IncomingHttpHeaders; url: string }[] = [];
  const server = http.createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      const body = data ? JSON.parse(data) : null;
      requests.push({ body, headers: req.headers, url: req.url ?? "" });
      handler(body, req, res, requests.length);
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url, requests, close: () => new Promise<void>((r) => server.close(() => r())) };
}

const sse = (res: http.ServerResponse, events: [string, object][]) => {
  res.writeHead(200, { "content-type": "text/event-stream" });
  for (const [ev, data] of events) res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`);
  res.end();
};

const msgStart = { type: "message_start", message: { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 12, output_tokens: 0 } } };

function parseNdjson(body: string) {
  return body.trim().split("\n").map((l) => JSON.parse(l));
}

describe("Anthropic provider (SDK against a mock API)", () => {
  let t: Awaited<ReturnType<typeof makeApp>>;
  let mock: Awaited<ReturnType<typeof mockServer>>;
  beforeAll(async () => {
    mock = await mockServer((body, _req, res, n) => {
      const last = body.messages.at(-1);
      const hasToolResult = Array.isArray(last.content) && last.content.some((b: any) => b.type === "tool_result");
      if (n === 1 && !hasToolResult) {
        return sse(res, [
          ["message_start", msgStart],
          ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }],
          ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Adding it." } }],
          ["content_block_stop", { type: "content_block_stop", index: 0 }],
          ["content_block_start", { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "toolu_1", name: "create_task", input: {} } }],
          ["content_block_delta", { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"title":"Order hoodie sample"}' } }],
          ["content_block_stop", { type: "content_block_stop", index: 1 }],
          ["message_delta", { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 20 } }],
          ["message_stop", { type: "message_stop" }],
        ]);
      }
      return sse(res, [
        ["message_start", msgStart],
        ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }],
        ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Done!" } }],
        ["content_block_stop", { type: "content_block_stop", index: 0 }],
        ["message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 3 } }],
        ["message_stop", { type: "message_stop" }],
      ]);
    });
    t = await makeApp();
    t.ctx.ai.set(anthropicProvider({ apiKey: "test-key", model: "claude-opus-5-5", baseURL: mock.url }));
  });
  afterAll(async () => (await t.close(), await mock.close()));

  it("streams text, runs a tool, and stores the conversation", async () => {
    const p = (await t.post("/api/projects", { name: "Winter store" })).json;
    const r = await t.post("/api/ai/chat", { provider: "anthropic", project_id: p.id, message: "Add a task to order the hoodie sample" });
    expect(r.status).toBe(200);
    const events = parseNdjson(r.body);
    expect(events[0]).toMatchObject({ type: "start", provider: "anthropic", model: "claude-opus-5-5" });
    expect(events.filter((e) => e.type === "text").map((e) => e.delta).join("")).toContain("Done!");
    expect(events.find((e) => e.type === "tool" && e.status === "done")?.name).toBe("create_task");
    expect(events.at(-1).type).toBe("done");

    // The tool really created a task in the current project.
    const tasks = (await t.get(`/api/tasks?project_id=${p.id}`)).json;
    expect(tasks.map((x: any) => x.title)).toContain("Order hoodie sample");

    // Request shape: system prompt carries project context; tool loop sends tool_result; fallbacks opt-in.
    const first = mock.requests[0];
    expect(first.body.system).toContain("Winter store");
    expect(first.body.thinking).toEqual({ type: "adaptive" });
    expect(first.body.fallbacks).toBe("default");
    expect(String(first.headers["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
    expect(first.body.tools.find((x: any) => x.name === "create_task").eager_input_streaming).toBe(true);
    expect(mock.requests[1].body.messages.at(-1).content[0]).toMatchObject({ type: "tool_result", tool_use_id: "toolu_1" });

    // Second turn replays the native transcript unchanged (append-only history).
    const convId = events[0].conversation_id;
    await t.post("/api/ai/chat", { conversation_id: convId, message: "Thanks" });
    const third = mock.requests[2].body.messages;
    expect(third).toHaveLength(5); // user, assistant(tool_use), user(tool_result), assistant(text), user
    expect(third[1].content.some((b: any) => b.type === "tool_use")).toBe(true);
    const convo = (await t.get(`/api/conversations/${convId}`)).json;
    expect(convo.messages.map((m: any) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(convo.messages[1].tool_events[0].name).toBe("create_task");
  });

  it("returns a clear error when no provider is configured", async () => {
    const a = await makeApp();
    try {
      const r = await a.post("/api/ai/chat", { message: "hi" });
      expect(r.status).toBe(424);
      expect(r.json.error).toMatch(/No AI provider/);
    } finally {
      await a.close();
    }
  });
});

describe("OpenAI-compatible provider (mock server)", () => {
  it("assembles streamed tool-call fragments and finishes the turn", async () => {
    const mock = await mockServer((body, _req, res, n) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      const send = (o: object) => res.write(`data: ${JSON.stringify(o)}\n\n`);
      if (n === 1) {
        send({ choices: [{ index: 0, delta: { role: "assistant", tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "search_atlas", arguments: "" } }] } }] });
        send({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '{"que' } }] } }] });
        send({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: 'ry":"matcha"}' } }] }, finish_reason: "tool_calls" }] });
      } else {
        expect(body.messages.at(-1)).toMatchObject({ role: "tool", tool_call_id: "call_1" });
        send({ choices: [{ index: 0, delta: { content: "Found " } }] });
        send({ choices: [{ index: 0, delta: { content: "it." }, finish_reason: "stop" }] });
        send({ choices: [], usage: { prompt_tokens: 7, completion_tokens: 3 } });
      }
      res.write("data: [DONE]\n\n");
      res.end();
    });
    const t = await makeApp();
    try {
      t.ctx.ai.set(openAICompatibleProvider({ id: "openai", label: "OpenAI", baseURL: mock.url, apiKey: "k", model: "gpt-test", requiresKey: true, supportsTools: true, setupHint: "", listModels: async () => ["gpt-test"] }));
      await t.post("/api/notes", { title: "Bear be matcha", body: "matcha cafe lead in Jeddah" });
      const r = await t.post("/api/ai/chat", { provider: "openai", message: "find matcha" });
      const events = parseNdjson(r.body);
      expect(events.filter((e) => e.type === "text").map((e) => e.delta).join("")).toBe("Found it.");
      expect(events.find((e) => e.type === "tool" && e.status === "done")?.summary).toContain("Bear be matcha");
      expect(events.at(-1)).toMatchObject({ type: "done", usage: { inputTokens: 7, outputTokens: 3 } });
      expect(mock.requests[0].headers.authorization).toBe("Bearer k");
    } finally {
      await t.close();
      await mock.close();
    }
  });

  it("reports provider HTTP errors without replaying the failed turn", async () => {
    const mock = await mockServer((_b, _r, res) => (res.writeHead(401, { "content-type": "application/json" }), res.end('{"error":{"message":"bad key"}}')));
    const t = await makeApp();
    try {
      t.ctx.ai.set(openAICompatibleProvider({ id: "openai", label: "OpenAI", baseURL: mock.url, apiKey: "k", model: "m", requiresKey: true, supportsTools: false, setupHint: "", listModels: async () => [] }));
      const r = await t.post("/api/ai/chat", { provider: "openai", message: "hi" });
      const events = parseNdjson(r.body);
      expect(events.at(-1).type).toBe("error");
      expect(events.at(-1).message).toContain("401");
      const convo = (await t.get(`/api/conversations/${events[0].conversation_id}`)).json;
      expect(convo.messages.every((m: any) => m.error)).toBe(true);
      expect((await t.get("/api/system/logs?level=error")).json.length).toBeGreaterThan(0);
    } finally {
      await t.close();
      await mock.close();
    }
  });
});
