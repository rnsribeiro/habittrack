"use client";

import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { formatHabitScore, habitCompletionWeight, type HabitCompletionMap } from "@/lib/habits";
import type { Habit, HabitCompletion } from "@/lib/types";
import { apiFetch } from "@/src/lib/api";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { PeriodControls } from "@/components/PeriodControls";
import type { Period } from "@/src/lib/period";
import { getPeriodRange, shiftAnchor, toISODate } from "@/src/lib/period";

function eachDayISO(start: Date, end: Date) {
  const result: string[] = [];
  const date = new Date(start);
  date.setHours(0, 0, 0, 0);

  const rangeEnd = new Date(end);
  rangeEnd.setHours(0, 0, 0, 0);

  while (date <= rangeEnd) {
    result.push(toISODate(date));
    date.setDate(date.getDate() + 1);
  }

  return result;
}

function isWeekend(dayOfWeek: number) {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function expectedDatesForHabitInRange(habit: Habit, start: Date, end: Date) {
  const dates = eachDayISO(start, end);
  const habitStart = habit.start_date ? new Date(habit.start_date) : null;
  const habitEnd = habit.end_date ? new Date(habit.end_date) : null;

  const filteredByHabitRange = dates.filter((iso) => {
    const date = new Date(iso);
    if (habitStart && date < habitStart) return false;
    if (habitEnd && date > habitEnd) return false;
    return true;
  });

  if (habit.frequency === "weekdays") {
    return filteredByHabitRange.filter((iso) => !isWeekend(new Date(iso).getDay()));
  }

  if (habit.frequency === "weekly" || habit.frequency === "custom") {
    const daysOfWeek = new Set(habit.days_of_week ?? []);
    if (daysOfWeek.size === 0) return filteredByHabitRange;
    return filteredByHabitRange.filter((iso) => daysOfWeek.has(new Date(iso).getDay()));
  }

  return filteredByHabitRange;
}

export default function DashboardPage() {
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

  const stats = useMemo(() => {
    const perHabit = habits.map((habit) => {
      const expectedDates = expectedDatesForHabitInRange(habit, range.start, range.end);
      const expected = expectedDates.length;

      let doneEquivalent = 0;
      for (const iso of expectedDates) {
        doneEquivalent += habitCompletionWeight(completionMap[`${habit.id}:${iso}`]);
      }

      const pct = expected === 0 ? 0 : Math.round((doneEquivalent / expected) * 100);

      return {
        id: habit.id,
        title: habit.title,
        color: habit.color,
        expected,
        doneEquivalent,
        pct,
      };
    });

    const totalExpected = perHabit.reduce((sum, row) => sum + row.expected, 0);
    const totalDoneEquivalent = perHabit.reduce((sum, row) => sum + row.doneEquivalent, 0);
    const totalPct = totalExpected === 0 ? 0 : Math.round((totalDoneEquivalent / totalExpected) * 100);

    perHabit.sort((a, b) => a.pct - b.pct);

    return { perHabit, totalExpected, totalDoneEquivalent, totalPct };
  }, [completionMap, habits, range.end, range.start]);

  if (!ready) return <div className="p-6 text-sm text-zinc-600">Carregando...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-600">Marcacoes parciais contam como meio ponto no progresso.</p>
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

      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div>
            <div className="text-sm text-zinc-600">Concluido (geral)</div>
            <div className="text-2xl font-semibold">{stats.totalPct}%</div>
            <div className="text-xs text-zinc-500 mt-1">
              {formatHabitScore(stats.totalDoneEquivalent)} de {stats.totalExpected} marcacoes esperadas no periodo
            </div>
          </div>

          <div className="w-full sm:w-72">
            <div className="h-3 w-full rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full bg-black" style={{ width: `${stats.totalPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b font-medium">Por habito</div>

        {stats.perHabit.length === 0 ? (
          <div className="p-4 text-sm text-zinc-600">Nenhum habito cadastrado. Va em “Gerenciar”.</div>
        ) : (
          <ul className="divide-y">
            {stats.perHabit.map((row) => (
              <li key={row.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate" style={{ color: row.color }}>
                    {row.title}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {formatHabitScore(row.doneEquivalent)} de {row.expected} ({row.pct}%)
                  </div>
                </div>

                <div className="w-56">
                  <div className="h-3 w-full rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-full" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
