import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "./ui/overlay";
import { cx, Spinner } from "./ui/primitives";

/** Drag-and-drop or tap-to-pick uploader posting multipart files to /api/assets/upload. */
export function Uploader({ query, accept, onDone, label = "Drop files here or tap to choose" }: { query: string; accept?: string; onDone: () => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("file", f, f.name);
    setBusy(true);
    try {
      const r = await api(`/api/assets/upload?${query}`, { method: "POST", body: fd });
      toast(`Uploaded ${r.ids.length} file${r.ids.length > 1 ? "s" : ""}`);
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => (e.preventDefault(), setDrag(true))}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => (e.preventDefault(), setDrag(false), void upload(e.dataTransfer.files))}
      className={cx("flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-sm transition-colors", drag ? "border-accent bg-accent-soft text-fg" : "border-line-strong text-muted hover:border-accent/60 hover:text-fg-2")}
    >
      {busy ? <Spinner label="Uploading" /> : <><Upload className="size-5" aria-hidden />{label}</>}
      <input ref={input} type="file" multiple accept={accept} className="hidden" onChange={(e) => void upload(e.target.files)} />
    </button>
  );
}
