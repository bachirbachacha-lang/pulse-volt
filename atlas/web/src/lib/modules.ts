import {
  Activity, Bot, BrainCircuit, CandlestickChart, Code2, FolderKanban, Gauge, Library, Palette, Plug, Settings, Workflow, type LucideIcon,
} from "lucide-react";

export interface ModuleDef {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Second key after "g" (e.g. g then p). */
  key: string;
  description: string;
}

export const MODULES: ModuleDef[] = [
  { id: "mission", label: "Mission Control", path: "/", icon: Gauge, key: "m", description: "Projects, tasks, activity and system status at a glance" },
  { id: "assistant", label: "AI Assistant", path: "/assistant", icon: Bot, key: "a", description: "Chat with your configured AI, with project context" },
  { id: "projects", label: "Project Manager", path: "/projects", icon: FolderKanban, key: "p", description: "Projects, tasks and progress" },
  { id: "code", label: "Code Lab", path: "/code", icon: Code2, key: "c", description: "Browse, edit, run and preview your code" },
  { id: "design", label: "Design Studio", path: "/design", icon: Palette, key: "d", description: "Moodboards, references, assets and image generation" },
  { id: "engineering", label: "Engineering Lab", path: "/engineering", icon: BrainCircuit, key: "e", description: "Docs, diagrams, calculations, experiments, 3D models" },
  { id: "trading", label: "Trading Lab", path: "/trading", icon: CandlestickChart, key: "t", description: "Research, backtests and paper trading (no real money)" },
  { id: "vault", label: "Knowledge Vault", path: "/vault", icon: Library, key: "k", description: "Searchable notes and imported documents" },
  { id: "automation", label: "Automation Center", path: "/automation", icon: Workflow, key: "u", description: "Scheduled jobs and background tasks" },
  { id: "system", label: "System Monitor", path: "/system", icon: Activity, key: "s", description: "Real CPU, memory and disk, logs, security review" },
  { id: "integrations", label: "Integrations", path: "/integrations", icon: Plug, key: "i", description: "AI providers, tools and services" },
  { id: "settings", label: "Settings", path: "/settings", icon: Settings, key: ",", description: "Preferences, widgets, backups" },
];

export const PROJECT_COLORS: Record<string, string> = {
  cyan: "#22d3ee",
  violet: "#a78bfa",
  amber: "#f5b544",
  emerald: "#34d399",
  rose: "#fb7185",
  sky: "#38bdf8",
  slate: "#94a3b8",
};
