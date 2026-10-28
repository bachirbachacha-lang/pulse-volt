# Atlas (personal command center app)
Read owner.md first.

- Built 25 Oct 2026 in `atlas/` (local app: Node 22 + Fastify + SQLite + React). Owner asked for a "JARVIS"-style system with real working tools, no car configurator.
- 12 modules: Mission Control, AI Assistant, Project Manager, Code Lab, Design Studio, Engineering Lab, Trading Lab, Knowledge Vault, Automation Center, System Monitor, Integrations, Settings.
- Runs on the MacBook (once bought): `cd atlas && npm install && npm run build && npm start`, then http://127.0.0.1:4317. iPad access needs ATLAS_HOST=0.0.0.0 + ATLAS_ACCESS_TOKEN.
- AI needs ANTHROPIC_API_KEY or OPENAI_API_KEY in atlas/.env (owner adds it; never paste keys in chat), or free Ollama.
- Trading Lab is education/paper only. No broker, no real money; money decisions go through Dad.
- Status and the works/needs-key/planned table: atlas/README.md.
