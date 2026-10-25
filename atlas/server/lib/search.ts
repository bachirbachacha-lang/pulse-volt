import type { DB } from "../db/index.js";

export interface SearchHit {
  type: "project" | "task" | "note" | "conversation" | "experiment" | "board" | "dataset";
  id: number;
  title: string;
  snippet: string;
  href: string;
}

/** Turns free text into a safe FTS5 prefix query ("foo"* "bar"*). */
export function ftsQuery(q: string) {
  const terms = q
    .split(/\s+/)
    .map((t) => t.replace(/["*^():]/g, ""))
    .filter(Boolean)
    .slice(0, 8);
  return terms.map((t) => `"${t}"*`).join(" ");
}

const like = (q: string) => `%${q.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
const clip = (s: unknown, n = 140) => {
  const str = String(s ?? "").replace(/\s+/g, " ").trim();
  return str.length > n ? str.slice(0, n) + "…" : str;
};

export function searchAll(db: DB, q: string, limitPerType = 6): SearchHit[] {
  const query = q.trim();
  if (!query) return [];
  const l = like(query);
  const hits: SearchHit[] = [];

  for (const r of db
    .prepare("SELECT id, name, description FROM projects WHERE name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT ?")
    .all(l, l, limitPerType) as any[])
    hits.push({ type: "project", id: r.id, title: r.name, snippet: clip(r.description), href: `/projects/${r.id}` });

  for (const r of db
    .prepare(
      "SELECT t.id, t.title, t.notes, t.status, t.project_id, p.name AS project FROM tasks t LEFT JOIN projects p ON p.id = t.project_id WHERE t.title LIKE ? ESCAPE '\\' OR t.notes LIKE ? ESCAPE '\\' ORDER BY t.updated_at DESC LIMIT ?",
    )
    .all(l, l, limitPerType) as any[])
    hits.push({
      type: "task",
      id: r.id,
      title: r.title,
      snippet: `${r.status}${r.project ? " · " + r.project : ""}${r.notes ? " · " + clip(r.notes, 80) : ""}`,
      href: r.project_id ? `/projects/${r.project_id}?task=${r.id}` : `/projects?task=${r.id}`,
    });

  const fq = ftsQuery(query);
  if (fq) {
    for (const r of db
      .prepare(
        "SELECT n.id, n.title, n.kind, snippet(notes_fts, 1, '', '', '…', 16) AS snip FROM notes_fts JOIN notes n ON n.id = notes_fts.rowid WHERE notes_fts MATCH ? ORDER BY rank LIMIT ?",
      )
      .all(fq, limitPerType) as any[])
      hits.push({
        type: "note",
        id: r.id,
        title: r.title,
        snippet: clip(r.snip),
        href: r.kind === "note" ? `/vault?note=${r.id}` : `/engineering?doc=${r.id}`,
      });
  }

  for (const r of db
    .prepare(
      `SELECT c.id, c.title, (SELECT content FROM messages m WHERE m.conversation_id = c.id AND m.content LIKE ? ESCAPE '\\' LIMIT 1) AS hit
       FROM conversations c WHERE c.title LIKE ? ESCAPE '\\' OR EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content LIKE ? ESCAPE '\\')
       ORDER BY c.updated_at DESC LIMIT ?`,
    )
    .all(l, l, l, limitPerType) as any[])
    hits.push({ type: "conversation", id: r.id, title: r.title, snippet: clip(r.hit), href: `/assistant/${r.id}` });

  for (const r of db
    .prepare("SELECT id, title, hypothesis FROM experiments WHERE title LIKE ? ESCAPE '\\' OR hypothesis LIKE ? ESCAPE '\\' OR result LIKE ? ESCAPE '\\' LIMIT ?")
    .all(l, l, l, limitPerType) as any[])
    hits.push({ type: "experiment", id: r.id, title: r.title, snippet: clip(r.hypothesis), href: `/engineering?tab=experiments&exp=${r.id}` });

  for (const r of db.prepare("SELECT id, name, description FROM boards WHERE name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' LIMIT ?").all(l, l, limitPerType) as any[])
    hits.push({ type: "board", id: r.id, title: r.name, snippet: clip(r.description), href: `/design?board=${r.id}` });

  for (const r of db.prepare("SELECT id, symbol, name FROM datasets WHERE symbol LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' LIMIT ?").all(l, l, limitPerType) as any[])
    hits.push({ type: "dataset", id: r.id, title: `${r.symbol} · ${r.name}`, snippet: "Price data", href: `/trading?dataset=${r.id}` });

  return hits;
}
