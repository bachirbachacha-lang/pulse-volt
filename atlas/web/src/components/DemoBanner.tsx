import { RotateCcw } from "lucide-react";
import { useConfirm } from "./ui/overlay";

/** Shown on every screen of the demo build so sample data is never mistaken for real data. */
export function DemoBanner() {
  const confirm = useConfirm();
  return (
    <div role="note" className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-gold/40 bg-[#1a1408] px-4 py-1.5 pt-[calc(env(safe-area-inset-top)+0.375rem)] text-center text-xs text-gold">
      <span><b>Demo</b>: sample data in this browser only. Scripts, git, AI and system numbers are simulated. The real app runs on your Mac.</span>
      <button
        className="inline-flex items-center gap-1 rounded-md border border-gold/40 px-2 py-0.5 hover:bg-gold/10"
        onClick={async () => {
          if (await confirm({ title: "Reset the demo?", body: "Your changes in this demo go back to the sample data.", confirmLabel: "Reset" })) {
            const { resetDemo } = await import("../demo/mock");
            resetDemo();
            location.reload();
          }
        }}
      >
        <RotateCcw className="size-3" aria-hidden /> Reset demo
      </button>
    </div>
  );
}
