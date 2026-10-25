import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cx } from "./primitives";

/** Renders Markdown safely (react-markdown does not render raw HTML). */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cx("prose-atlas", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ node: _n, ...p }) => <a {...p} target="_blank" rel="noreferrer noopener" /> }}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
