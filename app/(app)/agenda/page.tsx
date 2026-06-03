"use client";

import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { intlLocale } from "@/lib/locale";
import type { CalendarEvent, CalendarEventStatus } from "@/lib/types";
import { apiFetch } from "@/src/lib/api";
import { useRequireSession } from "@/src/lib/useRequireSession";

type CalendarView = "month" | "week" | "day";

const COLORS = [
  "#22c55e",
  "#38bdf8",
  "#8b5cf6",
  "#f97316",
  "#ef4444",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#64748b",
  "#111827",
];

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + mondayOffset);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateTimeInputValue(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${toDateInputValue(date)}T${hours}:${minutes}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function eventStartsOnDay(event: CalendarEvent, day: Date) {
  return sameDay(new Date(event.start_at), day);
}

function statusLabel(status: CalendarEventStatus, locale: "pt" | "en") {
  if (locale === "en") {
    return status === "done" ? "Done" : status === "canceled" ? "Canceled" : "Planned";
  }
  return status === "done" ? "Concluida" : status === "canceled" ? "Cancelada" : "Planejada";
}

function formatEventTime(event: CalendarEvent, locale: "pt" | "en") {
  if (event.all_day) return locale === "en" ? "All day" : "Dia inteiro";

  const formatter = new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit" });
  const start = formatter.format(new Date(event.start_at));
  const end = event.end_at ? formatter.format(new Date(event.end_at)) : null;
  return end ? `${start} - ${end}` : start;
}

function getRange(view: CalendarView, anchorDate: Date) {
  if (view === "day") {
    const start = startOfDay(anchorDate);
    return { start, end: addDays(start, 1) };
  }

  if (view === "week") {
    const start = startOfWeek(anchorDate);
    return { start, end: addDays(start, 7) };
  }

  const firstOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const start = startOfWeek(firstOfMonth);
  return { start, end: addDays(start, 42) };
}

function getPeriodTitle(view: CalendarView, anchorDate: Date, locale: "pt" | "en") {
  if (view === "day") {
    return new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "2-digit", month: "long" }).format(anchorDate);
  }

  if (view === "week") {
    const start = startOfWeek(anchorDate);
    const end = addDays(start, 6);
    const formatter = new Intl.DateTimeFormat(intlLocale(locale), { day: "2-digit", month: "short" });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }

  return new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(anchorDate);
}

function buildMonthDays(anchorDate: Date) {
  const firstOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const start = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function shiftDate(view: CalendarView, anchorDate: Date, direction: -1 | 1) {
  if (view === "day") return addDays(anchorDate, direction);
  if (view === "week") return addDays(anchorDate, direction * 7);
  return addMonths(anchorDate, direction);
}

function eventTone(status: CalendarEventStatus) {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "canceled") return "border-slate-200 bg-slate-100 text-slate-500";
  return "border-slate-200 bg-white text-slate-800";
}

