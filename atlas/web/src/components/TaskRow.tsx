import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { del, patch } from "../lib/api";
import { today } from "../lib/format";
import { PROJECT_COLORS } from "../lib/modules";
import { useAction, useConfirm } from "./ui/overlay";
import { Badge, Button, cx } from "./ui/primitives";

export function TaskRow({ t, onEdit, showProject = true }: { t: any; onEdit?: (t: any) => void; showProject?: boolean }) {
  const qc = useQueryClient();
  const act = useAction();
  const confirm = useConfirm();
  const done = t.status === "done";
  const overdue = !done && t.due_date && t.due_date < today();
  const toggle = () => act(async () => (await patch(`/api/tasks/${t.id}`, { status: done ? "todo" : "done" }), qc.invalidateQueries()));
  const remove = async () => {
    if (await confirm({ title: "Delete task?", body: <>“{t.title}” will be removed permanently.</>, confirmLabel: "Delete", danger: true })) act(async () => (await del(`/api/tasks/${t.id}`), qc.invalidateQueries()), "Task deleted");
  };
  return (
    <li className="group flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-hover/60">
      <button onClick={toggle} aria-label={done ? `Mark “${t.title}” not done` : `Mark “${t.title}” done`} className={cx("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors", done ? "border-ok bg-ok/20 text-ok" : "border-line-strong hover:border-accent")}>
        {done && <Check className="size-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cx("text-sm", done && "text-muted line-through")}>{t.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {t.status === "doing" && <Badge tone="accent">In progress</Badge>}
          {t.priority === "high" && !done && <Badge tone="danger">High</Badge>}
          {t.due_date && (
            <span className={cx("inline-flex items-center gap-1", overdue && "text-danger")}>
              <CalendarClock className="size-3" aria-hidden />
              {overdue ? "Overdue · " : ""}
              {t.due_date}
            </span>
          )}
          {showProject && t.project_name && (
            <Link to={`/projects/${t.project_id}`} className="inline-flex items-center gap-1 hover:text-fg">
              <span className="size-2 rounded-full" style={{ background: PROJECT_COLORS[t.project_color] ?? PROJECT_COLORS.cyan }} aria-hidden />
              {t.project_name}
            </Link>
          )}
        </div>
      </div>
      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {onEdit && <Button variant="ghost" size="icon-sm" icon={Pencil} aria-label={`Edit “${t.title}”`} onClick={() => onEdit(t)} />}
        <Button variant="ghost" size="icon-sm" icon={Trash2} aria-label={`Delete “${t.title}”`} onClick={remove} />
      </div>
    </li>
  );
}
