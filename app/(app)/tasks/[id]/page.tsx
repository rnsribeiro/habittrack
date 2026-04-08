"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TaskStatusControl } from "@/components/tasks/TaskStatusControl";
import { getErrorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { intlLocale } from "@/lib/locale";
import {
  formatTaskDateBR,
  formatTaskDateTimeBR,
  getTaskStatus,
  isTaskOverdue,
  priorityLabel,
  taskCategoryLabel,
  taskStatusDescription,
  taskStatusLabel,
  taskWhenLabel,
  typeLabel,
} from "@/lib/tasks";
import type { Task, TaskPriority, TaskStatus, TaskType } from "@/lib/types";
import { apiFetch } from "@/src/lib/api";
import { useRequireSession } from "@/src/lib/useRequireSession";

function toDatetimeLocalValue(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function statusBadgeClasses(value: TaskStatus | Task) {
  const status = typeof value === "string" ? value : getTaskStatus(value);

  if (status === "done") return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
  if (status === "in_progress") return "border-sky-300/20 bg-sky-400/10 text-sky-100";
  return "border-amber-300/20 bg-amber-400/10 text-amber-100";
}

export default function TaskDetailsPage() {
  const { ready } = useRequireSession("/login");
  const { locale } = useI18n();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const taskId = params?.id;

  const copy =
    locale === "en"
      ? {
          loading: "Loading...",
          loadingTask: "Loading task...",
          notFound: "Task not found.",
          back: "Back",
          backToTasks: "Back to tasks",
          kicker: "Task details",
          summaryFallback: "Use this screen to edit data, category, schedule, and follow the task state.",
          overdue: "Overdue",
          priority: "Priority",
          save: "Save changes",
          saving: "Saving...",
          delete: "Delete task",
          taskStatus: "Task status",
          taskStatusHint: 'Use "In progress" when you have started but not finished yet.',
          title: "Title",
          titlePlaceholder: "Task title",
          category: "Category",
          categoryPlaceholder: "Example: Work, Home, Study",
          priorityLabel: "Priority",
          notes: "Notes",
          notesPlaceholder: "Describe context, details, or next steps.",
          type: "Type",
          dueDate: "Due date",
          dateTime: "Date and time",
          summary: "Summary",
          currentCategory: "Current category",
          schedule: "Schedule",
          status: "Status",
          urgency: "Urgency",
          onTime: "On schedule",
          history: "History",
          createdAt: "Created on",
          updatedAt: "Updated on",
          formattedDueDate: "Formatted due date",
          scheduledDate: "Scheduled date",
          confirmDelete: "Are you sure you want to delete this task?",
          errors: {
            load: "Could not load task.",
            title: "Please enter a title.",
            dueDate: "Please enter the due date.",
            scheduledAt: "Please enter the scheduled date.",
            save: "Could not save task.",
            delete: "Could not delete task.",
          },
        }
      : {
          loading: "Carregando...",
          loadingTask: "Carregando tarefa...",
          notFound: "Tarefa nao encontrada.",
          back: "Voltar",
          backToTasks: "Voltar para tarefas",
          kicker: "Detalhes da tarefa",
          summaryFallback: "Use esta tela para editar dados, categoria, prazo e acompanhar o estado da tarefa.",
          overdue: "Vencida",
          priority: "Prioridade",
          save: "Salvar alteracoes",
          saving: "Salvando...",
          delete: "Excluir tarefa",
          taskStatus: "Status da tarefa",
          taskStatusHint: 'Use "Em andamento" quando voce ja iniciou, mas ainda nao concluiu.',
          title: "Titulo",
          titlePlaceholder: "Titulo da tarefa",
          category: "Categoria",
          categoryPlaceholder: "Ex: Trabalho, Casa, Estudos",
          priorityLabel: "Prioridade",
          notes: "Notas",
          notesPlaceholder: "Descreva contexto, detalhes ou proximos passos.",
          type: "Tipo",
          dueDate: "Data limite",
          dateTime: "Data e hora",
          summary: "Resumo",
          currentCategory: "Categoria atual",
          schedule: "Agendamento",
          status: "Status",
          urgency: "Urgencia",
          onTime: "Dentro do prazo",
          history: "Historico",
          createdAt: "Criada em",
          updatedAt: "Atualizada em",
          formattedDueDate: "Prazo formatado",
          scheduledDate: "Data agendada",
          confirmDelete: "Tem certeza que deseja excluir esta tarefa?",
          errors: {
            load: "Erro ao carregar tarefa.",
            title: "Informe um titulo.",
            dueDate: "Informe a data limite.",
            scheduledAt: "Informe a data especifica.",
            save: "Erro ao salvar tarefa.",
            delete: "Erro ao excluir tarefa.",
          },
        };

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("due");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");

  useEffect(() => {
    if (!ready || !taskId) return;

    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const response = await apiFetch(`/api/tasks/${taskId}`);
        const loadedTask = response.task as Task;

        setTask(loadedTask);
        setTitle(loadedTask.title ?? "");
        setNotes(loadedTask.notes ?? "");
        setCategory(loadedTask.category ?? "");
        setTaskType(loadedTask.task_type);
        setPriority(loadedTask.priority);
        setDueDate(loadedTask.due_date ?? "");
        setScheduledAt(loadedTask.scheduled_at ? toDatetimeLocalValue(loadedTask.scheduled_at) : "");
        setStatus(getTaskStatus(loadedTask));
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error, copy.errors.load));
      } finally {
        setLoading(false);
      }
    })();
  }, [copy.errors.load, ready, taskId]);

  const overdue = useMemo(() => (task ? isTaskOverdue(task) : false), [task]);
  const currentStatus = status;
  const taskSummary = useMemo(() => (task ? taskWhenLabel(task, locale) : ""), [locale, task]);

  async function save() {
    if (!taskId) return;

    setErrorMsg(null);
    if (!title.trim()) {
      setErrorMsg(copy.errors.title);
      return;
    }

    const payload: Record<string, unknown> = {
      title: title.trim(),
      notes: notes.trim() ? notes.trim() : null,
      category: category.trim() ? category.trim() : null,
      task_type: taskType,
      priority,
      status,
    };

    if (taskType === "due") {
      if (!dueDate) {
        setErrorMsg(copy.errors.dueDate);
        return;
      }
      payload.due_date = dueDate;
      payload.scheduled_at = null;
    }

    if (taskType === "scheduled") {
      if (!scheduledAt) {
        setErrorMsg(copy.errors.scheduledAt);
        return;
      }
      payload.scheduled_at = new Date(scheduledAt).toISOString();
      payload.due_date = null;
    }

    if (taskType === "anytime") {
      payload.due_date = null;
      payload.scheduled_at = null;
    }

    setSaving(true);
    try {
      const response = await apiFetch(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(payload) });
      const updatedTask = response.task as Task;
      setTask(updatedTask);
      setTitle(updatedTask.title ?? "");
      setNotes(updatedTask.notes ?? "");
      setCategory(updatedTask.category ?? "");
      setTaskType(updatedTask.task_type);
      setPriority(updatedTask.priority);
      setDueDate(updatedTask.due_date ?? "");
      setScheduledAt(updatedTask.scheduled_at ? toDatetimeLocalValue(updatedTask.scheduled_at) : "");
      setStatus(getTaskStatus(updatedTask));
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, copy.errors.save));
    } finally {
      setSaving(false);
    }
  }

  async function removeTask() {
    if (!taskId || !confirm(copy.confirmDelete)) return;

    setSaving(true);
    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      router.replace("/tasks");
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, copy.errors.delete));
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <div className="p-6 text-sm text-slate-300">{copy.loading}</div>;
  if (loading) return <div className="p-6 text-sm text-slate-300">{copy.loadingTask}</div>;

  if (!task) {
    return (
      <div className="app-page">
        <div className="app-surface p-6">
          <p className="text-sm text-slate-600">{copy.notFound}</p>
          <button className="app-btn app-btn-secondary mt-4" onClick={() => router.push("/tasks")}>
            {copy.backToTasks}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page pb-4">
      <section className="app-surface-dark overflow-hidden p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <button className="app-btn app-btn-secondary" onClick={() => router.push("/tasks")}>
              &larr; {copy.back}
            </button>

            <div className="mt-5">
              <span className="app-kicker">{copy.kicker}</span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{task.title}</h1>
              <p className="app-subtle-dark mt-3 max-w-2xl text-sm leading-6 sm:text-base">{task.notes?.trim() || copy.summaryFallback}</p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${statusBadgeClasses(currentStatus)}`}>
                {taskStatusLabel(currentStatus, locale)}
              </span>
              {overdue ? (
                <span className="rounded-full border border-red-300/20 bg-red-400/10 px-3 py-1 text-sm font-semibold text-red-100">
                  {copy.overdue}
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm font-semibold text-white">
                {typeLabel(task.task_type, locale)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm font-semibold text-white">
                {copy.priority} {priorityLabel(task.priority, locale).toLowerCase()}
              </span>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-100">
                {taskCategoryLabel(task.category, locale)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[20rem] xl:grid-cols-1">
            <button onClick={save} disabled={saving} className="app-btn app-btn-primary w-full">
              {saving ? copy.saving : copy.save}
            </button>
            <button onClick={removeTask} disabled={saving} className="app-btn app-btn-danger w-full">
              {copy.delete}
            </button>
          </div>
        </div>
      </section>

      {errorMsg ? <div className="rounded-[22px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700">{errorMsg}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="app-surface p-5 sm:p-6">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
            <div className="text-sm font-semibold text-slate-900">{copy.taskStatus}</div>
            <p className="mt-1 text-sm text-slate-500">{copy.taskStatusHint}</p>
            <TaskStatusControl value={status} onChange={setStatus} showDescription className="mt-4" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.title}</label>
              <input className="app-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={copy.titlePlaceholder} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.category}</label>
              <input className="app-input" value={category} onChange={(event) => setCategory(event.target.value)} placeholder={copy.categoryPlaceholder} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.priorityLabel}</label>
              <select className="app-select" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
                <option value="low">{priorityLabel("low", locale)}</option>
                <option value="medium">{priorityLabel("medium", locale)}</option>
                <option value="high">{priorityLabel("high", locale)}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.notes}</label>
              <textarea className="app-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={copy.notesPlaceholder} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.type}</label>
              <select className="app-select" value={taskType} onChange={(event) => setTaskType(event.target.value as TaskType)}>
                <option value="due">{locale === "en" ? "With deadline" : "Com prazo"}</option>
                <option value="scheduled">{locale === "en" ? "Scheduled" : "Agendada"}</option>
                <option value="anytime">{locale === "en" ? "Flexible" : "Flexivel"}</option>
              </select>
            </div>

            {taskType === "due" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.dueDate}</label>
                <input type="date" className="app-input" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
            ) : null}

            {taskType === "scheduled" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.dateTime}</label>
                <input type="datetime-local" className="app-input" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="app-surface p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">{copy.summary}</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm text-slate-500">{copy.currentCategory}</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{taskCategoryLabel(task.category, locale)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">{copy.schedule}</div>
                <div className={`mt-1 text-base font-semibold ${overdue ? "text-red-700" : "text-slate-900"}`}>{taskSummary}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">{copy.status}</div>
                <div className="mt-1 text-base font-semibold text-slate-900">{taskStatusLabel(currentStatus, locale)}</div>
                <div className="mt-1 text-sm text-slate-500">{taskStatusDescription(currentStatus, locale)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">{copy.urgency}</div>
                <div className={`mt-1 text-base font-semibold ${overdue ? "text-red-700" : "text-slate-900"}`}>{overdue ? copy.overdue : copy.onTime}</div>
              </div>
            </div>
          </section>

          <section className="app-surface p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">{copy.history}</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                {copy.createdAt} <span className="font-semibold text-slate-900">{new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "short", timeStyle: "short" }).format(new Date(task.created_at))}</span>
              </div>
              <div>
                {copy.updatedAt} <span className="font-semibold text-slate-900">{new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "short", timeStyle: "short" }).format(new Date(task.updated_at))}</span>
              </div>
              {task.task_type === "due" && task.due_date ? (
                <div>
                  {copy.formattedDueDate}: <span className="font-semibold text-slate-900">{formatTaskDateBR(task.due_date, locale)}</span>
                </div>
              ) : null}
              {task.task_type === "scheduled" && task.scheduled_at ? (
                <div>
                  {copy.scheduledDate}: <span className="font-semibold text-slate-900">{formatTaskDateTimeBR(task.scheduled_at, locale)}</span>
                </div>
              ) : null}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
