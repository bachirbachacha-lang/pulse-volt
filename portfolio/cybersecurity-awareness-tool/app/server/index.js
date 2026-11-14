// Starts the server. Run it with: npm start
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openStore } from './db.js';
import { createApp } from './app.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const PORT = Number(process.env.PORT) || 3311;
// 127.0.0.1 means "this computer only". Nothing else on the network can reach it.
const HOST = process.env.HOST || '127.0.0.1';

const store = openStore(process.env.LATCHLIGHT_DB || path.join(dataDir, 'latchlight.db'));
const app = createApp(store);

app.listen(PORT, HOST, () => {
  console.log(`Latchlight server is running: http://localhost:${PORT}`);
  if (!fs.existsSync(path.join(here, '..', 'dist', 'index.html'))) {
    console.log('The screens are not built yet. Use "npm run dev", or run "npm run build" and start again.');
  }
});
