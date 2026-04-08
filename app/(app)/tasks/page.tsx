"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TaskStatusControl } from "@/components/tasks/TaskStatusControl";
import { getErrorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { intlLocale } from "@/lib/locale";
import {
  compareTasksByUrgency,
  formatTaskDateBR,
  formatTaskDateTimeBR,
  getTaskStatus,
  isTaskDone,
  isTaskForDay,
  isTaskOverdue,
  normalizeTaskCategory,
  priorityLabel,
  taskCategoryLabel,
  taskStatusLabel,
  taskWhenLabel,
  typeLabel,
} from "@/lib/tasks";
import type { Task, TaskPriority, TaskStatus, TaskType } from "@/lib/types";
import { apiFetch } from "@/src/lib/api";
import { useRequireSession } from "@/src/lib/useRequireSession";

type Filter = "all" | TaskType;
type StatusFilter = "all" | "open" | TaskStatus;
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

function buildCategoryKey(category: string | null | undefined, locale: "pt" | "en") {
  return normalizeTaskCategory(category)?.toLocaleLowerCase(intlLocale(locale)) ?? "__uncategorized__";
}

function buildCategoryFilterLabel(value: CategoryFilter, locale: "pt" | "en") {
  if (value === "all") return locale === "en" ? "all categories" : "todas as categorias";
  if (value === "__uncategorized__") return taskCategoryLabel(null, locale).toLowerCase();
  return value;
}

function buildStatusFilterLabel(value: StatusFilter, locale: "pt" | "en") {
  if (value === "all") return locale === "en" ? "all" : "todas";
  if (value === "open") return locale === "en" ? "open" : "abertas";
  return taskStatusLabel(value, locale).toLowerCase();
}

function sortCategories(categories: { label: string; value: CategoryFilter }[], locale: "pt" | "en") {
  return [...categories].sort((a, b) => a.label.localeCompare(b.label, intlLocale(locale)));
}

function matchesStatusFilter(task: Task, statusFilter: StatusFilter) {
  if (statusFilter === "all") return true;
  if (statusFilter === "open") return !isTaskDone(task);
  return getTaskStatus(task) === statusFilter;
}

function cardTone(task: Task) {
  if (isTaskOverdue(task)) {
    return { card: "border-red-200/80 bg-red-50/90", dot: "#ef4444", helper: "text-red-700" };
  }

  const status = getTaskStatus(task);
  if (status === "done") {
    return { card: "border-emerald-200/80 bg-emerald-50/85", dot: "#22c55e", helper: "text-emerald-700" };
  }

  if (status === "in_progress") {
    return { card: "border-sky-200/80 bg-sky-50/85", dot: "#0ea5e9", helper: "text-sky-700" };
  }

  if (task.priority === "high") {
    return { card: "border-orange-200/80 bg-orange-50/80", dot: "#f97316", helper: "text-orange-700" };
  }

  if (task.priority === "medium") {
    return { card: "border-violet-200/80 bg-violet-50/80", dot: "#8b5cf6", helper: "text-violet-700" };
  }

  return { card: "border-slate-200/80 bg-white/90", dot: "#64748b", helper: "text-slate-600" };
}

function statusBadgeClasses(task: Task) {
  const status = getTaskStatus(task);
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "in_progress") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function priorityBadgeClasses(priority: TaskPriority) {
  if (priority === "high") return "border-orange-200 bg-orange-50 text-orange-700";
  if (priority === "medium") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-slate-200 bg-white/80 text-slate-700";
}

function CategoryBadge({ label, palette }: { label: string; palette: CategoryPalette }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
      style={{ borderColor: palette.border, background: "rgba(255, 255, 255, 0.72)", color: palette.strongText }}
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
  locale,
}: {
  title: string;
  subtitle: string;
  items: Task[];
  router: ReturnType<typeof useRouter>;
  locale: "pt" | "en";
}) {
  return (
    <section key={title} className="app-surface overflow-hidden">
      <div className="border-b border-slate-200/70 px-5 py-4">
        <div className="text-base font-semibold text-slate-900">{title}</div>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>

      <div className="divide-y divide-slate-200/70">
        {items.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">
            {locale === "en" ? "Nothing scheduled here yet." : "Nada previsto aqui por enquanto."}
          </div>
        ) : null}

        {items.map((task) => {
          const palette = getCategoryPalette(taskCategoryLabel(task.category, locale));

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
                    <CategoryBadge label={taskCategoryLabel(task.category, locale)} palette={palette} />
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClasses(task)}`}>
                      {taskStatusLabel(task, locale)}
                    </span>
                    {isTaskOverdue(task) ? (
                      <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        {locale === "en" ? "Overdue" : "Vencida"}
                      </span>
                    ) : null}
                  </div>
                </div>

                <span className="text-right text-xs text-slate-500">{taskWhenLabel(task, locale)}</span>
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
  onStatusChange,
  onRemoveTask,
  locale,
}: {
  task: Task;
  palette: CategoryPalette;
  router: ReturnType<typeof useRouter>;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onRemoveTask: (taskId: string) => void;
  locale: "pt" | "en";
}) {
  const tone = cardTone(task);
  const status = getTaskStatus(task);
  const done = isTaskDone(task);
  const overdue = isTaskOverdue(task);

  return (
    <article key={task.id} className={`rounded-[24px] border p-4 shadow-sm transition hover:-translate-y-0.5 ${tone.card}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => router.push(`/tasks/${task.id}`)}
                className={`text-left text-base font-semibold transition hover:text-emerald-700 ${done ? "text-slate-500 line-through" : "text-slate-900"}`}
              >
                {task.title}
              </button>

              <CategoryBadge label={taskCategoryLabel(task.category, locale)} palette={palette} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClasses(task)}`}>
                {taskStatusLabel(status, locale)}
              </span>
              {overdue ? (
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  {locale === "en" ? "Overdue" : "Vencida"}
                </span>
              ) : null}
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityBadgeClasses(task.priority)}`}>
                {locale === "en" ? "Priority" : "Prioridade"} {priorityLabel(task.priority, locale).toLowerCase()}
              </span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                {typeLabel(task.task_type, locale)}
              </span>
            </div>

            {task.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{task.notes}</p> : null}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className={`flex items-center gap-2 text-sm font-medium ${tone.helper}`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone.dot }} />
                {taskWhenLabel(task, locale)}
              </div>

              <div className="text-xs text-slate-500">
                {locale === "en" ? "Created on " : "Criada em "}
                {new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "short", timeStyle: "short" }).format(new Date(task.created_at))}
              </div>
            </div>
          </div>

          <button onClick={() => onRemoveTask(task.id)} className="app-btn app-btn-danger w-full shrink-0 sm:w-auto">
            {locale === "en" ? "Delete" : "Excluir"}
          </button>
        </div>

        <div className="rounded-[20px] border border-white/80 bg-white/75 p-3">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {locale === "en" ? "Quick status" : "Status rapido"}
            </div>
            <div className="text-xs text-slate-500">
              {locale === "en" ? "Update it without leaving the list." : "Atualize sem sair da lista."}
            </div>
          </div>

          <TaskStatusControl value={status} onChange={(nextStatus) => onStatusChange(task, nextStatus)} />
        </div>
      </div>
    </article>
  );
}

