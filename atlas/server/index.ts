// Silence Node's one-time "SQLite is experimental" warning; node:sqlite is stable enough for this use.
const origEmit = process.emitWarning;
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const msg = typeof warning === "string" ? warning : warning?.message;
  if (msg?.includes("SQLite is an experimental feature")) return;
  return (origEmit as (...a: unknown[]) => void).call(process, warning, ...rest);
}) as typeof process.emitWarning;

const { isLoopback, loadEnvFile, readConfig } = await import("./config.js");
const { buildApp } = await import("./app.js");

loadEnvFile();
const config = readConfig();

if (!isLoopback(config.host) && !config.accessToken) {
  console.error(`\nRefusing to start: ATLAS_HOST=${config.host} would expose Atlas to your network without protection.\nSet ATLAS_ACCESS_TOKEN in atlas/.env (a long random string), or use ATLAS_HOST=127.0.0.1.\n`);
  process.exit(1);
}

const { app } = await buildApp(config, { serveWeb: true });

try {
  await app.listen({ port: config.port, host: config.host });
  const url = `http://${config.host === "0.0.0.0" ? "localhost" : config.host}:${config.port}`;
  console.log(`\n  Atlas is running → ${config.isProduction ? url : "http://127.0.0.1:5173 (dev UI)  ·  API " + url}`);
  console.log(`  Data folder: ${config.dataDir}\n`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await app.close();
    process.exit(0);
  });
}
export {};
