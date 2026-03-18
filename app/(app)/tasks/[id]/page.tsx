"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { apiFetch } from "@/src/lib/api";
import type { Task, TaskPriority, TaskType } from "@/lib/types";
import {
  formatTaskDateBR,
  formatTaskDateTimeBR,
  isTaskOverdue,
  priorityLabel,
  taskCategoryLabel,
  taskWhenLabel,
  typeLabel,
} from "@/lib/tasks";

function toDatetimeLocalValue(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function taskStatusLabel(task: Task) {
  if (task.is_done) return "Concluida";
  if (isTaskOverdue(task)) return "Vencida";
  return "Em andamento";
}

export default function TaskDetailsPage() {
  const { ready } = useRequireSession("/login");
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const taskId = params?.id;

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
  const [isDone, setIsDone] = useState(false);

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
        setIsDone(Boolean(loadedTask.is_done));
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error, "Erro ao carregar tarefa."));
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, taskId]);

  const overdue = useMemo(() => (task ? isTaskOverdue(task) : false), [task]);
  const taskSummary = useMemo(() => (task ? taskWhenLabel(task) : ""), [task]);

  async function save() {
    if (!taskId) return;

    setErrorMsg(null);
    if (!title.trim()) {
      setErrorMsg("Informe um titulo.");
      return;
    }

    const payload: Record<string, unknown> = {
      title: title.trim(),
      notes: notes.trim() ? notes.trim() : null,
      category: category.trim() ? category.trim() : null,
      task_type: taskType,
      priority,
      is_done: isDone,
    };

    if (taskType === "due") {
      if (!dueDate) {
        setErrorMsg("Informe a data limite.");
        return;
      }
      payload.due_date = dueDate;
      payload.scheduled_at = null;
    }

    if (taskType === "scheduled") {
      if (!scheduledAt) {
        setErrorMsg("Informe a data especifica.");
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
      const response = await apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const updatedTask = response.task as Task;
      setTask(updatedTask);
      setTitle(updatedTask.title ?? "");
      setNotes(updatedTask.notes ?? "");
      setCategory(updatedTask.category ?? "");
      setTaskType(updatedTask.task_type);
      setPriority(updatedTask.priority);
      setDueDate(updatedTask.due_date ?? "");
      setScheduledAt(updatedTask.scheduled_at ? toDatetimeLocalValue(updatedTask.scheduled_at) : "");
      setIsDone(Boolean(updatedTask.is_done));
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, "Erro ao salvar tarefa."));
    } finally {
      setSaving(false);
    }
  }

  async function removeTask() {
    if (!taskId) return;

    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

    setSaving(true);
    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      router.replace("/tasks");
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, "Erro ao excluir tarefa."));
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <div className="p-6 text-sm text-slate-300">Carregando...</div>;
  if (loading) return <div className="p-6 text-sm text-slate-300">Carregando tarefa...</div>;

  if (!task) {
    return (
      <div className="app-page">
        <div className="app-surface p-6">
          <p className="text-sm text-slate-600">Tarefa nao encontrada.</p>
          <button className="app-btn app-btn-secondary mt-4" onClick={() => router.push("/tasks")}>
            Voltar para tarefas
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
              &larr; Voltar
            </button>

            <div className="mt-5">
              <span className="app-kicker">Detalhes da tarefa</span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{task.title}</h1>
              <p className="app-subtle-dark mt-3 max-w-2xl text-sm leading-6 sm:text-base">
                {task.notes?.trim() || "Use esta tela para editar dados, categoria, prazo e acompanhar o estado da tarefa."}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm font-semibold text-white">
                {taskStatusLabel(task)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm font-semibold text-white">
                {typeLabel(task.task_type)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm font-semibold text-white">
                Prioridade {priorityLabel(task.priority).toLowerCase()}
              </span>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-100">
                {taskCategoryLabel(task.category)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[20rem] xl:grid-cols-1">
            <button onClick={save} disabled={saving} className="app-btn app-btn-primary">
              {saving ? "Salvando..." : "Salvar alteracoes"}
            </button>

            <button onClick={removeTask} disabled={saving} className="app-btn app-btn-danger">
              Excluir tarefa
            </button>
          </div>
        </div>
      </section>

      {errorMsg ? (
        <div className="rounded-[22px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="app-surface p-6">
          <div className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/90 px-4 py-3">
            <input type="checkbox" checked={isDone} onChange={(event) => setIsDone(event.target.checked)} className="h-4 w-4" />
            <div>
              <div className="text-sm font-semibold text-slate-900">Marcar como concluida</div>
              <div className="text-sm text-slate-500">Ao concluir, a tarefa deixa de ser tratada como urgente.</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Titulo</label>
              <input className="app-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titulo da tarefa" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Categoria</label>
              <input
                className="app-input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Ex: Trabalho, Casa, Estudos"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Prioridade</label>
              <select className="app-select" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
                <option value="low">Baixa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Notas</label>
              <textarea
                className="app-textarea"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Descreva contexto, detalhes ou proximos passos."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Tipo</label>
              <select className="app-select" value={taskType} onChange={(event) => setTaskType(event.target.value as TaskType)}>
                <option value="due">Com prazo</option>
                <option value="scheduled">Agendada</option>
                <option value="anytime">Flexivel</option>
              </select>
            </div>

            {taskType === "due" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Data limite</label>
                <input type="date" className="app-input" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
            ) : null}

            {taskType === "scheduled" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Data e hora</label>
                <input
                  type="datetime-local"
                  className="app-input"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                />
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="app-surface p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Resumo</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm text-slate-500">Categoria atual</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{taskCategoryLabel(task.category)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Agendamento</div>
                <div className={`mt-1 text-base font-semibold ${overdue ? "text-red-700" : "text-slate-900"}`}>{taskSummary}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Status</div>
                <div className={`mt-1 text-base font-semibold ${overdue ? "text-red-700" : "text-slate-900"}`}>{taskStatusLabel(task)}</div>
              </div>
            </div>
          </section>

          <section className="app-surface p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Historico</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                Criada em{" "}
                <span className="font-semibold text-slate-900">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(task.created_at))}
                </span>
              </div>

              <div>
                Atualizada em{" "}
                <span className="font-semibold text-slate-900">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(task.updated_at))}
                </span>
              </div>

              {task.task_type === "due" && task.due_date ? (
                <div>
                  Prazo formatado: <span className="font-semibold text-slate-900">{formatTaskDateBR(task.due_date)}</span>
                </div>
              ) : null}

              {task.task_type === "scheduled" && task.scheduled_at ? (
                <div>
                  Data agendada: <span className="font-semibold text-slate-900">{formatTaskDateTimeBR(task.scheduled_at)}</span>
                </div>
              ) : null}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