export default function TasksPage() {
  const { ready } = useRequireSession("/login");
  const { locale } = useI18n();
  const router = useRouter();

  const copy =
    locale === "en"
      ? {
          loading: "Loading...",
          heroKicker: "Smart planning",
          heroTitle: "Tasks with real status and mobile-first flow",
          heroSubtitle:
            "Separate what is still to do, what is already in progress, and what is complete while keeping category grouping and urgency visibility.",
          todo: "To do",
          todoHint: "Pending work that has not started yet.",
          progress: "In progress",
          progressHint: "Items that already have momentum.",
          done: "Done",
          doneHint: "Resolved and out of the main queue.",
          overdue: "Overdue",
          overdueHint: "Late tasks asking for attention.",
          open: "Open",
          all: "All",
          type: "Type",
          category: "Category",
          allTypes: "All types",
          dueType: "With deadline",
          scheduledType: "Scheduled",
          flexibleType: "Flexible",
          allCategories: "All categories",
          newTaskKicker: "New task",
          newTaskTitle: "Capture, categorize, and flag the current state",
          newTaskHintPrefix: "If category is empty, the task goes to",
          titleLabel: "Title",
          titlePlaceholder: "Example: Prepare Monday meeting",
          categoryPlaceholder: "Example: Work, Home, Study",
          priority: "Priority",
          low: "Low",
          medium: "Medium",
          high: "High",
          initialStatus: "Initial status",
          initialStatusHint: 'Use "In progress" when the task has already started.',
          notes: "Description or notes",
          notesPlaceholder: "Context, next steps, or important links.",
          dateLimit: "Due date",
          dateTime: "Date and time",
          createTask: "Create task",
          activeFilter: "Active filter",
          today: "Today",
          tomorrow: "Tomorrow",
        }
      : {
          loading: "Carregando...",
          heroKicker: "Planejamento inteligente",
          heroTitle: "Tarefas com estado real e foco mobile",
          heroSubtitle:
            "Agora voce consegue separar o que ainda esta a fazer, o que ja esta em andamento e o que foi concluido, mantendo o agrupamento por categoria e a leitura por urgencia.",
          todo: "A fazer",
          todoHint: "Pendencias ainda nao iniciadas.",
          progress: "Em andamento",
          progressHint: "Itens que ja ganharam tracao.",
          done: "Concluidas",
          doneHint: "Resolvidas e fora da fila principal.",
          overdue: "Vencidas",
          overdueHint: "Tarefas atrasadas pedindo atencao.",
          open: "Abertas",
          all: "Todas",
          type: "Tipo",
          category: "Categoria",
          allTypes: "Todos os tipos",
          dueType: "Com prazo",
          scheduledType: "Agendadas",
          flexibleType: "Flexiveis",
          allCategories: "Todas as categorias",
          newTaskKicker: "Nova tarefa",
          newTaskTitle: "Capture, categorize e sinalize o momento atual",
          newTaskHintPrefix: "Se a categoria ficar vazia, a tarefa entra em",
          titleLabel: "Titulo",
          titlePlaceholder: "Ex: Preparar reuniao de segunda",
          categoryPlaceholder: "Ex: Trabalho, Casa, Estudos",
          priority: "Prioridade",
          low: "Baixa",
          medium: "Media",
          high: "Alta",
          initialStatus: "Status inicial",
          initialStatusHint: 'Use "Em andamento" quando a tarefa ja tiver sido iniciada.',
          notes: "Descricao ou notas",
          notesPlaceholder: "Contexto, proximos passos ou links importantes.",
          dateLimit: "Data limite",
          dateTime: "Data e hora",
          createTask: "Criar tarefa",
          activeFilter: "Filtro ativo",
          today: "Hoje",
          tomorrow: "Amanha",
        };

  const moreCopy =
    locale === "en"
      ? {
          todaySubtitle: "task(s) scheduled for today",
          tomorrowSubtitle: "task(s) scheduled for the next day",
          smartList: "Smart list",
          groupedTitle: "Grouped by category, state, and urgency",
          groupsSummary: "group(s)",
          tasksSummary: "task(s)",
          noTasks: "No tasks found with the current filters.",
          inGroup: "task(s) in this group",
          firstItem: "First item",
          noDate: "No date",
          confirmDelete: "Do you want to delete this task?",
          errors: {
            load: "Could not load tasks.",
            title: "Please enter a title.",
            dueDate: "Please enter the due date.",
            scheduledAt: "Please enter the scheduled date.",
            create: "Could not create the task.",
            update: "Could not update the task.",
            remove: "Could not remove the task.",
          },
        }
      : {
          todaySubtitle: "tarefa(s) previstas para hoje",
          tomorrowSubtitle: "tarefa(s) previstas para o proximo dia",
          smartList: "Lista inteligente",
          groupedTitle: "Agrupada por categoria, estado e urgencia",
          groupsSummary: "grupo(s)",
          tasksSummary: "tarefa(s)",
          noTasks: "Nenhuma tarefa encontrada com os filtros atuais.",
          inGroup: "tarefa(s) neste grupo",
          firstItem: "Primeiro item",
          noDate: "Sem data",
          confirmDelete: "Deseja excluir esta tarefa?",
          errors: {
            load: "Erro ao carregar tarefas.",
            title: "Informe um titulo.",
            dueDate: "Informe a data limite.",
            scheduledAt: "Informe a data especifica.",
            create: "Erro ao criar tarefa.",
            update: "Erro ao atualizar tarefa.",
            remove: "Erro ao remover tarefa.",
          },
        };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [agendaTasks, setAgendaTasks] = useState<Task[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("due");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("type", filter);
    return params.toString();
  }, [filter]);

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

      const key = normalized.toLocaleLowerCase(intlLocale(locale));
      if (!items.has(key)) {
        items.set(key, { label: normalized, value: normalized });
      }
    }

    const sorted = sortCategories([...items.values()], locale);
    if (hasUncategorized) {
      sorted.push({ label: taskCategoryLabel(null, locale), value: "__uncategorized__" });
    }
    return sorted;
  }, [agendaTasks, locale, tasks]);

  const safeCategoryFilter = useMemo<CategoryFilter>(() => {
    if (categoryFilter === "all") return "all";

    if (categoryFilter === "__uncategorized__") {
      return categoryOptions.some((item) => item.value === "__uncategorized__") ? categoryFilter : "all";
    }

    return categoryOptions.some((item) => item.value === categoryFilter) ? categoryFilter : "all";
  }, [categoryFilter, categoryOptions]);

  const statusFilteredTasks = useMemo(
    () => tasks.filter((task) => matchesStatusFilter(task, statusFilter)),
    [statusFilter, tasks]
  );

  const visibleTasks = useMemo(() => {
    if (safeCategoryFilter === "all") return statusFilteredTasks;

    if (safeCategoryFilter === "__uncategorized__") {
      return statusFilteredTasks.filter((task) => !normalizeTaskCategory(task.category));
    }

    return statusFilteredTasks.filter(
      (task) =>
        normalizeTaskCategory(task.category)?.toLocaleLowerCase(intlLocale(locale)) ===
        safeCategoryFilter.toLocaleLowerCase(intlLocale(locale))
    );
  }, [locale, safeCategoryFilter, statusFilteredTasks]);

  const groupedTasks = useMemo<CategoryGroup[]>(() => {
    const grouped = new Map<string, CategoryGroup>();

    for (const task of [...visibleTasks].sort(compareTasksByUrgency)) {
      const label = taskCategoryLabel(task.category, locale);
      const key = buildCategoryKey(task.category, locale);
      const palette = getCategoryPalette(label);

      if (!grouped.has(key)) {
        grouped.set(key, { key, label, tasks: [], palette, overdueCount: 0 });
      }

      const group = grouped.get(key)!;
      group.tasks.push(task);
      if (isTaskOverdue(task)) group.overdueCount += 1;
    }

    return [...grouped.values()].sort((a, b) => {
      const urgencyDiff = compareTasksByUrgency(a.tasks[0], b.tasks[0]);
      if (urgencyDiff !== 0) return urgencyDiff;
      return a.label.localeCompare(b.label, intlLocale(locale));
    });
  }, [locale, visibleTasks]);

  const stats = useMemo(() => {
    const todo = tasks.filter((task) => getTaskStatus(task) === "todo").length;
    const inProgress = tasks.filter((task) => getTaskStatus(task) === "in_progress").length;
    const done = tasks.filter((task) => getTaskStatus(task) === "done").length;
    const overdue = tasks.filter((task) => isTaskOverdue(task)).length;
    return { todo, inProgress, done, overdue };
  }, [tasks]);

  const agenda = useMemo(() => {
    const openOnly = agendaTasks.filter((task) => !isTaskDone(task));
    const todayList = openOnly.filter((task) => isTaskForDay(task, today)).sort(compareTasksByUrgency);
    const tomorrowList = openOnly.filter((task) => isTaskForDay(task, tomorrow)).sort(compareTasksByUrgency);
    return { todayList, tomorrowList };
  }, [agendaTasks, today, tomorrow]);

  useEffect(() => {
    if (!ready) return;

    (async () => {
      setErrorMsg(null);
      try {
        const querySuffix = queryString ? `?${queryString}` : "";
        const [listResponse, agendaResponse] = await Promise.all([apiFetch(`/api/tasks${querySuffix}`), apiFetch("/api/tasks?done=false")]);
        setTasks(listResponse.tasks ?? []);
        setAgendaTasks(agendaResponse.tasks ?? []);
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error, moreCopy.errors.load));
      }
    })();
  }, [moreCopy.errors.load, queryString, ready]);

  async function createTask() {
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg(moreCopy.errors.title);
      return;
    }

    const payload: Record<string, unknown> = {
      title: title.trim(),
      notes: notes.trim() ? notes.trim() : null,
      category: category.trim() ? category.trim() : null,
      task_type: taskType,
      priority,
      status: taskStatus,
    };

    if (taskType === "due") {
      if (!dueDate) {
        setErrorMsg(moreCopy.errors.dueDate);
        return;
      }
      payload.due_date = dueDate;
    }

    if (taskType === "scheduled") {
      if (!scheduledAt) {
        setErrorMsg(moreCopy.errors.scheduledAt);
        return;
      }
      payload.scheduled_at = new Date(scheduledAt).toISOString();
    }

    try {
      const { task } = await apiFetch("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
      setTasks((current) => [task, ...current]);
      setAgendaTasks((current) => [task, ...current]);
      setTitle("");
      setNotes("");
      setCategory("");
      setTaskType("due");
      setPriority("medium");
      setTaskStatus("todo");
      setDueDate("");
      setScheduledAt("");
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, moreCopy.errors.create));
    }
  }

  async function updateTaskStatus(task: Task, nextStatus: TaskStatus) {
    if (getTaskStatus(task) === nextStatus) return;

    setErrorMsg(null);

    const snapshotTasks = tasks;
    const snapshotAgenda = agendaTasks;

    const applyStatus = (item: Task) =>
      item.id === task.id ? { ...item, status: nextStatus, is_done: nextStatus === "done" } : item;

    setTasks((current) => current.map(applyStatus));
    setAgendaTasks((current) => current.map(applyStatus));

    try {
      const { task: updated } = await apiFetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
      setAgendaTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
    } catch (error: unknown) {
      setTasks(snapshotTasks);
      setAgendaTasks(snapshotAgenda);
      setErrorMsg(getErrorMessage(error, moreCopy.errors.update));
    }
  }

  async function removeTask(taskId: string) {
    const confirmed = confirm(moreCopy.confirmDelete);
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
      setErrorMsg(getErrorMessage(error, moreCopy.errors.remove));
    }
  }

  if (!ready) return <div className="p-6 text-sm text-slate-300">{copy.loading}</div>;

  return (
    <div className="app-page pb-4">
      <section className="app-surface-dark overflow-hidden p-5 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <span className="app-kicker">{copy.heroKicker}</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.heroTitle}</h1>
            <p className="app-subtle-dark mt-3 max-w-2xl text-sm leading-6 sm:text-base">{copy.heroSubtitle}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[28rem] xl:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{copy.todo}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{stats.todo}</div>
              <div className="mt-1 text-sm text-slate-300">{copy.todoHint}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{copy.progress}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{stats.inProgress}</div>
              <div className="mt-1 text-sm text-slate-300">{copy.progressHint}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{copy.done}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{stats.done}</div>
              <div className="mt-1 text-sm text-slate-300">{copy.doneHint}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{copy.overdue}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{stats.overdue}</div>
              <div className="mt-1 text-sm text-slate-300">{copy.overdueHint}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["open", "todo", "in_progress", "done", "all"] as StatusFilter[]).map((value) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`app-chip ${statusFilter === value ? "app-chip-active" : "app-chip-muted"}`}
              >
                {value === "open"
                  ? copy.open
                  : value === "todo"
                    ? taskStatusLabel("todo", locale)
                    : value === "in_progress"
                      ? taskStatusLabel("in_progress", locale)
                      : value === "done"
                        ? taskStatusLabel("done", locale)
                        : copy.all}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[32rem]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">{copy.type}</label>
              <select className="app-select" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
                <option value="all">{copy.allTypes}</option>
                <option value="due">{copy.dueType}</option>
                <option value="scheduled">{copy.scheduledType}</option>
                <option value="anytime">{copy.flexibleType}</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">{copy.category}</label>
              <select
                className="app-select"
                value={safeCategoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
              >
                <option value="all">{copy.allCategories}</option>
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

      {errorMsg ? <div className="rounded-[22px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700">{errorMsg}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,360px)]">
        <div className="app-surface p-5 sm:p-6">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">{copy.newTaskKicker}</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{copy.newTaskTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {copy.newTaskHintPrefix} <strong>{taskCategoryLabel(null, locale)}</strong>.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.titleLabel}</label>
              <input className="app-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={copy.titlePlaceholder} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.category}</label>
              <input
                className="app-input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder={copy.categoryPlaceholder}
                list="task-categories"
              />
              <datalist id="task-categories">
                {categoryOptions.filter((item) => item.value !== "__uncategorized__").map((item) => <option key={item.label} value={item.label} />)}
              </datalist>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.priority}</label>
              <select className="app-select" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
                <option value="low">{copy.low}</option>
                <option value="medium">{copy.medium}</option>
                <option value="high">{copy.high}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.initialStatus}</label>
              <p className="mb-3 text-sm text-slate-500">{copy.initialStatusHint}</p>
              <TaskStatusControl value={taskStatus} onChange={setTaskStatus} />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.notes}</label>
              <textarea className="app-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={copy.notesPlaceholder} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.type}</label>
              <select className="app-select" value={taskType} onChange={(event) => setTaskType(event.target.value as TaskType)}>
                <option value="due">{copy.dueType}</option>
                <option value="scheduled">{copy.scheduledType}</option>
                <option value="anytime">{copy.flexibleType}</option>
              </select>
            </div>

            {taskType === "due" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.dateLimit}</label>
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

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={createTask} className="app-btn app-btn-primary w-full sm:w-auto">{copy.createTask}</button>

            <div className="text-sm text-slate-500">
              {copy.activeFilter}: <span className="font-semibold text-slate-700">{buildStatusFilterLabel(statusFilter, locale)} {locale === "en" ? "in" : "em"} {buildCategoryFilterLabel(safeCategoryFilter, locale)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {renderAgendaList({ title: copy.today, subtitle: `${agenda.todayList.length} ${moreCopy.todaySubtitle}`, items: agenda.todayList, router, locale })}
          {renderAgendaList({ title: copy.tomorrow, subtitle: `${agenda.tomorrowList.length} ${moreCopy.tomorrowSubtitle}`, items: agenda.tomorrowList, router, locale })}
        </div>
      </section>

      <section className="app-page">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-300">{moreCopy.smartList}</span>
            <h2 className="mt-2 text-2xl font-semibold text-white">{moreCopy.groupedTitle}</h2>
          </div>

          <div className="text-sm text-slate-300">
            {visibleTasks.length} {moreCopy.tasksSummary} {locale === "en" ? "in" : "em"} <span className="font-semibold text-white">{groupedTasks.length}</span> {moreCopy.groupsSummary}
          </div>
        </div>

        {groupedTasks.length === 0 ? <div className="app-surface p-8 text-center text-slate-500">{moreCopy.noTasks}</div> : null}

        {groupedTasks.map((group) => (
          <section key={group.key} className="app-surface overflow-hidden" style={{ borderColor: group.palette.border, boxShadow: group.palette.glow }}>
            <div className="border-b px-5 py-4" style={{ background: group.palette.soft, borderColor: group.palette.border }}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.palette.accent }} />
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: group.palette.strongText }}>{group.label}</h3>
                    <p className="text-sm text-slate-600">
                      {group.tasks.length} {moreCopy.inGroup}
                      {group.overdueCount > 0 ? (locale === "en" ? ` - ${group.overdueCount} overdue` : ` - ${group.overdueCount} vencida(s)`) : ""}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-slate-600">
                  {moreCopy.firstItem}: <span className="font-semibold text-slate-900">{group.tasks[0].task_type === "due" && group.tasks[0].due_date ? formatTaskDateBR(group.tasks[0].due_date, locale) : group.tasks[0].task_type === "scheduled" && group.tasks[0].scheduled_at ? formatTaskDateTimeBR(group.tasks[0].scheduled_at, locale) : moreCopy.noDate}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-5 2xl:grid-cols-2">
              {group.tasks.map((task) => renderTaskCard({ task, palette: group.palette, router, onStatusChange: updateTaskStatus, onRemoveTask: removeTask, locale }))}
            </div>
          </section>
        ))}
      </section>
    </div>
  );
}
