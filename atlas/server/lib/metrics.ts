import fs from "node:fs";
import os from "node:os";

export interface MetricPoint {
  ts: number;
  cpu: number; // 0..100, whole machine
  memUsed: number; // bytes
}

/**
 * Samples real CPU usage by diffing os.cpus() tick counters. Keeps a short in-memory history.
 * Nothing here is simulated: if a metric is not available from Node on this OS it is reported as unsupported.
 */
export class MetricsSampler {
  history: MetricPoint[] = [];
  perCore: number[] = [];
  private last = os.cpus().map((c) => c.times);
  private timer: NodeJS.Timeout | null = null;

  start(intervalMs = 2000, keep = 150) {
    if (this.timer) return;
    this.sample(keep);
    this.timer = setInterval(() => this.sample(keep), intervalMs);
    this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private sample(keep: number) {
    const cur = os.cpus().map((c) => c.times);
    let idleSum = 0;
    let totalSum = 0;
    this.perCore = cur.map((t, i) => {
      const p = this.last[i] ?? t;
      const idle = t.idle - p.idle;
      const total = t.user + t.nice + t.sys + t.irq + t.idle - (p.user + p.nice + p.sys + p.irq + p.idle);
      idleSum += idle;
      totalSum += total;
      return total > 0 ? Math.round((1 - idle / total) * 1000) / 10 : 0;
    });
    this.last = cur;
    const cpu = totalSum > 0 ? Math.round((1 - idleSum / totalSum) * 1000) / 10 : 0;
    this.history.push({ ts: Date.now(), cpu, memUsed: os.totalmem() - os.freemem() });
    if (this.history.length > keep) this.history.splice(0, this.history.length - keep);
  }

  snapshot(diskPaths: { label: string; path: string }[]) {
    const cpus = os.cpus();
    const disks = diskPaths.flatMap(({ label, path }) => {
      try {
        const s = fs.statfsSync(path);
        const total = s.blocks * s.bsize;
        const free = s.bavail * s.bsize;
        return [{ label, path, total, free, used: total - free }];
      } catch {
        return [];
      }
    });
    const mem = process.memoryUsage();
    return {
      sampledAt: new Date().toISOString(),
      host: { hostname: os.hostname(), platform: os.platform(), release: os.release(), arch: os.arch(), uptimeSec: Math.round(os.uptime()) },
      cpu: {
        model: cpus[0]?.model ?? "unknown",
        cores: cpus.length,
        usage: this.history.at(-1)?.cpu ?? null,
        perCore: this.perCore,
        loadAvg: os.platform() === "win32" ? null : os.loadavg(),
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        note: os.platform() === "darwin" ? "macOS counts cached memory as used, so 'free' looks lower than Activity Monitor's 'available'." : null,
      },
      disks,
      process: { pid: process.pid, node: process.version, rss: mem.rss, heapUsed: mem.heapUsed, uptimeSec: Math.round(process.uptime()) },
      network: Object.entries(os.networkInterfaces()).map(([name, addrs]) => ({
        name,
        addresses: (addrs ?? []).filter((a) => !a.internal).map((a) => `${a.family} ${a.address}`),
      })).filter((n) => n.addresses.length > 0),
      history: this.history,
      unsupported: [
        { metric: "CPU / GPU temperature", reason: "Not exposed by Node.js; needs a native helper (e.g. macOS powermetrics with admin rights)." },
        { metric: "GPU usage", reason: "No cross-platform API available to Node.js." },
        { metric: "Battery", reason: "Not exposed by Node.js on the server side." },
        { metric: "Per-app CPU", reason: "Planned: would need parsing `ps` output per platform." },
      ],
    };
  }
}
