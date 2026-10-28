import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const apiPort = Number(process.env.ATLAS_PORT ?? 4317);
const demo = process.env.VITE_DEMO === "1";

export default defineConfig({
  root: "web",
  // The demo build is served from any folder (relative paths) and has no server behind it.
  base: demo ? "./" : "/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@shared": fileURLToPath(new URL("./shared", import.meta.url)) } },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false },
      "/preview": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false },
    },
  },
  build: { outDir: demo ? "../dist-demo" : "../dist", emptyOutDir: true, chunkSizeWarningLimit: 1500, target: "es2022" },
});
