import type { Task, TaskPriority, TaskStatus, TaskType } from "@/lib/types";

export const TASK_STATUS_VALUES = ["todo", "in_progress", "done"] as const;

export const UNCATEGORIZED_TASK_LABEL = "Sem categoria";

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && TASK_STATUS_VALUES.includes(value as TaskStatus);
}

export function coerceTaskStatus(value: unknown, isDone = false): TaskStatus {
  if (isTaskStatus(value)) return value;
  return isDone ? "done" : "todo";
}

export function getTaskStatus(task: Pick<Task, "status" | "is_done">) {
  return coerceTaskStatus(task.status, Boolean(task.is_done));
}

export function isTaskDone(task: Pick<Task, "status" | "is_done">) {
  return getTaskStatus(task) === "done";
}

export function taskStatusLabel(value: TaskStatus | Pick<Task, "status" | "is_done">) {
  const status = typeof value === "string" ? value : getTaskStatus(value);

  if (status === "in_progress") return "Em andamento";
  if (status === "done") return "Concluida";
  return "A fazer";
}

export function taskStatusDescription(status: TaskStatus) {
  if (status === "in_progress") return "Ja foi iniciada e precisa de continuidade.";
  if (status === "done") return "Concluida e fora da fila principal.";
  return "Ainda nao foi iniciada.";
}

export function formatTaskDateBR(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}

export function formatTaskDateTimeBR(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function priorityLabel(priority: TaskPriority) {
  if (priority === "high") return "Alta";
  if (priority === "low") return "Baixa";
  return "Media";
}

export function typeLabel(type: TaskType) {
  if (type === "due") return "Prazo";
  if (type === "scheduled") return "Agendada";
  return "Flexivel";
}

export function normalizeTaskCategory(category: string | null | undefined) {
  const trimmed = category?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function taskCategoryLabel(category: string | null | undefined) {
  return normalizeTaskCategory(category) ?? UNCATEGORIZED_TASK_LABEL;
}

export function isTaskOverdue(task: Task, now: Date = new Date()) {
  if (isTaskDone(task)) return false;

  if (task.task_type === "due" && task.due_date) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(`${task.due_date}T00:00:00`);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }

  if (task.task_type === "scheduled" && task.scheduled_at) {
    return new Date(task.scheduled_at) < now;
  }

  return false;
}

export function isTaskForDay(task: Task, day: Date) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);

  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  if (task.task_type === "scheduled" && task.scheduled_at) {
    const when = new Date(task.scheduled_at);
    return when >= start && when <= end;
  }

  if (task.task_type === "due" && task.due_date) {
    const due = new Date(`${task.due_date}T00:00:00`);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === start.getTime();
  }

  return false;
}

function priorityWeight(priority: TaskPriority) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function statusWeight(task: Task) {
  const status = getTaskStatus(task);
  if (status === "in_progress") return 0;
  if (status === "todo") return 1;
  return 2;
}

function taskReferenceTime(task: Task) {
  if (task.task_type === "scheduled" && task.scheduled_at) return new Date(task.scheduled_at).getTime();
  if (task.task_type === "due" && task.due_date) return new Date(`${task.due_date}T12:00:00`).getTime();
  return Number.MAX_SAFE_INTEGER;
}

export function compareTasksByUrgency(a: Task, b: Task) {
  const aDone = isTaskDone(a);
  const bDone = isTaskDone(b);
  if (aDone !== bDone) return aDone ? 1 : -1;

  if (aDone && bDone) {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  }

  const aOverdue = isTaskOverdue(a);
  const bOverdue = isTaskOverdue(b);
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

  const statusDiff = statusWeight(a) - statusWeight(b);
  if (statusDiff !== 0) return statusDiff;

  const priorityDiff = priorityWeight(a.priority) - priorityWeight(b.priority);
  if (priorityDiff !== 0) return priorityDiff;

  const timeDiff = taskReferenceTime(a) - taskReferenceTime(b);
  if (timeDiff !== 0) return timeDiff;

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function taskWhenLabel(task: Task) {
  if (task.task_type === "due" && task.due_date) {
    return `Prazo: ${formatTaskDateBR(task.due_date)}`;
  }

  if (task.task_type === "scheduled" && task.scheduled_at) {
    return `Agendada: ${formatTaskDateTimeBR(task.scheduled_at)}`;
  }

  return "Sem data definida";
}
