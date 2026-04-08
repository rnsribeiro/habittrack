import type { Task, TaskPriority, TaskStatus, TaskType } from "@/lib/types";
import type { AppLocale } from "@/lib/locale";
import { intlLocale } from "@/lib/locale";

export const TASK_STATUS_VALUES = ["todo", "in_progress", "done"] as const;

export const UNCATEGORIZED_TASK_LABEL = "Sem categoria";
export const UNCATEGORIZED_TASK_LABEL_EN = "Uncategorized";

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

export function taskStatusLabel(
  value: TaskStatus | Pick<Task, "status" | "is_done">,
  locale: AppLocale = "pt"
) {
  const status = typeof value === "string" ? value : getTaskStatus(value);

  if (status === "in_progress") return locale === "en" ? "In progress" : "Em andamento";
  if (status === "done") return locale === "en" ? "Done" : "Concluida";
  return locale === "en" ? "To do" : "A fazer";
}

export function taskStatusDescription(status: TaskStatus, locale: AppLocale = "pt") {
  if (status === "in_progress") {
    return locale === "en"
      ? "Already started and still needs follow-through."
      : "Ja foi iniciada e precisa de continuidade.";
  }

  if (status === "done") {
    return locale === "en" ? "Completed and out of the main queue." : "Concluida e fora da fila principal.";
  }

  return locale === "en" ? "It has not been started yet." : "Ainda nao foi iniciada.";
}

export function formatTaskDateBR(isoDate: string, locale: AppLocale = "pt") {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale)).format(new Date(year, month - 1, day));
}

export function formatTaskDateTimeBR(iso: string, locale: AppLocale = "pt") {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function priorityLabel(priority: TaskPriority, locale: AppLocale = "pt") {
  if (priority === "high") return locale === "en" ? "High" : "Alta";
  if (priority === "low") return locale === "en" ? "Low" : "Baixa";
  return locale === "en" ? "Medium" : "Media";
}

export function typeLabel(type: TaskType, locale: AppLocale = "pt") {
  if (type === "due") return locale === "en" ? "Deadline" : "Prazo";
  if (type === "scheduled") return locale === "en" ? "Scheduled" : "Agendada";
  return locale === "en" ? "Flexible" : "Flexivel";
}

export function normalizeTaskCategory(category: string | null | undefined) {
  const trimmed = category?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function taskCategoryLabel(category: string | null | undefined, locale: AppLocale = "pt") {
  return normalizeTaskCategory(category) ?? (locale === "en" ? UNCATEGORIZED_TASK_LABEL_EN : UNCATEGORIZED_TASK_LABEL);
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

export function taskWhenLabel(task: Task, locale: AppLocale = "pt") {
  if (task.task_type === "due" && task.due_date) {
    return locale === "en"
      ? `Due: ${formatTaskDateBR(task.due_date, locale)}`
      : `Prazo: ${formatTaskDateBR(task.due_date, locale)}`;
  }

  if (task.task_type === "scheduled" && task.scheduled_at) {
    return locale === "en"
      ? `Scheduled: ${formatTaskDateTimeBR(task.scheduled_at, locale)}`
      : `Agendada: ${formatTaskDateTimeBR(task.scheduled_at, locale)}`;
  }

  return locale === "en" ? "No date set" : "Sem data definida";
}
