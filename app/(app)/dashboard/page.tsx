"use client";

import { useEffect, useMemo, useState } from "react";
import type { Habit } from "@/lib/types";
import { apiFetch } from "@/src/lib/api";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { PeriodControls } from "@/components/PeriodControls";
import type { Period } from "@/src/lib/period";
import { getPeriodRange, shiftAnchor, toISODate } from "@/src/lib/period";

type CompletionMap = Record<string, true>;

function eachDayISO(start: Date, end: Date) {
  const res: string[] = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);

  const e = new Date(end);
  e.setHours(0, 0, 0, 0);

  while (d <= e) {
    res.push(toISODate(d));
    d.setDate(d.getDate() + 1);
  }
  return res;
}

function isWeekend(dayOfWeek: number) {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

// dias esperados no range conforme frequency
function expectedDatesForHabitInRange(habit: any, start: Date, end: Date) {
  const dates = eachDayISO(start, end);

  // se o hábito tiver start/end, recorta o range
  const habitStart = habit.start_date ? new Date(habit.start_date) : null;
  const habitEnd = habit.end_date ? new Date(habit.end_date) : null;

  const filteredByHabitRange = dates.filter((iso) => {
    const d = new Date(iso);
    if (habitStart && d < habitStart) return false;
    if (habitEnd && d > habitEnd) return false;
    return true;
  });

  const freq = habit.frequency ?? "daily";

  if (freq === "weekdays") {
    return filteredByHabitRange.filter((iso) => {
      const dow = new Date(iso).getDay();
      return !isWeekend(dow);
    });
  }

  if (freq === "weekly" || freq === "custom") {
    const set = new Set<number>((habit.days_of_week ?? []) as number[]);
    if (set.size === 0) return filteredByHabitRange; // fallback
    return filteredByHabitRange.filter((iso) => set.has(new Date(iso).getDay()));
  }

  // daily
  return filteredByHabitRange;
}

export default function DashboardPage() {
  const { ready } = useRequireSession("/login");

  const [habits, setHabits] = useState<Habit[]>([]);
  const [completionMap, setCompletionMap] = useState<CompletionMap>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const range = useMemo(() => getPeriodRange(anchor, period), [anchor, period]);

  async function loadHabits() {
    const { habits } = await apiFetch("/api/habits");
    setHabits(habits);
  }

  async function loadCompletions(start: Date, end: Date) {
    const startISO = toISODate(start);
    const endISO = toISODate(end);

    const { completions } = await apiFetch(
      `/api/completions/list?start=${startISO}&end=${endISO}`
    );

    const map: CompletionMap = {};
    for (const row of completions as any[]) {
      map[`${row.habit_id}:${row.date}`] = true;
    }
    setCompletionMap(map);
  }

  useEffect(() => {
    if (!ready) return;

    (async () => {
      setErrorMsg(null);
      try {
        await loadHabits();
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Erro ao carregar hábitos.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // recarrega completions quando mudar período/âncora
  useEffect(() => {
    if (!ready) return;

    (async () => {
      setErrorMsg(null);
      try {
        await loadCompletions(range.start, range.end);
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Erro ao carregar marcações.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, period, anchor]);

  const stats = useMemo(() => {
    const perHabit = habits.map((h: any) => {
      const expectedDates = expectedDatesForHabitInRange(h, range.start, range.end);
      const expected = expectedDates.length;

      let done = 0;
      for (const iso of expectedDates) {
        if (completionMap[`${h.id}:${iso}`]) done++;
      }

      const pct = expected === 0 ? 0 : Math.round((done / expected) * 100);

      return {
        id: h.id,
        title: h.title,
        color: h.color,
        expected,
        done,
        pct,
      };
    });

    const totalExpected = perHabit.reduce((acc, r) => acc + r.expected, 0);
    const totalDone = perHabit.reduce((acc, r) => acc + r.done, 0);
    const totalPct = totalExpected === 0 ? 0 : Math.round((totalDone / totalExpected) * 100);

    perHabit.sort((a, b) => a.pct - b.pct);

    return { perHabit, totalExpected, totalDone, totalPct };
  }, [habits, completionMap, range.start, range.end]);

  if (!ready) return <div className="p-6 text-sm text-zinc-600">Carregando...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-600">
            Acompanhe seu progresso por período.
          </p>
        </div>

        <PeriodControls
          period={period}
          anchor={anchor}
          onPeriodChange={(p) => {
            setPeriod(p);
            // mantém a âncora em "hoje" para o novo período
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            setAnchor(d);
          }}
          onPrev={() => setAnchor((a) => shiftAnchor(a, period, -1))}
          onNext={() => setAnchor((a) => shiftAnchor(a, period, +1))}
          onToday={() => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            setAnchor(d);
          }}
        />
      </div>

      {errorMsg ? (
        <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm">
          {errorMsg}
        </div>
      ) : null}

      {/* resumo geral */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div>
            <div className="text-sm text-zinc-600">Concluído (geral)</div>
            <div className="text-2xl font-semibold">{stats.totalPct}%</div>
            <div className="text-xs text-zinc-500 mt-1">
              {stats.totalDone} de {stats.totalExpected} marcações esperadas no período
            </div>
          </div>

          <div className="w-full sm:w-72">
            <div className="h-3 w-full rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full bg-black" style={{ width: `${stats.totalPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* lista por hábito */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b font-medium">Por hábito</div>

        {stats.perHabit.length === 0 ? (
          <div className="p-4 text-sm text-zinc-600">
            Nenhum hábito cadastrado. Vá em “Gerenciar”.
          </div>
        ) : (
          <ul className="divide-y">
            {stats.perHabit.map((r) => (
              <li key={r.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate" style={{ color: r.color }}>
                    {r.title}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {r.done} de {r.expected} ({r.pct}%)
                  </div>
                </div>

                <div className="w-56">
                  <div className="h-3 w-full rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                    />
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
