import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AtlasConfig } from "../config.js";
import { needsConfirmation } from "./errors.js";

const LOOPBACK_NAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function hostname(hostHeader: string | undefined) {
  if (!hostHeader) return "";
  if (hostHeader.startsWith("[")) return hostHeader.slice(0, hostHeader.indexOf("]") + 1);
  return hostHeader.split(":")[0];
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function readCookie(req: FastifyRequest, name: string) {
  const raw = req.headers.cookie ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

/**
 * Layers of protection for a local web app:
 * 1. Host allow-list (blocks DNS-rebinding attacks from malicious websites).
 * 2. Optional access token (required when Atlas listens beyond this computer).
 * 3. State-changing API calls need a custom header + same-origin Origin (blocks cross-site requests).
 */
export function installSecurity(app: FastifyInstance, cfg: AtlasConfig) {
  app.addHook("onRequest", async (req, reply) => {
    const host = hostname(req.headers.host);
    const tokenMode = Boolean(cfg.accessToken);

    if (!tokenMode && !LOOPBACK_NAMES.has(host)) {
      return reply.code(421).send({ error: "Atlas only answers on localhost. Set ATLAS_ACCESS_TOKEN to allow other devices." });
    }

    if (tokenMode) {
      const url = new URL(req.url, "http://x");
      const fromQuery = url.searchParams.get("token");
      if (fromQuery && safeEqual(fromQuery, cfg.accessToken!)) {
        reply.header("Set-Cookie", `atlas_token=${encodeURIComponent(fromQuery)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);
        url.searchParams.delete("token");
        return reply.redirect(url.pathname + (url.search || ""));
      }
      const supplied = readCookie(req, "atlas_token") ?? (req.headers["x-atlas-token"] as string | undefined) ?? "";
      if (!safeEqual(supplied, cfg.accessToken!)) {
        return reply.code(401).send({ error: "Access token required. Open Atlas with ?token=<your ATLAS_ACCESS_TOKEN> once." });
      }
    }

    const unsafe = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    if (unsafe && req.url.startsWith("/api/")) {
      if (req.headers["x-atlas-client"] !== "web") {
        return reply.code(403).send({ error: "Missing x-atlas-client header" });
      }
      const origin = req.headers.origin;
      if (origin) {
        let ok = false;
        try {
          ok = new URL(origin).host === req.headers.host;
        } catch {
          ok = false;
        }
        if (!ok) return reply.code(403).send({ error: "Cross-origin request blocked" });
      }
    }
  });

  app.addHook("onSend", async (req, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "no-referrer");
    if (req.url.startsWith("/preview/")) {
      // Previewed sites run in an opaque, sandboxed origin so their scripts cannot call the Atlas API.
      reply.header("Content-Security-Policy", "sandbox allow-scripts allow-forms allow-popups allow-modals");
      reply.header("Access-Control-Allow-Origin", "*");
    } else {
      reply.header("X-Frame-Options", "SAMEORIGIN");
    }
    return payload;
  });
}

/** Server-side enforcement that the user explicitly confirmed a consequential action in the UI. */
export function requireConfirm(req: FastifyRequest, what: string) {
  if (req.headers["x-atlas-confirm"] !== "yes") throw needsConfirmation(`Confirm to ${what}`);
}

export type Reply = FastifyReply;
