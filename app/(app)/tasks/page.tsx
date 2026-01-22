"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { apiFetch } from "@/src/lib/api";
import type { Task, TaskPriority, TaskType } from "@/lib/types";

type Filter = "all" | TaskType;
type DoneFilter = "all" | "open" | "done";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
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

function priorityLabel(p: TaskPriority) {
  if (p === "high") return "alta";
  if (p === "low") return "baixa";
  return "média";
}

function typeLabel(t: TaskType) {
  if (t === "due") return "limite";
  if (t === "scheduled") return "agendada";
  return "indefinida";
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

function isForDay(t: Task, day: Date) {
  const s = startOfDay(day);
  const e = endOfDay(day);

  if (t.task_type === "scheduled" && t.scheduled_at) {
    const when = new Date(t.scheduled_at);
    return when >= s && when <= e;
  }

  if (t.task_type === "due" && t.due_date) {
    const due = startOfDay(new Date(t.due_date + "T00:00:00"));
    return due.getTime() === s.getTime();
  }

  return false;
}

function badgeClasses(kind: "type" | "priority" | "overdue") {
  if (kind === "overdue") return "border-red-200 bg-red-50 text-red-700";
  if (kind === "priority") return "border-zinc-200 bg-zinc-50 text-zinc-800";
  return "border-zinc-200 bg-white text-zinc-700";
}

export default function TasksPage() {
  const { ready } = useRequireSession("/login");
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [agendaTasks, setAgendaTasks] = useState<Task[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>("all");
  const [doneFilter, setDoneFilter] = useState<DoneFilter>("open");

  // create form
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("due");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("type", filter);
    if (doneFilter === "open") params.set("done", "false");
    if (doneFilter === "done") params.set("done", "true");
    return params.toString();
  }, [filter, doneFilter]);

  const stats = useMemo(() => {
    const open = tasks.filter((t) => !t.is_done).length;
    const done = tasks.filter((t) => t.is_done).length;
    return { open, done };
  }, [tasks]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const tomorrow = useMemo(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() + 1);
    return d;
  }, []);

  const agenda = useMemo(() => {
    const openOnly = agendaTasks.filter((t) => !t.is_done);
    const todayList = openOnly.filter((t) => isForDay(t, today));
    const tomorrowList = openOnly.filter((t) => isForDay(t, tomorrow));
    return { todayList, tomorrowList };
  }, [agendaTasks, today, tomorrow]);

  async function loadList() {
    const qs = queryString ? `?${queryString}` : "";
    const { tasks } = await apiFetch(`/api/tasks${qs}`);
    setTasks(tasks);
  }

  async function loadAgenda() {
    // agenda sempre baseada em abertas (não depende do filtro atual)
    const { tasks } = await apiFetch(`/api/tasks?done=false`);
    setAgendaTasks(tasks);
  }

  useEffect(() => {
    if (!ready) return;
    (async () => {
      setErrorMsg(null);
      try {
        await Promise.all([loadList(), loadAgenda()]);
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Erro ao carregar tarefas.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, queryString]);

  async function createTask() {
    setErrorMsg(null);
    if (!title.trim()) return setErrorMsg("Informe um título.");

    const payload: any = {
      title: title.trim(),
      notes: notes.trim() ? notes.trim() : null,
      task_type: taskType,
      priority,
    };

    if (taskType === "due") {
      if (!dueDate) return setErrorMsg("Informe a data limite.");
      payload.due_date = dueDate;
    }
    if (taskType === "scheduled") {
      if (!scheduledAt) return setErrorMsg("Informe a data específica.");
      payload.scheduled_at = new Date(scheduledAt).toISOString();
    }

    const { task } = await apiFetch("/api/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setTitle("");
    setNotes("");
    setTaskType("due");
    setPriority("medium");
    setDueDate("");
    setScheduledAt("");

    // atualiza list + agenda de forma simples
    setTasks((prev) => [task, ...prev]);
    setAgendaTasks((prev) => [task, ...prev]);
  }

  async function toggleDone(t: Task) {
    setErrorMsg(null);

    const prevTasks = tasks;
    const prevAgenda = agendaTasks;

    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_done: !x.is_done } : x)));
    setAgendaTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_done: !x.is_done } : x)));

    try {
      const { task } = await apiFetch(`/api/tasks/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_done: !t.is_done }),
      });

      setTasks((prev) => prev.map((x) => (x.id === t.id ? task : x)));
      setAgendaTasks((prev) => prev.map((x) => (x.id === t.id ? task : x)));
    } catch (e: any) {
      setTasks(prevTasks);
      setAgendaTasks(prevAgenda);
      setErrorMsg(e?.message ?? "Erro ao atualizar tarefa.");
    }
  }

  async function removeTask(id: string) {
    setErrorMsg(null);

    const ok = confirm("Deseja excluir esta tarefa?");
    if (!ok) return;

    const snapT = tasks;
    const snapA = agendaTasks;

    setTasks((prev) => prev.filter((t) => t.id !== id));
    setAgendaTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
    } catch (e: any) {
      setTasks(snapT);
      setAgendaTasks(snapA);
      setErrorMsg(e?.message ?? "Erro ao remover tarefa.");
    }
  }

  function TaskRow({ t }: { t: Task }) {
    const overdue = isOverdue(t);

    return (
      <div className="p-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={t.is_done} onChange={() => toggleDone(t)} className="h-4 w-4" />

            <button
              onClick={() => router.push(`/tasks/${t.id}`)}
              className={`text-left font-semibold hover:underline ${
                t.is_done ? "line-through text-zinc-500" : "text-zinc-900"
              }`}
            >
              {t.title}
            </button>

            <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeClasses("type")}`}>
              {typeLabel(t.task_type)}
            </span>

            <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeClasses("priority")}`}>
              prioridade {priorityLabel(t.priority)}
            </span>

            {overdue ? (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeClasses("overdue")}`}>
                vencida
              </span>
            ) : null}
          </div>

          {t.notes ? <div className="text-sm text-zinc-600 mt-1">{t.notes}</div> : null}

          <div className={`text-xs mt-2 ${overdue ? "text-red-700" : "text-zinc-600"}`}>
            {t.task_type === "due" && t.due_date ? (
              <>Data limite: <b>{formatDateBR(t.due_date)}</b></>
            ) : null}

            {t.task_type === "scheduled" && t.scheduled_at ? (
              <>Agendada: <b>{formatDateTimeBR(t.scheduled_at)}</b></>
            ) : null}

            {t.task_type === "anytime" ? <>Sem data</> : null}
          </div>
        </div>

        <button onClick={() => removeTask(t.id)} className="text-sm px-3 py-2 rounded-xl border hover:bg-zinc-50">
          Excluir
        </button>
      </div>
    );
  }

  if (!ready) return <div className="p-6 text-sm text-zinc-600">Carregando...</div>;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-col sm:flex-row gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tarefas</h1>
          <p className="text-sm text-zinc-600">Tags, prioridade, atraso e agenda diária (Hoje/Amanhã).</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="text-sm px-3 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">Todas</option>
            <option value="due">Com data limite</option>
            <option value="scheduled">Data específica</option>
            <option value="anytime">Indefinidas</option>
          </select>

          <select
            className="text-sm px-3 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900"
            value={doneFilter}
            onChange={(e) => setDoneFilter(e.target.value as any)}
          >
            <option value="open">Abertas</option>
            <option value="done">Concluídas</option>
            <option value="all">Todas</option>
          </select>
        </div>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-xs text-zinc-600">Abertas</div>
          <div className="text-2xl font-semibold">{stats.open}</div>
        </div>
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-xs text-zinc-600">Concluídas</div>
          <div className="text-2xl font-semibold">{stats.done}</div>
        </div>
      </div>

      {/* Agenda diária */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-white">
            <div className="text-sm font-semibold text-zinc-900">Hoje</div>
            <div className="text-xs text-zinc-600">{agenda.todayList.length} tarefa(s)</div>
          </div>
          <div className="divide-y">
            {agenda.todayList.map((t) => (
              <div key={t.id} className="p-4">
                <button
                  onClick={() => router.push(`/tasks/${t.id}`)}
                  className="font-semibold text-zinc-900 hover:underline text-left"
                >
                  {t.title}
                </button>
                <div className="text-xs text-zinc-600 mt-1">
                  <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border ${badgeClasses("type")}`}>
                    {typeLabel(t.task_type)}
                  </span>{" "}
                  <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border ${badgeClasses("priority")}`}>
                    prioridade {priorityLabel(t.priority)}
                  </span>
                </div>
              </div>
            ))}
            {agenda.todayList.length === 0 ? (
              <div className="p-4 text-sm text-zinc-600">Nada para hoje.</div>
            ) : null}
          </div>
        </div>

        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-white">
            <div className="text-sm font-semibold text-zinc-900">Amanhã</div>
            <div className="text-xs text-zinc-600">{agenda.tomorrowList.length} tarefa(s)</div>
          </div>
          <div className="divide-y">
            {agenda.tomorrowList.map((t) => (
              <div key={t.id} className="p-4">
                <button
                  onClick={() => router.push(`/tasks/${t.id}`)}
                  className="font-semibold text-zinc-900 hover:underline text-left"
                >
                  {t.title}
                </button>
                <div className="text-xs text-zinc-600 mt-1">
                  <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border ${badgeClasses("type")}`}>
                    {typeLabel(t.task_type)}
                  </span>{" "}
                  <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border ${badgeClasses("priority")}`}>
                    prioridade {priorityLabel(t.priority)}
                  </span>
                </div>
              </div>
            ))}
            {agenda.tomorrowList.length === 0 ? (
              <div className="p-4 text-sm text-zinc-600">Nada para amanhã.</div>
            ) : null}
          </div>
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm">{errorMsg}</div>
      ) : null}

      {/* Criar tarefa */}
      <div className="bg-white border rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm text-zinc-700">Título</label>
            <input
              className="w-full mt-1 border rounded-xl px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Estudar 30 minutos"
            />
          </div>

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
        </div>

        <div>
          <label className="text-sm text-zinc-700">Descrição/Notas (opcional)</label>
          <textarea
            className="w-full mt-1 border rounded-xl px-3 py-2 min-h-[70px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalhes…"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

          {taskType === "due" ? (
            <div className="md:col-span-2">
              <label className="text-sm text-zinc-700">Data limite</label>
              <input
                type="date"
                className="w-full mt-1 border rounded-xl px-3 py-2"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          ) : null}

          {taskType === "scheduled" ? (
            <div className="md:col-span-2">
              <label className="text-sm text-zinc-700">Data específica</label>
              <input
                type="datetime-local"
                className="w-full mt-1 border rounded-xl px-3 py-2"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <button onClick={createTask} className="text-sm px-4 py-2 rounded-xl bg-black text-white hover:opacity-95">
          Criar tarefa
        </button>
      </div>

      {/* Lista (estilo antigo com tags + notes) */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-white">
          <div className="text-sm font-semibold text-zinc-900">Lista</div>
          <div className="text-xs text-zinc-600">Clique no título para abrir detalhes.</div>
        </div>

        <div className="divide-y">
          {tasks.map((t) => (
            <TaskRow key={t.id} t={t} />
          ))}

          {tasks.length === 0 ? (
            <div className="p-6 text-sm text-zinc-600">Nenhuma tarefa encontrada.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
