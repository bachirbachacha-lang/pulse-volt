import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "./styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/shell/AppShell";
import { ConfirmProvider, ToastProvider } from "./components/ui/overlay";
import { EmptyState, Spinner } from "./components/ui/primitives";
import { UIProvider } from "./lib/ui-state";
import { ApiError } from "./lib/api";
import MissionControl from "./modules/MissionControl";

// Heavier modules load on demand so the first screen is fast.
const Assistant = lazy(() => import("./modules/Assistant"));
const Projects = lazy(() => import("./modules/Projects"));
const ProjectDetail = lazy(() => import("./modules/ProjectDetail"));
const CodeLab = lazy(() => import("./modules/CodeLab"));
const DesignStudio = lazy(() => import("./modules/DesignStudio"));
const EngineeringLab = lazy(() => import("./modules/EngineeringLab"));
const TradingLab = lazy(() => import("./modules/TradingLab"));
const KnowledgeVault = lazy(() => import("./modules/KnowledgeVault"));
const Automation = lazy(() => import("./modules/Automation"));
const SystemMonitor = lazy(() => import("./modules/SystemMonitor"));
const Integrations = lazy(() => import("./modules/Integrations"));
const Settings = lazy(() => import("./modules/Settings"));

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, refetchOnWindowFocus: true, retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2 },
  },
});

const page = (el: React.ReactNode) => <Suspense fallback={<Spinner className="p-6" />}>{el}</Suspense>;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <ConfirmProvider>
          <UIProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<MissionControl />} />
                  <Route path="assistant" element={page(<Assistant />)} />
                  <Route path="assistant/:id" element={page(<Assistant />)} />
                  <Route path="projects" element={page(<Projects />)} />
                  <Route path="projects/:id" element={page(<ProjectDetail />)} />
                  <Route path="code" element={page(<CodeLab />)} />
                  <Route path="design" element={page(<DesignStudio />)} />
                  <Route path="engineering" element={page(<EngineeringLab />)} />
                  <Route path="trading" element={page(<TradingLab />)} />
                  <Route path="vault" element={page(<KnowledgeVault />)} />
                  <Route path="automation" element={page(<Automation />)} />
                  <Route path="system" element={page(<SystemMonitor />)} />
                  <Route path="integrations" element={page(<Integrations />)} />
                  <Route path="settings" element={page(<Settings />)} />
                  <Route path="*" element={<EmptyState title="Page not found">That address doesn't match any module.</EmptyState>} />
                </Route>
              </Routes>
            </BrowserRouter>
          </UIProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
