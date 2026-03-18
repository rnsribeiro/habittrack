"use client";

import type { TaskStatus } from "@/lib/types";
import { taskStatusDescription, taskStatusLabel } from "@/lib/tasks";

const STATUS_STYLES: Record<
  TaskStatus,
  {
    active: string;
    dot: string;
  }
> = {
  todo: {
    active: "border-amber-300 bg-amber-50 text-amber-700 shadow-[0_14px_28px_rgba(245,158,11,0.12)]",
    dot: "bg-amber-500",
  },
  in_progress: {
    active: "border-sky-300 bg-sky-50 text-sky-700 shadow-[0_14px_28px_rgba(14,165,233,0.12)]",
    dot: "bg-sky-500",
  },
  done: {
    active: "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-[0_14px_28px_rgba(34,197,94,0.12)]",
    dot: "bg-emerald-500",
  },
};

type TaskStatusControlProps = {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
  showDescription?: boolean;
  className?: string;
};

export function TaskStatusControl({
  value,
  onChange,
  disabled = false,
  showDescription = false,
  className = "",
}: TaskStatusControlProps) {
  const layoutClassName = showDescription ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-3";

  return (
    <div className={`grid gap-2 ${layoutClassName} ${className}`.trim()}>
      {(["todo", "in_progress", "done"] as TaskStatus[]).map((status) => {
        const active = value === status;
        const styles = STATUS_STYLES[status];

        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => onChange(status)}
            className={`rounded-[18px] border px-3 py-3 text-left transition ${
              active
                ? styles.active
                : "border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 hover:bg-white"
            } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${active ? styles.dot : "bg-slate-300"}`} />
              <span className="text-sm font-semibold">{taskStatusLabel(status)}</span>
            </div>

            {showDescription ? (
              <p className={`mt-2 text-xs leading-5 ${active ? "text-current/90" : "text-slate-500"}`}>
                {taskStatusDescription(status)}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
