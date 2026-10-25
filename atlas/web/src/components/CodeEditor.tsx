import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror, { EditorView, keymap } from "@uiw/react-codemirror";
import { useMemo } from "react";

function langFor(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["js", "mjs", "cjs", "jsx"].includes(ext)) return [javascript({ jsx: true })];
  if (["ts", "tsx"].includes(ext)) return [javascript({ jsx: true, typescript: true })];
  if (["html", "htm", "liquid", "svg", "xml", "vue"].includes(ext)) return [html()];
  if (["css", "scss"].includes(ext)) return [css()];
  if (ext === "json") return [json()];
  if (["md", "markdown", "mdx"].includes(ext)) return [markdown()];
  if (ext === "py") return [python()];
  return [];
}

const theme = EditorView.theme({
  "&": { backgroundColor: "var(--color-bg)", fontSize: "13px", height: "100%" },
  ".cm-gutters": { backgroundColor: "var(--color-surface)", borderRight: "1px solid var(--color-line)" },
  ".cm-scroller": { fontFamily: "var(--font-mono)" },
});

export default function CodeEditor({ path, value, onChange, onSave, readOnly, height = "100%" }: { path: string; value: string; onChange?: (v: string) => void; onSave?: () => void; readOnly?: boolean; height?: string }) {
  const extensions = useMemo(
    () => [
      ...langFor(path),
      theme,
      EditorView.lineWrapping,
      keymap.of([{ key: "Mod-s", preventDefault: true, run: () => (onSave?.(), true) }]),
    ],
    [path, onSave],
  );
  return <CodeMirror value={value} height={height} theme={oneDark} extensions={extensions} onChange={onChange} readOnly={readOnly} basicSetup={{ highlightActiveLine: !readOnly, foldGutter: true }} className="h-full" />;
}
