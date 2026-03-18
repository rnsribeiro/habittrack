"use client";

import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { downloadHabitMonthExport, type HabitMonthExportFormat } from "@/lib/habit-export";
import { nextHabitCompletionStatus, type HabitCompletionMap } from "@/lib/habits";
import type { Habit, HabitCompletion, HabitCompletionStatus } from "@/lib/types";
import { apiFetch } from "@/src/lib/api";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { PeriodControls } from "@/components/PeriodControls";
import type { Period } from "@/src/lib/period";
import { getPeriodRange, shiftAnchor, toISODate } from "@/src/lib/period";
import { HabitRangeGrid } from "@/components/habits/HabitRangeGrid";
import { HabitMultiMonthGrid } from "@/components/habits/HabitMultiMonthGrid";

export default function HabitsViewPage() {
  const { ready } = useRequireSession("/login");

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
    () => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(exportMonthAnchor),
    [exportMonthAnchor]
  );

  useEffect(() => {
    if (!ready) return;

    (async () => {
      setErrorMsg(null);
      try {
        const response = await apiFetch("/api/habits");
        setHabits(response.habits ?? []);
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error, "Erro ao carregar habitos."));
      }
    })();
  }, [ready]);

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
        setErrorMsg(getErrorMessage(error, "Erro ao carregar marcacoes."));
      }
    })();
  }, [range.end, range.start, ready]);

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
        setErrorMsg(getErrorMessage(error, "Erro ao carregar o mes para exportacao."));
      } finally {
        setLoadingExportMonth(false);
      }
    })();
  }, [exportMonthRange.end, exportMonthRange.start, ready]);

  async function toggle(habitId: string, dateISO: string) {
    setErrorMsg(null);

    const key = `${habitId}:${dateISO}`;
    const belongsToExportMonth = dateISO >= exportMonthStartISO && dateISO <= exportMonthEndISO;
    const previousStatus = completionMap[key] ?? null;
    const nextStatus = nextHabitCompletionStatus(previousStatus);

    setCompletionMap((current) => {
      const copy = { ...current };
      if (nextStatus) copy[key] = nextStatus;
      else delete copy[key];
      return copy;
    });

    if (belongsToExportMonth) {
      setExportCompletionMap((current) => {
        const copy = { ...current };
        if (nextStatus) copy[key] = nextStatus;
        else delete copy[key];
        return copy;
      });
    }

    try {
      const response = await apiFetch("/api/completions", {
        method: "POST",
        body: JSON.stringify({ habit_id: habitId, date: dateISO, status: nextStatus }),
      });

      setCompletionMap((current) => {
        const copy = { ...current };
        const persistedStatus = (response.status ?? null) as HabitCompletionStatus | null;
        if (persistedStatus) copy[key] = persistedStatus;
        else delete copy[key];
        return copy;
      });

      if (belongsToExportMonth) {
        setExportCompletionMap((current) => {
          const copy = { ...current };
          const persistedStatus = (response.status ?? null) as HabitCompletionStatus | null;
          if (persistedStatus) copy[key] = persistedStatus;
          else delete copy[key];
          return copy;
        });
      }
    } catch (error: unknown) {
      setCompletionMap((current) => {
        const copy = { ...current };
        if (previousStatus) copy[key] = previousStatus;
        else delete copy[key];
        return copy;
      });

      if (belongsToExportMonth) {
        setExportCompletionMap((current) => {
          const copy = { ...current };
          if (previousStatus) copy[key] = previousStatus;
          else delete copy[key];
          return copy;
        });
      }
      setErrorMsg(getErrorMessage(error, "Erro ao marcar habito."));
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
      });
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, "Erro ao exportar a tabela do mes."));
    } finally {
      setExportingFormat(null);
    }
  }

  const isMultiMonth = effectivePeriod === "quarter" || effectivePeriod === "semester" || effectivePeriod === "year";

  if (!ready) return <div className="p-6 text-sm text-zinc-600">Carregando...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Visualizacao</h1>
            <p className="text-sm text-zinc-500">
              Clique nas datas ate hoje para alternar entre concluido, parcial, nao realizado e limpar.
            </p>
            {isCompact ? (
              <p className="mt-2 text-sm text-zinc-500">Em telas menores, a visualizacao fica focada em semanas para melhorar a leitura.</p>
            ) : null}
          </div>
        </div>

        <div className="app-surface px-4 py-4">
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-[6px] border border-transparent bg-emerald-500 text-[10px] font-bold text-white">
                ✓
              </span>
              Concluido
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-[6px] border border-emerald-500"
                style={{ background: "linear-gradient(90deg, #22c55e 50%, rgba(255,255,255,0.92) 50%)" }}
              />
              Parcial
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-[6px] border border-red-500 bg-red-50 text-[10px] font-bold text-red-600">
                x
              </span>
              Nao realizado
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 rounded-[6px] border border-zinc-400 bg-transparent" />
              Futuro ou sem marcacao
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
              <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Exportacao mensal</div>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Gerar imagem da tabela do mes escolhido</h2>
              <p className="mt-2 text-sm text-slate-600">
                O arquivo usa o mes da ancora atual: <span className="font-semibold capitalize text-slate-900">{exportMonthLabel}</span>.
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
                  {exportingFormat === format ? `Gerando ${format.toUpperCase()}...` : format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 text-sm text-slate-500">
            {loadingExportMonth
              ? "Preparando os dados do mes para exportacao..."
              : habits.length === 0
                ? "Crie pelo menos um habito para liberar a exportacao."
                : "A exportacao inclui a tabela completa do mes, mesmo quando a visualizacao atual estiver em semana."}
          </div>
        </div>
      </div>

      {errorMsg ? <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm">{errorMsg}</div> : null}

      {isMultiMonth ? (
        <HabitMultiMonthGrid habits={habits} completionMap={completionMap} start={range.start} end={range.end} onToggle={toggle} mode={effectivePeriod as "quarter" | "semester" | "year"} />
      ) : (
        <HabitRangeGrid habits={habits} completionMap={completionMap} start={range.start} end={range.end} onToggle={toggle} compact={isCompact} />
      )}
    </div>
  );
}
