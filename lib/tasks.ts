import type { Task, TaskPriority, TaskType } from "@/lib/types";

export const UNCATEGORIZED_TASK_LABEL = "Sem categoria";

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
  if (task.is_done) return false;

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

function taskReferenceTime(task: Task) {
  if (task.task_type === "scheduled" && task.scheduled_at) return new Date(task.scheduled_at).getTime();
  if (task.task_type === "due" && task.due_date) return new Date(`${task.due_date}T12:00:00`).getTime();
  return Number.MAX_SAFE_INTEGER;
}

export function compareTasksByUrgency(a: Task, b: Task) {
  const aOverdue = isTaskOverdue(a);
  const bOverdue = isTaskOverdue(b);
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

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

