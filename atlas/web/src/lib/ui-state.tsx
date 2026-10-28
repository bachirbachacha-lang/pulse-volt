import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface UIState {
  aiOpen: boolean;
  setAiOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean | ((p: boolean) => boolean)) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
  /** Project the AI panel should use as context (set by project pages). */
  contextProject: { id: number; name: string } | null;
  setContextProject: (p: { id: number; name: string } | null) => void;
}

const Ctx = createContext<UIState>(null as unknown as UIState);
export const useUI = () => useContext(Ctx);

function usePersisted(key: string, initial: boolean) {
  const [v, setV] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem(key);
      return s === null ? initial : s === "1";
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, v ? "1" : "0");
    } catch {
      /* private mode */
    }
  }, [key, v]);
  return [v, setV] as const;
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [aiOpen, setAiOpen] = usePersisted("atlas.aiOpen", false);
  const [sidebarCollapsed, setSidebarCollapsed] = usePersisted("atlas.sidebarCollapsed", false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contextProject, setCP] = useState<{ id: number; name: string } | null>(null);
  const setContextProject = useCallback((p: { id: number; name: string } | null) => setCP((old) => (old?.id === p?.id ? old : p)), []);
  return (
    <Ctx.Provider value={{ aiOpen, setAiOpen, sidebarCollapsed, setSidebarCollapsed, mobileNavOpen, setMobileNavOpen, paletteOpen, setPaletteOpen, helpOpen, setHelpOpen, contextProject, setContextProject }}>
      {children}
    </Ctx.Provider>
  );
}

/** True when focus is in a text field, so single-key shortcuts don't fire while typing. */
export function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || Boolean(t.closest(".cm-editor"));
}
