import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Builds the PREVIEW: the whole app as ONE html file with no server.
// Run: npm run build:preview   ->   preview/latchlight-preview.html
const here = path.dirname(fileURLToPath(import.meta.url));
const demoApi = path.join(here, 'client/src/api.demo.js');

export default defineConfig({
  root: 'client',
  plugins: [
    react(),
    {
      // Wherever a screen imports api.js, hand it api.demo.js instead.
      name: 'use-demo-api',
      enforce: 'pre',
      resolveId(source, importer) {
        if (importer && /(^|\/)api\.js$/.test(source) && importer.includes('/client/src/')) return demoApi;
      },
    },
    {
      // After the build, glue the script and styles into a single file.
      name: 'one-file',
      closeBundle() {
        const out = path.join(here, 'dist-preview');
        const assets = fs.readdirSync(path.join(out, 'assets'));
        const read = (ext) => assets.filter((f) => f.endsWith(ext)).map((f) => fs.readFileSync(path.join(out, 'assets', f), 'utf8')).join('\n');
        const js = read('.js').replace(/<\/script/gi, '<\\/script');
        const html = `<title>Latchlight Preview</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,600..700&display=swap">
<style>${read('.css')}
/* Preview only: one deliberate light look, and room for a phone's side bars. */
:root { color-scheme: light; }
.main { padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
@media (min-width: 900px) { .main { padding-left: 32px; padding-right: 32px; } .side { height: 100%; min-height: 100vh; } }
</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
        fs.mkdirSync(path.join(here, 'preview'), { recursive: true });
        fs.writeFileSync(path.join(here, 'preview', 'latchlight-preview.html'), html);
      },
    },
  ],
  build: {
    outDir: '../dist-preview',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: { input: path.join(here, 'client/demo.html') },
  },
});
