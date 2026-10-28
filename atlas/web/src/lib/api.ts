export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error",
  ) {
    super(message);
  }
}

interface Opts {
  method?: string;
  body?: unknown;
  /** Sends the confirmation header; only pass after the user confirmed in the UI. */
  confirmed?: boolean;
  signal?: AbortSignal;
}

export async function api<T = any>(url: string, opts: Opts = {}): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined ? "POST" : "GET");
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) body = opts.body;
  else if (method !== "GET") {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body ?? {});
  }
  if (method !== "GET") headers["x-atlas-client"] = "web";
  if (opts.confirmed) headers["x-atlas-confirm"] = "yes";
  const res = await fetch(url, { method, headers, body, signal: opts.signal });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.code);
  return data as T;
}

export const get = <T = any>(url: string) => api<T>(url);
export const post = <T = any>(url: string, body?: unknown, confirmed = false) => api<T>(url, { method: "POST", body, confirmed });
export const patch = <T = any>(url: string, body: unknown, confirmed = false) => api<T>(url, { method: "PATCH", body, confirmed });
export const put = <T = any>(url: string, body: unknown, confirmed = false) => api<T>(url, { method: "PUT", body, confirmed });
export const del = <T = any>(url: string) => api<T>(url, { method: "DELETE", confirmed: true });

export type ChatEvent =
  | { type: "start"; conversation_id: number; provider: string; model: string }
  | { type: "text"; delta: string }
  | { type: "tool"; id: string; name: string; status: "running" | "done" | "error"; summary?: string }
  | { type: "status"; message: string }
  | { type: "done"; message_id: number; usage?: { inputTokens?: number; outputTokens?: number }; servedBy?: string }
  | { type: "error"; message: string };

/** Streams a chat reply (newline-delimited JSON). */
export async function streamChat(body: unknown, onEvent: (e: ChatEvent) => void, signal: AbortSignal) {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-atlas-client": "web" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error ?? `Chat failed (${res.status})`, data.code);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) onEvent(JSON.parse(line));
    }
  }
}
