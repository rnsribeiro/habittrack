// app/(app)/habits/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Habit } from "@/lib/types";
import { apiFetch } from "@/src/lib/api";
import { useRequireSession } from "@/src/lib/useRequireSession";

import { PeriodControls } from "@/components/PeriodControls";
import type { Period } from "@/src/lib/period";
import { formatRangeLabel, getPeriodRange, shiftAnchor, toISODate } from "@/src/lib/period";

import { HabitRangeGrid } from "@/components/habits/HabitRangeGrid";
import { HabitMultiMonthGrid } from "@/components/habits/HabitMultiMonthGrid";

type CompletionMap = Record<string, true>;

export default function HabitsViewPage() {
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
  const rangeLabel = useMemo(() => formatRangeLabel(period, anchor), [period, anchor]);

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

  async function toggle(habitId: string, dateISO: string) {
    setErrorMsg(null);

    const key = `${habitId}:${dateISO}`;
    const prevDone = !!completionMap[key];

    setCompletionMap((m) => {
      const copy = { ...m };
      if (prevDone) delete copy[key];
      else copy[key] = true;
      return copy;
    });

    try {
      const { done } = await apiFetch("/api/completions", {
        method: "POST",
        body: JSON.stringify({ habit_id: habitId, date: dateISO }),
      });

      setCompletionMap((m) => {
        const copy = { ...m };
        if (done) copy[key] = true;
        else delete copy[key];
        return copy;
      });
    } catch (e: any) {
      setCompletionMap((m) => {
        const copy = { ...m };
        if (prevDone) copy[key] = true;
        else delete copy[key];
        return copy;
      });
      setErrorMsg(e?.message ?? "Erro ao marcar.");
    }
  }

  const isMultiMonth = period === "quarter" || period === "semester" || period === "year";

  if (!ready) return <div className="p-6 text-sm text-zinc-600">Carregando...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
          <div>
            <h1 className="text-xl font-semibold">Visualização</h1>
            <p className="text-sm text-zinc-500">Marque os dias concluídos na grade.</p>
          </div>
          
        </div>

        <PeriodControls
          period={period}
          anchor={anchor}
          onPeriodChange={(p) => {
            setPeriod(p);
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
        <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm">{errorMsg}</div>
      ) : null}

      {isMultiMonth ? (
        <HabitMultiMonthGrid
          habits={habits}
          completionMap={completionMap}
          start={range.start}
          end={range.end}
          onToggle={toggle}
          mode={period as "quarter" | "semester" | "year"}
        />
      ) : (
        <HabitRangeGrid
          habits={habits}
          completionMap={completionMap}
          start={range.start}
          end={range.end}
          onToggle={toggle}
        />
      )}
    </div>
  );
}
