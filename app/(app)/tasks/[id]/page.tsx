"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { apiFetch } from "@/src/lib/api";
import type { Task, TaskPriority, TaskType } from "@/lib/types";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDateBR(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(y, m - 1, d));
}

function formatDateTimeBR(iso: string) {
  const dt = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(dt);
}

function toDatetimeLocalValue(iso: string) {
  // ISO -> "YYYY-MM-DDTHH:mm" no fuso local
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function typeLabel(t: TaskType) {
  if (t === "due") return "limite";
  if (t === "scheduled") return "agendada";
  return "indefinida";
}

function priorityLabel(p: TaskPriority) {
  if (p === "high") return "alta";
  if (p === "low") return "baixa";
  return "média";
}

function isOverdue(t: Task) {
  if (t.is_done) return false;

  if (t.task_type === "due" && t.due_date) {
    const today = startOfDay(new Date());
    const due = startOfDay(new Date(t.due_date + "T00:00:00"));
    return due < today;
  }

  if (t.task_type === "scheduled" && t.scheduled_at) {
    const when = new Date(t.scheduled_at);
    return when < new Date();
  }

  return false;
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

  // form
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("due");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD
  const [scheduledAt, setScheduledAt] = useState(""); // datetime-local
  const [isDone, setIsDone] = useState(false);

  async function load() {
    const { task } = await apiFetch(`/api/tasks/${taskId}`);
    setTask(task);

    setTitle(task.title ?? "");
    setNotes(task.notes ?? "");
    setTaskType(task.task_type);
    setPriority((task.priority ?? "medium") as TaskPriority);
    setDueDate(task.due_date ?? "");
    setScheduledAt(task.scheduled_at ? toDatetimeLocalValue(task.scheduled_at) : "");
    setIsDone(!!task.is_done);
  }

  useEffect(() => {
    if (!ready) return;
    if (!taskId) return;

    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        await load();
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Erro ao carregar tarefa.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, taskId]);

  const overdue = useMemo(() => (task ? isOverdue(task) : false), [task]);

  const infoLabel = useMemo(() => {
    if (!task) return "";
    if (task.task_type === "due" && task.due_date) return `Data limite: ${formatDateBR(task.due_date)}`;
    if (task.task_type === "scheduled" && task.scheduled_at) return `Agendada: ${formatDateTimeBR(task.scheduled_at)}`;
    return "Sem data";
  }, [task]);

  async function save() {
    if (!taskId) return;
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg("Informe um título.");
      return;
    }

    const payload: any = {
      title: title.trim(),
      notes: notes.trim() ? notes.trim() : null,
      task_type: taskType,
      priority,
      is_done: isDone,
    };

    if (taskType === "due") {
      if (!dueDate) return setErrorMsg("Informe a data limite.");
      payload.due_date = dueDate;
      payload.scheduled_at = null;
    }

    if (taskType === "scheduled") {
      if (!scheduledAt) return setErrorMsg("Informe a data específica.");
      payload.scheduled_at = new Date(scheduledAt).toISOString();
      payload.due_date = null;
    }

    if (taskType === "anytime") {
      payload.due_date = null;
      payload.scheduled_at = null;
    }

    setSaving(true);
    try {
      const { task } = await apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setTask(task);

      // repopula form
      setTitle(task.title ?? "");
      setNotes(task.notes ?? "");
      setTaskType(task.task_type);
      setPriority((task.priority ?? "medium") as TaskPriority);
      setDueDate(task.due_date ?? "");
      setScheduledAt(task.scheduled_at ? toDatetimeLocalValue(task.scheduled_at) : "");
      setIsDone(!!task.is_done);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!taskId) return;
    setErrorMsg(null);

    const ok = confirm("Tem certeza que deseja excluir esta tarefa?");
    if (!ok) return;

    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      router.replace("/tasks");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Erro ao excluir.");
    }
  }

  if (!ready) return <div className="p-6 text-sm text-zinc-600">Carregando...</div>;

  if (loading) return <div className="p-6 text-sm text-zinc-600">Carregando tarefa...</div>;

  if (!task) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-sm text-zinc-700">Tarefa não encontrada.</div>
        <button className="px-4 py-2 rounded-xl border hover:bg-zinc-50" onClick={() => router.push("/tasks")}>
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
        <div>
          <button
            className="text-sm px-3 py-2 rounded-xl border hover:bg-zinc-50"
            onClick={() => router.push("/tasks")}
          >
            ← Voltar
          </button>

          <h1 className="text-xl font-semibold mt-3">Detalhes da tarefa</h1>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-200 bg-white text-zinc-700">
              {typeLabel(task.task_type)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-200 bg-zinc-50 text-zinc-800">
              prioridade {priorityLabel(task.priority)}
            </span>

            {overdue ? (
              <span className="text-xs px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700">
                vencida
              </span>
            ) : null}

            <span className={`text-sm ${overdue ? "text-red-700" : "text-zinc-600"}`}>{infoLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="text-sm px-4 py-2 rounded-xl bg-black text-white hover:opacity-95 disabled:opacity-60"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>

          <button className="text-sm px-4 py-2 rounded-xl border hover:bg-zinc-50" onClick={remove}>
            Excluir
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm">{errorMsg}</div>
      ) : null}

      {/* Card */}
      <div className="bg-white border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={isDone}
            onChange={(e) => setIsDone(e.target.checked)}
          />
          <span className="text-sm text-zinc-700">Concluída</span>
        </div>

        <div>
          <label className="text-sm text-zinc-700">Título</label>
          <input
            className="w-full mt-1 border rounded-xl px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da tarefa"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-700">Descrição/Notas</label>
          <textarea
            className="w-full mt-1 border rounded-xl px-3 py-2 min-h-[110px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalhes…"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-zinc-700">Prioridade</label>
            <select
              className="w-full mt-1 border rounded-xl px-3 py-2 bg-white"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="low">baixa</option>
              <option value="medium">média</option>
              <option value="high">alta</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-zinc-700">Tipo</label>
            <select
              className="w-full mt-1 border rounded-xl px-3 py-2 bg-white"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
            >
              <option value="due">data limite</option>
              <option value="scheduled">data específica</option>
              <option value="anytime">indefinida</option>
            </select>
          </div>
        </div>

        {taskType === "due" ? (
          <div>
            <label className="text-sm text-zinc-700">Data limite</label>
            <input
              className="w-full mt-1 border rounded-xl px-3 py-2"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        ) : null}

        {taskType === "scheduled" ? (
          <div>
            <label className="text-sm text-zinc-700">Data específica</label>
            <input
              className="w-full mt-1 border rounded-xl px-3 py-2"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        ) : null}

        <div className="text-xs text-zinc-500">
          Criada em:{" "}
          {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(task.created_at))}
          {" • "}
          Atualizada em:{" "}
          {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(task.updated_at))}
        </div>
      </div>
    </div>
  );
}
