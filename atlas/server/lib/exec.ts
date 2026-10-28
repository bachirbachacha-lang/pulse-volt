import { execFile, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Runs a program without a shell. Arguments are passed as an array, so nothing is shell-interpreted. */
export function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeoutMs?: number; maxBuffer?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { cwd: opts.cwd, timeout: opts.timeoutMs ?? 15000, maxBuffer: opts.maxBuffer ?? 8 * 1024 * 1024, env: opts.env ?? process.env },
      (err, stdout, stderr) => {
        const code = err ? (typeof (err as NodeJS.ErrnoException & { code?: unknown }).code === "number" ? Number((err as { code: number }).code) : 1) : 0;
        resolve({ code, stdout: String(stdout), stderr: String(stderr || (err && !stderr ? err.message : "")) });
      },
    );
  });
}

export interface StreamedProcess {
  child: ChildProcess;
  done: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
}

/** Spawns a long-running process (no shell) and reports every output chunk. */
export function spawnStreaming(
  cmd: string,
  args: string[],
  cwd: string,
  onChunk: (stream: "stdout" | "stderr" | "system", text: string) => void,
  timeoutMs = 30 * 60 * 1000,
): StreamedProcess {
  const child = spawn(cmd, args, { cwd, env: { ...process.env, FORCE_COLOR: "0", CI: "1" }, shell: false });
  const timer = setTimeout(() => {
    onChunk("system", `\n[atlas] Stopped after ${Math.round(timeoutMs / 60000)} minutes (time limit).\n`);
    child.kill("SIGTERM");
  }, timeoutMs);
  child.stdout?.on("data", (d) => onChunk("stdout", d.toString()));
  child.stderr?.on("data", (d) => onChunk("stderr", d.toString()));
  const done = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.on("error", (e) => {
      onChunk("system", `[atlas] Could not start: ${e.message}\n`);
      clearTimeout(timer);
      resolve({ code: 127, signal: null });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
  return { child, done };
}

/** Finds an executable on PATH (plus well-known macOS app locations). Returns null when absent. */
export function which(name: string, extra: string[] = []): string | null {
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const d of dirs) {
    const p = path.join(d, name);
    try {
      fs.accessSync(p, fs.constants.X_OK);
      if (fs.statSync(p).isFile()) return p;
    } catch {
      /* keep looking */
    }
  }
  for (const p of extra) {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

/** Starts a desktop app without waiting for it or tying it to the Atlas process. */
export function launchDetached(cmd: string, args: string[]) {
  const child = spawn(cmd, args, { detached: true, stdio: "ignore", shell: false });
  child.on("error", () => undefined);
  child.unref();
}
