"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { apiFetch } from "@/src/lib/api";
import type { Task, TaskPriority, TaskType } from "@/lib/types";
import {
  compareTasksByUrgency,
  formatTaskDateBR,
  formatTaskDateTimeBR,
  isTaskForDay,
  isTaskOverdue,
  normalizeTaskCategory,
  priorityLabel,
  taskCategoryLabel,
  taskWhenLabel,
  typeLabel,
  UNCATEGORIZED_TASK_LABEL,
} from "@/lib/tasks";

type Filter = "all" | TaskType;
type DoneFilter = "all" | "open" | "done";
type CategoryFilter = "all" | "__uncategorized__" | string;

type CategoryPalette = {
  accent: string;
  border: string;
  soft: string;
  glow: string;
  strongText: string;
};

type CategoryGroup = {
  key: string;
  label: string;
  tasks: Task[];
  palette: CategoryPalette;
  overdueCount: number;
};

const CATEGORY_PALETTES: CategoryPalette[] = [
  {
    accent: "#38bdf8",
    border: "rgba(56, 189, 248, 0.24)",
    soft: "linear-gradient(135deg, rgba(224, 242, 254, 0.92), rgba(240, 249, 255, 0.82))",
    glow: "0 22px 50px rgba(56, 189, 248, 0.12)",
    strongText: "#0c4a6e",
  },
  {
    accent: "#22c55e",
    border: "rgba(34, 197, 94, 0.24)",
    soft: "linear-gradient(135deg, rgba(220, 252, 231, 0.92), rgba(240, 253, 244, 0.82))",
    glow: "0 22px 50px rgba(34, 197, 94, 0.12)",
    strongText: "#166534",
  },
  {
    accent: "#f97316",
    border: "rgba(249, 115, 22, 0.24)",
    soft: "linear-gradient(135deg, rgba(255, 237, 213, 0.94), rgba(255, 247, 237, 0.84))",
    glow: "0 22px 50px rgba(249, 115, 22, 0.12)",
    strongText: "#9a3412",
  },
  {
    accent: "#8b5cf6",
    border: "rgba(139, 92, 246, 0.24)",
    soft: "linear-gradient(135deg, rgba(237, 233, 254, 0.92), rgba(245, 243, 255, 0.82))",
    glow: "0 22px 50px rgba(139, 92, 246, 0.12)",
    strongText: "#5b21b6",
  },
  {
    accent: "#ef4444",
    border: "rgba(239, 68, 68, 0.24)",
    soft: "linear-gradient(135deg, rgba(254, 226, 226, 0.92), rgba(255, 241, 242, 0.82))",
    glow: "0 22px 50px rgba(239, 68, 68, 0.12)",
    strongText: "#991b1b",
  },
];

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function hashLabel(label: string) {
  let hash = 0;
  for (const char of label) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  }
  return Math.abs(hash);
}

function getCategoryPalette(label: string) {
  return CATEGORY_PALETTES[hashLabel(label) % CATEGORY_PALETTES.length];
}

function buildCategoryKey(category: string | null | undefined) {
  return normalizeTaskCategory(category)?.toLocaleLowerCase("pt-BR") ?? "__uncategorized__";
}

function buildCategoryFilterLabel(value: CategoryFilter) {
  if (value === "all") return "Todas as categorias";
  if (value === "__uncategorized__") return UNCATEGORIZED_TASK_LABEL;
  return value;
}

