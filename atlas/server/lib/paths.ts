import fs from "node:fs";
import path from "node:path";
import { forbidden, notFound } from "./errors.js";

/** File names Atlas will never read, write or serve, even inside an authorized workspace. */
const SECRET_PATTERNS = [
  /^\.env(\..*)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i,
  /^\.npmrc$/i,
  /^\.netrc$/i,
  /\.p12$/i,
  /\.keystore$/i,
  /^credentials(\.json)?$/i,
  /^secrets?\.(json|ya?ml|toml)$/i,
];

export function isSecretFile(p: string) {
  const base = path.basename(p);
  if (base === ".env.example") return false;
  return SECRET_PATTERNS.some((re) => re.test(base));
}

/** Directories hidden from browsing (still reachable by explicit path, except .git internals for writes). */
export const HIDDEN_DIRS = new Set(["node_modules", ".git", ".next", "dist", ".cache", "__pycache__", ".venv", ".DS_Store"]);

/**
 * Resolves `rel` inside `root` and guarantees the real path (after following symlinks) stays inside root.
 * Throws 403 for escapes and secret files.
 */
export function resolveInside(root: string, rel: string, opts: { mustExist?: boolean; forWrite?: boolean } = {}) {
  const realRoot = fs.realpathSync(root);
  const cleaned = (rel ?? "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (cleaned.split("/").some((seg) => seg === "..")) throw forbidden("Path may not contain '..'");
  const target = path.resolve(realRoot, cleaned);
  if (!isWithin(realRoot, target)) throw forbidden("Path is outside the workspace");

  let real = target;
  if (fs.existsSync(target)) {
    real = fs.realpathSync(target);
  } else {
    if (opts.mustExist) throw notFound("File");
    // For new files, the parent must resolve inside the root.
    const parent = fs.existsSync(path.dirname(target)) ? fs.realpathSync(path.dirname(target)) : path.dirname(target);
    real = path.join(parent, path.basename(target));
  }
  if (!isWithin(realRoot, real)) throw forbidden("Path resolves outside the workspace (symlink)");
  if (isSecretFile(real)) throw forbidden("Secret files (.env, keys, credentials) are blocked");
  if (opts.forWrite && path.relative(realRoot, real).split(path.sep).includes(".git")) {
    throw forbidden("Writing inside .git is blocked");
  }
  return { root: realRoot, abs: real, rel: path.relative(realRoot, real).split(path.sep).join("/") };
}

export function isWithin(root: string, target: string) {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

const TEXT_EXT = new Set(
  "txt md markdown json js mjs cjs ts tsx jsx css scss html htm xml svg yml yaml toml ini csv tsv py rb go rs java kt swift c h cpp hpp cs php sh zsh bash sql liquid vue svelte astro gitignore editorconfig lock env.example mdx gd glsl frag vert".split(
    " ",
  ),
);

export function looksLikeText(file: string, sample?: Buffer) {
  const ext = path.extname(file).slice(1).toLowerCase();
  if (TEXT_EXT.has(ext) || path.basename(file).startsWith(".")) return true;
  if (!sample) return false;
  return !sample.subarray(0, 4096).includes(0);
}

export function mimeFor(file: string) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const map: Record<string, string> = {
    html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", css: "text/css; charset=utf-8",
    js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", json: "application/json",
    svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    webp: "image/webp", avif: "image/avif", ico: "image/x-icon", mp4: "video/mp4", webm: "video/webm",
    mp3: "audio/mpeg", wav: "audio/wav", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf",
    txt: "text/plain; charset=utf-8", md: "text/plain; charset=utf-8", csv: "text/csv; charset=utf-8",
    pdf: "application/pdf", glb: "model/gltf-binary", gltf: "model/gltf+json", stl: "model/stl", obj: "text/plain",
    wasm: "application/wasm",
  };
  return map[ext] ?? "application/octet-stream";
}
