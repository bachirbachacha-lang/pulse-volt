import { MODULES } from "../../lib/modules";
import { useUI } from "../../lib/ui-state";
import { Modal } from "../ui/overlay";
import { MOD } from "./AppShell";

export function ShortcutsHelp() {
  const ui = useUI();
  const general: [string, string][] = [
    [`${MOD} K`, "Search and command palette"],
    ["/", "Open search"],
    [`${MOD} J`, "Show or hide the AI panel"],
    ["[", "Collapse or expand the sidebar"],
    ["?", "This list"],
    [`${MOD} Enter`, "Send message (in chat)"],
    [`${MOD} S`, "Save file (in Code Lab editor)"],
    ["Esc", "Close dialogs"],
  ];
  return (
    <Modal open={ui.helpOpen} onClose={() => ui.setHelpOpen(false)} title="Keyboard shortcuts" wide>
      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">General</h3>
          <dl className="space-y-1.5 text-sm">
            {general.map(([k, d]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <dt className="text-fg-2">{d}</dt>
                <dd className="flex gap-1">{k.split(" ").map((p) => <kbd key={p} className="kbd">{p}</kbd>)}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Go to (press g, then…)</h3>
          <dl className="space-y-1.5 text-sm">
            {MODULES.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3">
                <dt className="text-fg-2">{m.label}</dt>
                <dd className="flex gap-1"><kbd className="kbd">g</kbd><kbd className="kbd">{m.key}</kbd></dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </Modal>
  );
}