function sortCategories(categories: { label: string; value: CategoryFilter }[]) {
  return [...categories].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

function priorityTone(task: Task) {
  if (isTaskOverdue(task)) {
    return {
      badge: "border-red-200 bg-red-50 text-red-700",
      card: "border-red-200/80 bg-red-50/90",
      dot: "#ef4444",
      helper: "text-red-700",
      label: "Vencida",
    };
  }

  if (task.priority === "high") {
    return {
      badge: "border-orange-200 bg-orange-50 text-orange-700",
      card: "border-orange-200/80 bg-orange-50/80",
      dot: "#f97316",
      helper: "text-orange-700",
      label: "Alta prioridade",
    };
  }

  if (task.priority === "medium") {
    return {
      badge: "border-sky-200 bg-sky-50 text-sky-700",
      card: "border-sky-200/80 bg-sky-50/80",
      dot: "#38bdf8",
      helper: "text-sky-700",
      label: "Prioridade media",
    };
  }

  return {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    card: "border-emerald-200/80 bg-emerald-50/70",
    dot: "#22c55e",
    helper: "text-emerald-700",
    label: "Prioridade baixa",
  };
}

function CategoryBadge({
  label,
  palette,
}: {
  label: string;
  palette: CategoryPalette;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
      style={{
        borderColor: palette.border,
        background: "rgba(255, 255, 255, 0.72)",
        color: palette.strongText,
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.accent }} />
      {label}
    </span>
  );
}

function renderAgendaList({
  title,
  subtitle,
  items,
  router,
}: {
  title: string;
  subtitle: string;
  items: Task[];
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <section key={title} className="app-surface overflow-hidden">
      <div className="border-b border-slate-200/70 px-5 py-4">
        <div className="text-base font-semibold text-slate-900">{title}</div>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>

      <div className="divide-y divide-slate-200/70">
        {items.length === 0 ? <div className="px-5 py-6 text-sm text-slate-500">Nada previsto aqui por enquanto.</div> : null}

        {items.map((task) => {
          const palette = getCategoryPalette(taskCategoryLabel(task.category));
          const tone = priorityTone(task);

          return (
            <div key={task.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="text-left text-sm font-semibold text-slate-900 transition hover:text-emerald-700"
                  >
                    {task.title}
                  </button>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CategoryBadge label={taskCategoryLabel(task.category)} palette={palette} />
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}>{tone.label}</span>
                  </div>
                </div>

                <span className="text-xs text-slate-500">{taskWhenLabel(task)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function renderTaskCard({
  task,
  palette,
  router,
  onToggleDone,
  onRemoveTask,
}: {
  task: Task;
  palette: CategoryPalette;
  router: ReturnType<typeof useRouter>;
  onToggleDone: (task: Task) => void;
  onRemoveTask: (taskId: string) => void;
}) {
  const tone = priorityTone(task);

  return (
    <article key={task.id} className={`rounded-[24px] border p-4 shadow-sm transition hover:-translate-y-0.5 ${tone.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          <input type="checkbox" checked={task.is_done} onChange={() => onToggleDone(task)} className="mt-1 h-4 w-4 shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => router.push(`/tasks/${task.id}`)}
                className={`text-left text-base font-semibold transition hover:text-emerald-700 ${
                  task.is_done ? "text-slate-500 line-through" : "text-slate-900"
                }`}
              >
                {task.title}
              </button>

              <CategoryBadge label={taskCategoryLabel(task.category)} palette={palette} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                {typeLabel(task.task_type)}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}>{tone.label}</span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                Prioridade {priorityLabel(task.priority).toLowerCase()}
              </span>
            </div>

            {task.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{task.notes}</p> : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className={`flex items-center gap-2 text-sm font-medium ${tone.helper}`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone.dot }} />
                {taskWhenLabel(task)}
              </div>

              <div className="text-xs text-slate-500">
                Criada em{" "}
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(task.created_at))}
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => onRemoveTask(task.id)} className="app-btn app-btn-danger shrink-0">
          Excluir
        </button>
      </div>
    </article>
  );
}

export default function TasksPage() {
  const { ready } = useRequireSession("/login");
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [agendaTasks, setAgendaTasks] = useState<Task[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>("all");
  const [doneFilter, setDoneFilter] = useState<DoneFilter>("open");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
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

  const today = useMemo(() => startOfDay(new Date()), []);
  const tomorrow = useMemo(() => {
    const nextDay = startOfDay(new Date());
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
  }, []);

  const categoryOptions = useMemo(() => {
    const items = new Map<string, { label: string; value: CategoryFilter }>();
    let hasUncategorized = false;

    for (const task of [...tasks, ...agendaTasks]) {
      const normalized = normalizeTaskCategory(task.category);
      if (!normalized) {
        hasUncategorized = true;
        continue;
      }

      const key = normalized.toLocaleLowerCase("pt-BR");
      if (!items.has(key)) {
        items.set(key, { label: normalized, value: normalized });
      }
    }

    const sorted = sortCategories([...items.values()]);
    if (hasUncategorized) {
      sorted.push({ label: UNCATEGORIZED_TASK_LABEL, value: "__uncategorized__" });
    }
    return sorted;
  }, [agendaTasks, tasks]);

  const safeCategoryFilter = useMemo<CategoryFilter>(() => {
    if (categoryFilter === "all") return "all";

    if (categoryFilter === "__uncategorized__") {
      return categoryOptions.some((item) => item.value === "__uncategorized__") ? categoryFilter : "all";
    }

    return categoryOptions.some((item) => item.value === categoryFilter) ? categoryFilter : "all";
  }, [categoryFilter, categoryOptions]);

  const visibleTasks = useMemo(() => {
    if (safeCategoryFilter === "all") return tasks;

    if (safeCategoryFilter === "__uncategorized__") {
      return tasks.filter((task) => !normalizeTaskCategory(task.category));
    }

    return tasks.filter(
      (task) =>
        normalizeTaskCategory(task.category)?.toLocaleLowerCase("pt-BR") === safeCategoryFilter.toLocaleLowerCase("pt-BR")
    );
  }, [safeCategoryFilter, tasks]);

  const groupedTasks = useMemo<CategoryGroup[]>(() => {
    const grouped = new Map<string, CategoryGroup>();

    for (const task of [...visibleTasks].sort(compareTasksByUrgency)) {
      const label = taskCategoryLabel(task.category);
      const key = buildCategoryKey(task.category);
      const palette = getCategoryPalette(label);

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          label,
          tasks: [],
          palette,
          overdueCount: 0,
        });
      }

      const group = grouped.get(key)!;
      group.tasks.push(task);
      if (isTaskOverdue(task)) group.overdueCount += 1;
    }

    return [...grouped.values()].sort((a, b) => {
      const urgencyDiff = compareTasksByUrgency(a.tasks[0], b.tasks[0]);
      if (urgencyDiff !== 0) return urgencyDiff;
      return a.label.localeCompare(b.label, "pt-BR");
    });
  }, [visibleTasks]);

  const stats = useMemo(() => {
    const open = tasks.filter((task) => !task.is_done).length;
    const done = tasks.filter((task) => task.is_done).length;
    const overdue = tasks.filter((task) => isTaskOverdue(task)).length;
    const categories = new Set(tasks.map((task) => buildCategoryKey(task.category))).size;
    return { open, done, overdue, categories };
  }, [tasks]);

  const agenda = useMemo(() => {
    const openOnly = agendaTasks.filter((task) => !task.is_done);
    const todayList = openOnly.filter((task) => isTaskForDay(task, today)).sort(compareTasksByUrgency);
    const tomorrowList = openOnly.filter((task) => isTaskForDay(task, tomorrow)).sort(compareTasksByUrgency);
    return { todayList, tomorrowList };
  }, [agendaTasks, today, tomorrow]);

  useEffect(() => {
    if (!ready) return;

    (async () => {
      setErrorMsg(null);
      try {
        const qs = queryString ? `?${queryString}` : "";
        const [listResponse, agendaResponse] = await Promise.all([apiFetch(`/api/tasks${qs}`), apiFetch("/api/tasks?done=false")]);

        setTasks(listResponse.tasks ?? []);
        setAgendaTasks(agendaResponse.tasks ?? []);
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error, "Erro ao carregar tarefas."));
      }
    })();
  }, [queryString, ready]);

  async function createTask() {
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
    };

    if (taskType === "due") {
      if (!dueDate) {
        setErrorMsg("Informe a data limite.");
        return;
      }
      payload.due_date = dueDate;
    }

    if (taskType === "scheduled") {
      if (!scheduledAt) {
        setErrorMsg("Informe a data especifica.");
        return;
      }
      payload.scheduled_at = new Date(scheduledAt).toISOString();
    }

    try {
      const { task } = await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setTasks((current) => [task, ...current]);
      setAgendaTasks((current) => [task, ...current]);

      setTitle("");
      setNotes("");
      setCategory("");
      setTaskType("due");
      setPriority("medium");
      setDueDate("");
      setScheduledAt("");
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, "Erro ao criar tarefa."));
    }
  }

  async function toggleDone(task: Task) {
    setErrorMsg(null);

    const snapshotTasks = tasks;
    const snapshotAgenda = agendaTasks;

    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, is_done: !item.is_done } : item)));
    setAgendaTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, is_done: !item.is_done } : item))
    );

    try {
      const { task: updated } = await apiFetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_done: !task.is_done }),
      });

      setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
      setAgendaTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
    } catch (error: unknown) {
      setTasks(snapshotTasks);
      setAgendaTasks(snapshotAgenda);
      setErrorMsg(getErrorMessage(error, "Erro ao atualizar tarefa."));
    }
  }

  async function removeTask(taskId: string) {
    const confirmed = confirm("Deseja excluir esta tarefa?");
    if (!confirmed) return;

    const snapshotTasks = tasks;
    const snapshotAgenda = agendaTasks;

    setTasks((current) => current.filter((task) => task.id !== taskId));
    setAgendaTasks((current) => current.filter((task) => task.id !== taskId));

    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    } catch (error: unknown) {
      setTasks(snapshotTasks);
      setAgendaTasks(snapshotAgenda);
      setErrorMsg(getErrorMessage(error, "Erro ao remover tarefa."));
    }
  }

  if (!ready) return <div className="p-6 text-sm text-slate-300">Carregando...</div>;

  return (
    <div className="app-page pb-4">
      <section className="app-surface-dark overflow-hidden p-6 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <span className="app-kicker">Planejamento inteligente</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Tarefas por categoria e urgencia</h1>
            <p className="app-subtle-dark mt-3 max-w-2xl text-sm leading-6 sm:text-base">
              Agora as tarefas podem ser agrupadas por categoria, ordenadas pela urgencia e destacadas visualmente para ficar
              mais facil decidir o que fazer primeiro.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[26rem] xl:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Abertas</div>
              <div className="mt-2 text-3xl font-semibold text-white">{stats.open}</div>
              <div className="mt-1 text-sm text-slate-300">Tarefas ainda em andamento.</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Concluidas</div>
              <div className="mt-2 text-3xl font-semibold text-white">{stats.done}</div>
              <div className="mt-1 text-sm text-slate-300">Itens resolvidos no filtro atual.</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Categorias</div>
              <div className="mt-2 text-3xl font-semibold text-white">{stats.categories}</div>
              <div className="mt-1 text-sm text-slate-300">Grupos distintos visiveis na lista.</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Vencidas</div>
              <div className="mt-2 text-3xl font-semibold text-white">{stats.overdue}</div>
              <div className="mt-1 text-sm text-slate-300">Tarefas atrasadas pedindo atencao.</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["open", "done", "all"] as DoneFilter[]).map((value) => (
              <button
                key={value}
                onClick={() => setDoneFilter(value)}
                className={`app-chip ${doneFilter === value ? "app-chip-active" : "app-chip-muted"}`}
              >
                {value === "open" ? "Abertas" : value === "done" ? "Concluidas" : "Todas"}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[32rem]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Tipo</label>
              <select className="app-select" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
                <option value="all">Todos os tipos</option>
                <option value="due">Com prazo</option>
                <option value="scheduled">Agendadas</option>
                <option value="anytime">Flexiveis</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Categoria</label>
              <select
                className="app-select"
                value={safeCategoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
              >
                <option value="all">Todas as categorias</option>
                {categoryOptions.map((item) => (
                  <option key={`${item.value}`} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {errorMsg ? (
        <div className="rounded-[22px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <div className="app-surface p-6">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Nova tarefa</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Capture e categorize rapidamente</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Se a categoria ficar vazia, a tarefa entra em <strong>{UNCATEGORIZED_TASK_LABEL}</strong>.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Titulo</label>
              <input
                className="app-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: Preparar reuniao de segunda"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Categoria</label>
              <input
                className="app-input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Ex: Trabalho, Casa, Estudos"
                list="task-categories"
              />
              <datalist id="task-categories">
                {categoryOptions
                  .filter((item) => item.value !== "__uncategorized__")
                  .map((item) => (
                    <option key={item.label} value={item.label} />
                  ))}
              </datalist>
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
              <label className="mb-2 block text-sm font-medium text-slate-700">Descricao ou notas</label>
              <textarea
                className="app-textarea"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Contexto, proximos passos ou links importantes."
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={createTask} className="app-btn app-btn-primary">
              Criar tarefa
            </button>

            <div className="text-sm text-slate-500">
              Visualizando: <span className="font-semibold text-slate-700">{buildCategoryFilterLabel(safeCategoryFilter)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {renderAgendaList({
            title: "Hoje",
            subtitle: `${agenda.todayList.length} tarefa(s) previstas para hoje`,
            items: agenda.todayList,
            router,
          })}
          {renderAgendaList({
            title: "Amanha",
            subtitle: `${agenda.tomorrowList.length} tarefa(s) previstas para o proximo dia`,
            items: agenda.tomorrowList,
            router,
          })}
        </div>
      </section>

      <section className="app-page">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-300">Lista inteligente</span>
            <h2 className="mt-2 text-2xl font-semibold text-white">Agrupada por categoria e ordenada por urgencia</h2>
          </div>

          <div className="text-sm text-slate-300">
            {visibleTasks.length} tarefa(s) em <span className="font-semibold text-white">{groupedTasks.length}</span> grupo(s)
          </div>
        </div>

        {groupedTasks.length === 0 ? (
          <div className="app-surface p-8 text-center text-slate-500">Nenhuma tarefa encontrada com os filtros atuais.</div>
        ) : null}

        {groupedTasks.map((group) => (
          <section
            key={group.key}
            className="app-surface overflow-hidden"
            style={{
              borderColor: group.palette.border,
              boxShadow: group.palette.glow,
            }}
          >
            <div className="border-b px-5 py-4" style={{ background: group.palette.soft, borderColor: group.palette.border }}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.palette.accent }} />
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: group.palette.strongText }}>
                      {group.label}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {group.tasks.length} tarefa(s) neste grupo
                      {group.overdueCount > 0 ? ` - ${group.overdueCount} vencida(s)` : ""}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-slate-600">
                  Primeiro item:{" "}
                  <span className="font-semibold text-slate-900">
                    {group.tasks[0].task_type === "due" && group.tasks[0].due_date
                      ? formatTaskDateBR(group.tasks[0].due_date)
                      : group.tasks[0].task_type === "scheduled" && group.tasks[0].scheduled_at
                        ? formatTaskDateTimeBR(group.tasks[0].scheduled_at)
                        : "Sem data"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-5 xl:grid-cols-2">
              {group.tasks.map((task) =>
                renderTaskCard({
                  task,
                  palette: group.palette,
                  router,
                  onToggleDone: toggleDone,
                  onRemoveTask: removeTask,
                })
              )}
            </div>
          </section>
        ))}
      </section>
    </div>
  );
}
