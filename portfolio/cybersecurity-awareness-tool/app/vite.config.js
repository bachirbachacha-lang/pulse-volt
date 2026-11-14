import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite builds the screens (the "client" folder).
// While developing, any request that starts with /api is passed on to the
// Express server on port 3311, so the screens and the server feel like one app.
export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    port: 5311,
    proxy: { '/api': 'http://localhost:3311' },
  },
  build: { outDir: '../dist', emptyOutDir: true },
});
