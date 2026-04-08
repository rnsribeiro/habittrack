"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PeriodControls } from "@/components/PeriodControls";
import { HabitMultiMonthGrid } from "@/components/habits/HabitMultiMonthGrid";
import { HabitRangeGrid } from "@/components/habits/HabitRangeGrid";
import { getErrorMessage } from "@/lib/errors";
import { downloadHabitMonthExport, type HabitMonthExportFormat } from "@/lib/habit-export";
import { useI18n } from "@/lib/i18n";
import { intlLocale } from "@/lib/locale";
import { nextHabitCompletionStatus, type HabitCompletionMap } from "@/lib/habits";
import type { Habit, HabitCompletion, HabitCompletionStatus } from "@/lib/types";
import type { Period } from "@/src/lib/period";
import { getPeriodRange, shiftAnchor, toISODate } from "@/src/lib/period";
import { apiFetch } from "@/src/lib/api";
import { useRequireSession } from "@/src/lib/useRequireSession";

export default function HabitsViewPage() {
  const { ready } = useRequireSession("/login");
  const { locale } = useI18n();

  const copy =
    locale === "en"
      ? {
          loading: "Loading...",
          title: "Overview",
          subtitle: "Click dates up to today to switch between done, partial, and clear.",
          compactHint: "On smaller screens, the view stays focused on one week at a time for better readability.",
          done: "Done",
          partial: "Partial",
          future: "Future or empty",
          emptyTitle: "No habits yet",
          emptyDescription: "Create your first habit to start tracking progress here day by day.",
          emptyAction: "Create habit",
          emptyManageHint: "You can add it from the Manage page in a few seconds.",
          exportKicker: "Monthly export",
          exportTitle: "Generate an image from the selected month",
          exportMonth: "The file uses the current anchor month",
          generating: "Generating",
          preparing: "Preparing month data for export...",
          createFirst: "Create at least one habit to unlock export.",
          exportHint: "The export includes the full month table, even when the current view is showing a week.",
          errors: {
            habits: "Could not load habits.",
            completions: "Could not load completions.",
            exportMonth: "Could not load the month for export.",
            markHabit: "Could not update the habit mark.",
            exportTable: "Could not export the month table.",
          },
        }
      : {
          loading: "Carregando...",
          title: "Visualizacao",
          subtitle: "Clique nas datas ate hoje para alternar entre concluido, parcial e limpar.",
          compactHint: "Em telas menores, a visualizacao fica focada em semanas para melhorar a leitura.",
          done: "Concluido",
          partial: "Parcial",
          future: "Futuro ou vazio",
          emptyTitle: "Nenhum habito cadastrado",
          emptyDescription: "Crie seu primeiro habito para acompanhar o progresso aqui dia a dia.",
          emptyAction: "Cadastrar habito",
          emptyManageHint: "Voce pode adicionar isso pela tela Gerenciar em poucos segundos.",
          exportKicker: "Exportacao mensal",
          exportTitle: "Gerar imagem da tabela do mes escolhido",
          exportMonth: "O arquivo usa o mes da ancora atual",
          generating: "Gerando",
          preparing: "Preparando os dados do mes para exportacao...",
          createFirst: "Crie pelo menos um habito para liberar a exportacao.",
          exportHint: "A exportacao inclui a tabela completa do mes, mesmo quando a visualizacao atual estiver em semana.",
          errors: {
            habits: "Erro ao carregar habitos.",
            completions: "Erro ao carregar marcacoes.",
            exportMonth: "Erro ao carregar o mes para exportacao.",
            markHabit: "Erro ao marcar habito.",
            exportTable: "Erro ao exportar a tabela do mes.",
          },
        };

  const [habits, setHabits] = useState<Habit[]>([]);
  const [completionMap, setCompletionMap] = useState<HabitCompletionMap>({});
  const [exportCompletionMap, setExportCompletionMap] = useState<HabitCompletionMap>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<HabitMonthExportFormat | null>(null);
  const [loadingExportMonth, setLoadingExportMonth] = useState(false);

  const [period, setPeriod] = useState<Period>("month");
  const [isCompact, setIsCompact] = useState(false);
  const [anchor, setAnchor] = useState<Date>(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsCompact(media.matches);

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const effectivePeriod = isCompact ? "week" : period;
  const range = useMemo(() => getPeriodRange(anchor, effectivePeriod), [anchor, effectivePeriod]);
  const exportMonthAnchor = useMemo(() => new Date(anchor.getFullYear(), anchor.getMonth(), 1), [anchor]);
  const exportMonthRange = useMemo(() => getPeriodRange(exportMonthAnchor, "month"), [exportMonthAnchor]);
  const exportMonthStartISO = useMemo(() => toISODate(exportMonthRange.start), [exportMonthRange.start]);
  const exportMonthEndISO = useMemo(() => toISODate(exportMonthRange.end), [exportMonthRange.end]);
  const exportMonthLabel = useMemo(
    () => new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(exportMonthAnchor),
    [exportMonthAnchor, locale]
  );

  useEffect(() => {
    if (!ready) return;

    (async () => {
      setErrorMsg(null);
      try {
        const response = await apiFetch("/api/habits");
        setHabits(response.habits ?? []);
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error, copy.errors.habits));
      }
    })();
  }, [copy.errors.habits, ready]);

  useEffect(() => {
    if (!ready) return;

    (async () => {
      setErrorMsg(null);
      try {
        const startISO = toISODate(range.start);
        const endISO = toISODate(range.end);
        const response = await apiFetch(`/api/completions/list?start=${startISO}&end=${endISO}`);

        const map: HabitCompletionMap = {};
        for (const row of (response.completions ?? []) as HabitCompletion[]) {
          map[`${row.habit_id}:${row.date}`] = row.status;
        }
        setCompletionMap(map);
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error, copy.errors.completions));
      }
    })();
  }, [copy.errors.completions, range.end, range.start, ready]);

  useEffect(() => {
    if (!ready) return;

    (async () => {
      setLoadingExportMonth(true);
      try {
        const startISO = toISODate(exportMonthRange.start);
        const endISO = toISODate(exportMonthRange.end);
        const response = await apiFetch(`/api/completions/list?start=${startISO}&end=${endISO}`);

        const map: HabitCompletionMap = {};
        for (const row of (response.completions ?? []) as HabitCompletion[]) {
          map[`${row.habit_id}:${row.date}`] = row.status;
        }
        setExportCompletionMap(map);
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error, copy.errors.exportMonth));
      } finally {
        setLoadingExportMonth(false);
      }
    })();
  }, [copy.errors.exportMonth, exportMonthRange.end, exportMonthRange.start, ready]);

  async function toggle(habitId: string, dateISO: string) {
    setErrorMsg(null);

    const key = `${habitId}:${dateISO}`;
    const belongsToExportMonth = dateISO >= exportMonthStartISO && dateISO <= exportMonthEndISO;
    const previousStatus = completionMap[key] ?? null;
    const nextStatus = nextHabitCompletionStatus(previousStatus);

    setCompletionMap((current) => {
      const copyMap = { ...current };
      if (nextStatus) copyMap[key] = nextStatus;
      else delete copyMap[key];
      return copyMap;
    });

    if (belongsToExportMonth) {
      setExportCompletionMap((current) => {
        const copyMap = { ...current };
        if (nextStatus) copyMap[key] = nextStatus;
        else delete copyMap[key];
        return copyMap;
      });
    }

    try {
      const response = await apiFetch("/api/completions", {
        method: "POST",
        body: JSON.stringify({ habit_id: habitId, date: dateISO, status: nextStatus }),
      });

      setCompletionMap((current) => {
        const copyMap = { ...current };
        const persistedStatus = (response.status ?? null) as HabitCompletionStatus | null;
        if (persistedStatus) copyMap[key] = persistedStatus;
        else delete copyMap[key];
        return copyMap;
      });

      if (belongsToExportMonth) {
        setExportCompletionMap((current) => {
          const copyMap = { ...current };
          const persistedStatus = (response.status ?? null) as HabitCompletionStatus | null;
          if (persistedStatus) copyMap[key] = persistedStatus;
          else delete copyMap[key];
          return copyMap;
        });
      }
    } catch (error: unknown) {
      setCompletionMap((current) => {
        const copyMap = { ...current };
        if (previousStatus) copyMap[key] = previousStatus;
        else delete copyMap[key];
        return copyMap;
      });

      if (belongsToExportMonth) {
        setExportCompletionMap((current) => {
          const copyMap = { ...current };
          if (previousStatus) copyMap[key] = previousStatus;
          else delete copyMap[key];
          return copyMap;
        });
      }

      setErrorMsg(getErrorMessage(error, copy.errors.markHabit));
    }
  }

  async function handleExport(format: HabitMonthExportFormat) {
    if (!habits.length || loadingExportMonth) return;

    setErrorMsg(null);
    setExportingFormat(format);

    try {
      await downloadHabitMonthExport({
        anchor: exportMonthAnchor,
        habits,
        completionMap: exportCompletionMap,
        format,
        locale,
      });
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, copy.errors.exportTable));
    } finally {
      setExportingFormat(null);
    }
  }

  const isMultiMonth = effectivePeriod === "quarter" || effectivePeriod === "semester" || effectivePeriod === "year";

  if (!ready) return <div className="p-6 text-sm text-zinc-600">{copy.loading}</div>;

  return (
    <div className="space-y-4 p-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{copy.title}</h1>
            <p className="text-sm text-zinc-500">{copy.subtitle}</p>
            {isCompact ? <p className="mt-2 text-sm text-zinc-500">{copy.compactHint}</p> : null}
          </div>
        </div>

        {habits.length === 0 ? (
          <div className="app-surface px-5 py-6 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-xl font-semibold text-slate-900">{copy.emptyTitle}</h2>
                <p className="mt-2 text-sm text-slate-600">{copy.emptyDescription}</p>
                <p className="mt-1 text-sm text-slate-500">{copy.emptyManageHint}</p>
              </div>

              <Link href="/manage#new-habit" className="app-btn app-btn-primary">
                {copy.emptyAction}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="app-surface px-4 py-4">
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-[6px] border border-transparent bg-emerald-500 text-[10px] font-bold text-white">
                    {"\u2713"}
                  </span>
                  {copy.done}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-[6px] border border-emerald-500"
                    style={{ background: "linear-gradient(90deg, #22c55e 50%, rgba(255,255,255,0.92) 50%)" }}
                  />
                  {copy.partial}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded-[6px] border border-zinc-400 bg-transparent" />
                  {copy.future}
                </span>
              </div>
            </div>

            <PeriodControls
              period={effectivePeriod}
              anchor={anchor}
              onPeriodChange={(nextPeriod) => {
                if (isCompact) return;
                setPeriod(nextPeriod);
                const nextDate = new Date();
                nextDate.setHours(0, 0, 0, 0);
                setAnchor(nextDate);
              }}
              onPrev={() => setAnchor((current) => shiftAnchor(current, effectivePeriod, -1))}
              onNext={() => setAnchor((current) => shiftAnchor(current, effectivePeriod, 1))}
              onToday={() => {
                const nextDate = new Date();
                nextDate.setHours(0, 0, 0, 0);
                setAnchor(nextDate);
              }}
              showPeriodSelect={!isCompact}
              availablePeriods={isCompact ? ["week"] : undefined}
            />

            <div className="app-surface px-4 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">{copy.exportKicker}</div>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">{copy.exportTitle}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {copy.exportMonth}: <span className="font-semibold capitalize text-slate-900">{exportMonthLabel}</span>.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(["svg", "png", "pdf"] as HabitMonthExportFormat[]).map((format) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => handleExport(format)}
                      disabled={!habits.length || loadingExportMonth || exportingFormat !== null}
                      className={`app-btn ${format === "pdf" ? "app-btn-primary" : "app-btn-secondary"}`}
                    >
                      {exportingFormat === format ? `${copy.generating} ${format.toUpperCase()}...` : format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 text-sm text-slate-500">
                {loadingExportMonth ? copy.preparing : habits.length === 0 ? copy.createFirst : copy.exportHint}
              </div>
            </div>
          </>
        )}
      </div>

      {errorMsg ? <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm">{errorMsg}</div> : null}

      {habits.length > 0
        ? isMultiMonth ? (
            <HabitMultiMonthGrid
              habits={habits}
              completionMap={completionMap}
              start={range.start}
              end={range.end}
              onToggle={toggle}
              mode={effectivePeriod as "quarter" | "semester" | "year"}
            />
          ) : (
            <HabitRangeGrid
              habits={habits}
              completionMap={completionMap}
              start={range.start}
              end={range.end}
              onToggle={toggle}
              compact={isCompact}
            />
          )
        : null}
    </div>
  );
}
