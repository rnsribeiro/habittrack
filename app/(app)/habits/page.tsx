"use client";

import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/errors";
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState<Date>(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const range = useMemo(() => getPeriodRange(anchor, period), [anchor, period]);

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

  async function toggle(habitId: string, dateISO: string) {
    setErrorMsg(null);

    const key = `${habitId}:${dateISO}`;
    const previousStatus = completionMap[key] ?? null;
    const nextStatus = nextHabitCompletionStatus(previousStatus);

    setCompletionMap((current) => {
      const copy = { ...current };
      if (nextStatus) copy[key] = nextStatus;
      else delete copy[key];
      return copy;
    });

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
    } catch (error: unknown) {
      setCompletionMap((current) => {
        const copy = { ...current };
        if (previousStatus) copy[key] = previousStatus;
        else delete copy[key];
        return copy;
      });
      setErrorMsg(getErrorMessage(error, "Erro ao marcar habito."));
    }
  }

  const isMultiMonth = period === "quarter" || period === "semester" || period === "year";

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
          period={period}
          anchor={anchor}
          onPeriodChange={(nextPeriod) => {
            setPeriod(nextPeriod);
            const nextDate = new Date();
            nextDate.setHours(0, 0, 0, 0);
            setAnchor(nextDate);
          }}
          onPrev={() => setAnchor((current) => shiftAnchor(current, period, -1))}
          onNext={() => setAnchor((current) => shiftAnchor(current, period, 1))}
          onToday={() => {
            const nextDate = new Date();
            nextDate.setHours(0, 0, 0, 0);
            setAnchor(nextDate);
          }}
        />
      </div>

      {errorMsg ? <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm">{errorMsg}</div> : null}

      {isMultiMonth ? (
        <HabitMultiMonthGrid habits={habits} completionMap={completionMap} start={range.start} end={range.end} onToggle={toggle} mode={period as "quarter" | "semester" | "year"} />
      ) : (
        <HabitRangeGrid habits={habits} completionMap={completionMap} start={range.start} end={range.end} onToggle={toggle} />
      )}
    </div>
  );
}