export default function AgendaPage() {
  const { ready } = useRequireSession("/login");
  const { locale } = useI18n();

  const copy =
    locale === "en"
      ? {
          loading: "Loading...",
          kicker: "Calendar agenda",
          title: "Plan activities by day, week, and month",
          subtitle: "Create commitments with time, duration, category, location, and status in a calendar-style workflow.",
          month: "Month",
          week: "Week",
          day: "Day",
          today: "Today",
          previous: "Previous",
          next: "Next",
          newActivity: "New activity",
          editActivity: "Edit activity",
          close: "Close",
          titleLabel: "Title",
          titlePlaceholder: "Example: Training, study block, client call",
          category: "Category",
          categoryPlaceholder: "Work, Health, Study",
          location: "Location",
          locationPlaceholder: "Office, home, online",
          notes: "Notes",
          notesPlaceholder: "Context, preparation, or links.",
          starts: "Starts",
          ends: "Ends",
          allDay: "All day",
          color: "Color",
          create: "Create activity",
          save: "Save changes",
          cancelEdit: "Cancel edit",
          selectedDay: "Selected day",
          periodActivities: "Period activities",
          noActivities: "No activities here yet.",
          done: "Done",
          reopen: "Reopen",
          cancel: "Cancel",
          delete: "Delete",
          editActions: "Activity actions",
          confirmDelete: "Delete this activity?",
          errors: {
            load: "Could not load agenda.",
            title: "Please enter a title.",
            start: "Please enter a valid start date.",
            end: "End must be after start.",
            create: "Could not create activity.",
            update: "Could not update activity.",
            remove: "Could not delete activity.",
          },
        }
      : {
          loading: "Carregando...",
          kicker: "Agenda calendario",
          title: "Planeje atividades por dia, semana e mes",
          subtitle: "Crie compromissos com horario, duracao, categoria, local e status em um fluxo parecido com calendario.",
          month: "Mes",
          week: "Semana",
          day: "Dia",
          today: "Hoje",
          previous: "Anterior",
          next: "Proximo",
          newActivity: "Nova atividade",
          editActivity: "Editar atividade",
          close: "Fechar",
          titleLabel: "Titulo",
          titlePlaceholder: "Ex: Treino, bloco de estudo, reuniao com cliente",
          category: "Categoria",
          categoryPlaceholder: "Trabalho, Saude, Estudos",
          location: "Local",
          locationPlaceholder: "Escritorio, casa, online",
          notes: "Notas",
          notesPlaceholder: "Contexto, preparacao ou links.",
          starts: "Inicio",
          ends: "Fim",
          allDay: "Dia inteiro",
          color: "Cor",
          create: "Criar atividade",
          save: "Salvar alteracoes",
          cancelEdit: "Cancelar edicao",
          selectedDay: "Dia selecionado",
          periodActivities: "Atividades do periodo",
          noActivities: "Nenhuma atividade aqui por enquanto.",
          done: "Concluir",
          reopen: "Reabrir",
          cancel: "Cancelar",
          delete: "Excluir",
          editActions: "Acoes da atividade",
          confirmDelete: "Excluir esta atividade?",
          errors: {
            load: "Erro ao carregar agenda.",
            title: "Informe um titulo.",
            start: "Informe uma data de inicio valida.",
            end: "O fim deve ser depois do inicio.",
            create: "Erro ao criar atividade.",
            update: "Erro ao atualizar atividade.",
            remove: "Erro ao excluir atividade.",
          },
        };

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<CalendarView>("day");
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [startAt, setStartAt] = useState(() => toDateTimeInputValue(new Date()));
  const [endAt, setEndAt] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState(COLORS[0]);

  const range = useMemo(() => getRange(view, anchorDate), [anchorDate, view]);
  const monthDays = useMemo(() => buildMonthDays(anchorDate), [anchorDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(anchorDate), index)), [anchorDate]);
  const visibleDays = useMemo(() => {
    if (view === "month") return monthDays;
    if (view === "week") return weekDays;
    return [anchorDate];
  }, [anchorDate, monthDays, view, weekDays]);

  const periodEvents = useMemo(
    () =>
      [...events].sort((a, b) => {
        const diff = new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
        return diff || a.title.localeCompare(b.title, intlLocale(locale));
      }),
    [events, locale]
  );

  const selectedEvents = useMemo(
    () => periodEvents.filter((event) => eventStartsOnDay(event, selectedDate)),
    [periodEvents, selectedDate]
  );

  const stats = useMemo(() => {
    const planned = periodEvents.filter((event) => event.status === "planned").length;
    const done = periodEvents.filter((event) => event.status === "done").length;
    const canceled = periodEvents.filter((event) => event.status === "canceled").length;
    return { planned, done, canceled };
  }, [periodEvents]);

  useEffect(() => {
    if (!ready) return;

    (async () => {
      setErrorMsg(null);
      try {
        const params = new URLSearchParams({
          start: range.start.toISOString(),
          end: range.end.toISOString(),
        });
        const response = await apiFetch(`/api/calendar-events?${params.toString()}`);
        setEvents(response.events ?? []);
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error, copy.errors.load));
      }
    })();
  }, [copy.errors.load, range.end, range.start, ready]);

  function resetForm(date = selectedDate) {
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);

    setEditing(null);
    setTitle("");
    setCategory("");
    setLocation("");
    setNotes("");
    setStartAt(toDateTimeInputValue(start));
    setEndAt(toDateTimeInputValue(end));
    setAllDay(false);
    setColor(COLORS[0]);
  }

  function selectDay(date: Date) {
    const normalized = startOfDay(date);
    setSelectedDate(normalized);
    if (view === "day") setAnchorDate(normalized);
    if (!editing) resetForm(normalized);
  }

  function changeView(nextView: CalendarView) {
    setView(nextView);
    if (nextView === "day") {
      const normalized = startOfDay(anchorDate);
      setSelectedDate(normalized);
      if (!editing) resetForm(normalized);
    }
  }

  function movePeriod(direction: -1 | 1) {
    const nextDate = startOfDay(shiftDate(view, anchorDate, direction));
    setAnchorDate(nextDate);

    if (view === "day") {
      setSelectedDate(nextDate);
      if (!editing) resetForm(nextDate);
    }
  }

  function startEditing(event: CalendarEvent) {
    setSelectedDate(startOfDay(new Date(event.start_at)));
    setEditing(event);
    setTitle(event.title);
    setCategory(event.category ?? "");
    setLocation(event.location ?? "");
    setNotes(event.notes ?? "");
    setStartAt(toDateTimeInputValue(new Date(event.start_at)));
    setEndAt(event.end_at ? toDateTimeInputValue(new Date(event.end_at)) : "");
    setAllDay(event.all_day);
    setColor(event.color);
  }

  async function submitEvent() {
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg(copy.errors.title);
      return;
    }

    const start = new Date(startAt);
    if (Number.isNaN(start.getTime())) {
      setErrorMsg(copy.errors.start);
      return;
    }

    const end = endAt ? new Date(endAt) : null;
    if (end && end.getTime() <= start.getTime()) {
      setErrorMsg(copy.errors.end);
      return;
    }

    const payload = {
      title: title.trim(),
      category: category.trim() || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
      start_at: allDay ? startOfDay(start).toISOString() : start.toISOString(),
      end_at: end ? (allDay ? endOfDay(end).toISOString() : end.toISOString()) : null,
      all_day: allDay,
      color,
    };

    try {
      if (editing) {
        const response = await apiFetch(`/api/calendar-events/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setEvents((current) => current.map((event) => (event.id === editing.id ? response.event : event)));
      } else {
        const response = await apiFetch("/api/calendar-events", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setEvents((current) => [...current, response.event]);
      }

      resetForm(selectedDate);
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, editing ? copy.errors.update : copy.errors.create));
    }
  }

  async function updateStatus(event: CalendarEvent, status: CalendarEventStatus) {
    const snapshot = events;
    setEvents((current) => current.map((item) => (item.id === event.id ? { ...item, status } : item)));

    try {
      const response = await apiFetch(`/api/calendar-events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setEvents((current) => current.map((item) => (item.id === event.id ? response.event : item)));
      setEditing((current) => (current?.id === event.id ? response.event : current));
    } catch (error: unknown) {
      setEvents(snapshot);
      setErrorMsg(getErrorMessage(error, copy.errors.update));
    }
  }

  async function removeEvent(event: CalendarEvent) {
    if (!confirm(copy.confirmDelete)) return;

    const snapshot = events;
    setEvents((current) => current.filter((item) => item.id !== event.id));

    try {
      await apiFetch(`/api/calendar-events/${event.id}`, { method: "DELETE" });
      if (editing?.id === event.id) resetForm(selectedDate);
    } catch (error: unknown) {
      setEvents(snapshot);
      setErrorMsg(getErrorMessage(error, copy.errors.remove));
    }
  }

  function renderEventCard(event: CalendarEvent) {
    return (
      <article
        key={event.id}
        role="button"
        tabIndex={0}
        onClick={() => startEditing(event)}
        onKeyDown={(keyboardEvent) => {
          if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
            keyboardEvent.preventDefault();
            startEditing(event);
          }
        }}
        className={`flex h-full cursor-pointer flex-col rounded-[18px] border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${eventTone(event.status)}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`text-left text-sm font-semibold hover:text-emerald-700 ${event.status === "canceled" ? "line-through" : ""}`}>
              {event.title}
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500">{formatEventTime(event, locale)}</div>
          </div>
          <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 font-semibold">{statusLabel(event.status, locale)}</span>
          {event.category ? <span className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1">{event.category}</span> : null}
          {event.location ? <span className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1">{event.location}</span> : null}
        </div>

        {event.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{event.notes}</p> : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          {event.status === "done" ? (
            <button className="app-btn app-btn-secondary min-h-0 px-3 py-1.5 text-xs" onClick={(clickEvent) => { clickEvent.stopPropagation(); updateStatus(event, "planned"); }}>
              {copy.reopen}
            </button>
          ) : (
            <button className="app-btn app-btn-primary min-h-0 px-3 py-1.5 text-xs" onClick={(clickEvent) => { clickEvent.stopPropagation(); updateStatus(event, "done"); }}>
              {copy.done}
            </button>
          )}
          <button className="app-btn app-btn-secondary min-h-0 px-3 py-1.5 text-xs" onClick={(clickEvent) => { clickEvent.stopPropagation(); updateStatus(event, "canceled"); }}>
            {copy.cancel}
          </button>
          <button className="app-btn app-btn-danger min-h-0 px-3 py-1.5 text-xs" onClick={(clickEvent) => { clickEvent.stopPropagation(); removeEvent(event); }}>
            {copy.delete}
          </button>
        </div>
      </article>
    );
  }

  if (!ready) return <div className="p-6 text-sm text-slate-300">{copy.loading}</div>;

  return (
    <div className="app-page pb-4">
      <section className="app-surface-dark overflow-hidden p-5 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <span className="app-kicker">{copy.kicker}</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.title}</h1>
            <p className="app-subtle-dark mt-3 max-w-2xl text-sm leading-6 sm:text-base">{copy.subtitle}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[28rem]">
            <div className="rounded-[20px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{statusLabel("planned", locale)}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{stats.planned}</div>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{statusLabel("done", locale)}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{stats.done}</div>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{statusLabel("canceled", locale)}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{stats.canceled}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["month", "week", "day"] as CalendarView[]).map((item) => (
              <button key={item} className={`app-chip ${view === item ? "app-chip-active" : "app-chip-muted"}`} onClick={() => changeView(item)}>
                {item === "month" ? copy.month : item === "week" ? copy.week : copy.day}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button className="app-btn app-btn-secondary" onClick={() => movePeriod(-1)}>
              {copy.previous}
            </button>
            <button
              className="app-btn app-btn-primary"
              onClick={() => {
                const today = startOfDay(new Date());
                setAnchorDate(today);
                setSelectedDate(today);
                resetForm(today);
              }}
            >
              {copy.today}
            </button>
            <button className="app-btn app-btn-secondary" onClick={() => movePeriod(1)}>
              {copy.next}
            </button>
          </div>
        </div>

        <div className="mt-5 text-xl font-semibold capitalize text-white">{getPeriodTitle(view, anchorDate, locale)}</div>
      </section>

      {errorMsg ? <div className="rounded-[22px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700">{errorMsg}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="app-surface overflow-hidden">
          {view === "month" ? (
            <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/80 text-center text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="px-2 py-3">
                  {new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short" }).format(day)}
                </div>
              ))}
            </div>
          ) : null}

          <div className={view === "month" ? "grid grid-cols-1 sm:grid-cols-7" : "grid grid-cols-1 md:grid-cols-7"}>
            {visibleDays.map((day) => {
              const dayEvents = periodEvents.filter((event) => eventStartsOnDay(event, day));
              const outsideMonth = view === "month" && day.getMonth() !== anchorDate.getMonth();
              const selected = sameDay(day, selectedDate);

              return (
                <div
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectDay(day)}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                      keyboardEvent.preventDefault();
                      selectDay(day);
                    }
                  }}
                  className={`min-h-[9.5rem] border-b border-r border-slate-200/70 p-3 text-left transition hover:bg-emerald-50/70 ${
                    selected ? "bg-emerald-50" : outsideMonth ? "bg-slate-50/70 text-slate-400" : "bg-white/70 text-slate-900"
                  } ${view === "day" ? "md:col-span-7" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${sameDay(day, new Date()) ? "bg-emerald-600 text-white" : "bg-white/80 text-slate-700"}`}>
                      {day.getDate()}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{dayEvents.length}</span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {dayEvents.slice(0, view === "month" ? 3 : 8).map((event) => (
                      <div
                        key={event.id}
                        role="button"
                        tabIndex={0}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          startEditing(event);
                        }}
                        onKeyDown={(keyboardEvent) => {
                          if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                            keyboardEvent.preventDefault();
                            keyboardEvent.stopPropagation();
                            startEditing(event);
                          }
                        }}
                        className="truncate rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
                      >
                        <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: event.color }} />
                        <span className={event.status === "canceled" ? "line-through" : ""}>{formatEventTime(event, locale)} {event.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > (view === "month" ? 3 : 8) ? (
                      <div className="text-xs font-semibold text-slate-500">+{dayEvents.length - (view === "month" ? 3 : 8)}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="app-surface p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">{copy.newActivity}</div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.titleLabel}</label>
                <input className="app-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={copy.titlePlaceholder} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{copy.starts}</label>
                  <input type="datetime-local" className="app-input" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{copy.ends}</label>
                  <input type="datetime-local" className="app-input" value={endAt} onChange={(event) => setEndAt(event.target.value)} />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} className="h-4 w-4" />
                {copy.allDay}
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.category}</label>
                <input className="app-input" value={category} onChange={(event) => setCategory(event.target.value)} placeholder={copy.categoryPlaceholder} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.location}</label>
                <input className="app-input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder={copy.locationPlaceholder} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.notes}</label>
                <textarea className="app-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={copy.notesPlaceholder} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.color}</label>
                <div className="flex gap-2 overflow-x-auto rounded-[18px] border border-slate-200 bg-white/70 p-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {COLORS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setColor(item)}
                      className={`h-10 w-10 shrink-0 rounded-full border-2 ${color === item ? "border-slate-900" : "border-white"}`}
                      style={{ backgroundColor: item }}
                      aria-label={item}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button className="app-btn app-btn-primary w-full" onClick={submitEvent}>
                  {copy.create}
                </button>
              </div>
            </div>
          </section>

          <section className="app-surface overflow-hidden">
            <div className="border-b border-slate-200/70 px-5 py-4">
              <div className="text-base font-semibold text-slate-900">{copy.selectedDay}</div>
              <div className="mt-1 text-sm capitalize text-slate-500">
                {new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "2-digit", month: "long" }).format(selectedDate)}
              </div>
            </div>
            <div className="space-y-3 p-4">
              {selectedEvents.length === 0 ? <div className="py-4 text-sm text-slate-500">{copy.noActivities}</div> : selectedEvents.map(renderEventCard)}
            </div>
          </section>
        </aside>
      </section>

      <section className="app-surface overflow-hidden">
        <div className="border-b border-slate-200/70 px-5 py-4">
          <div className="text-base font-semibold text-slate-900">{copy.periodActivities}</div>
          <div className="mt-1 text-sm text-slate-500">{periodEvents.length} {locale === "en" ? "activity(s)" : "atividade(s)"}</div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {periodEvents.length === 0 ? <div className="text-sm text-slate-500">{copy.noActivities}</div> : periodEvents.map(renderEventCard)}
        </div>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/72 px-3 py-4 backdrop-blur-sm">
          <section className="app-surface flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 px-5 pt-5">
                <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">{copy.editActivity}</div>
                <h2 className="mt-1 truncate text-xl font-semibold text-slate-900">{editing.title}</h2>
              </div>
              <button className="app-btn app-btn-secondary mr-5 mt-5 min-h-0 shrink-0 px-3 py-2 text-sm" onClick={() => resetForm(selectedDate)}>
                {copy.close}
              </button>
            </div>

            <div className="mt-4 grid flex-1 gap-3 overflow-y-auto px-5 pb-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.titleLabel}</label>
                <input className="app-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={copy.titlePlaceholder} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.starts}</label>
                <input type="datetime-local" className="app-input" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.ends}</label>
                <input type="datetime-local" className="app-input" value={endAt} onChange={(event) => setEndAt(event.target.value)} />
              </div>

              <label className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-2">
                <input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} className="h-4 w-4" />
                {copy.allDay}
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.category}</label>
                <input className="app-input" value={category} onChange={(event) => setCategory(event.target.value)} placeholder={copy.categoryPlaceholder} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.location}</label>
                <input className="app-input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder={copy.locationPlaceholder} />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.notes}</label>
                <textarea className="app-textarea min-h-[5.5rem]" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={copy.notesPlaceholder} />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.color}</label>
                <div className="grid grid-cols-8 gap-2 rounded-[18px] border border-slate-200 bg-white/70 p-3 sm:grid-cols-16">
                  {COLORS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setColor(item)}
                      className={`h-8 w-8 rounded-full border-2 ${color === item ? "border-slate-900" : "border-white"}`}
                      style={{ backgroundColor: item }}
                      aria-label={item}
                    />
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <button className="app-btn app-btn-primary w-full" onClick={submitEvent}>
                    {copy.save}
                  </button>
                  <button className="app-btn app-btn-secondary w-full" onClick={() => resetForm(selectedDate)}>
                    {copy.cancelEdit}
                  </button>
                </div>

                <div className="mt-3 rounded-[18px] border border-slate-200 bg-white/80 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{copy.editActions}</div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {editing.status === "done" ? (
                      <button className="app-btn app-btn-secondary min-h-0 w-full py-2 text-sm" onClick={() => updateStatus(editing, "planned")}>
                        {copy.reopen}
                      </button>
                    ) : (
                      <button className="app-btn app-btn-primary min-h-0 w-full py-2 text-sm" onClick={() => updateStatus(editing, "done")}>
                        {copy.done}
                      </button>
                    )}
                    <button className="app-btn app-btn-secondary min-h-0 w-full py-2 text-sm" onClick={() => updateStatus(editing, "canceled")}>
                      {copy.cancel}
                    </button>
                    <button className="app-btn app-btn-danger min-h-0 w-full py-2 text-sm" onClick={() => removeEvent(editing)}>
                      {copy.delete}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
