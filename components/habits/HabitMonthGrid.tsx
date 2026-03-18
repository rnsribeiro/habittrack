"use client";

import React from "react";
import { canMarkHabitDate, type HabitCompletionMap } from "@/lib/habits";
import { daysInMonth, fmtDate } from "@/lib/dates";
import type { Habit } from "@/lib/types";
import { HabitCompletionCell } from "@/components/habits/HabitCompletionCell";

const WEEKDAY_INITIAL_PT = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_FULL_PT = ["Domingo", "Segunda-feira", "Terca-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sabado"];

function isWeekend(dayOfWeek: number) {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function HabitMonthGrid({
  habits,
  completionMap,
  year,
  monthIndex0,
  onToggle,
}: {
  habits: Habit[];
  completionMap: HabitCompletionMap;
  year: number;
  monthIndex0: number;
  onToggle: (habitId: string, date: string) => void;
}) {
  const totalDays = daysInMonth(year, monthIndex0);
  const days = Array.from({ length: totalDays }, (_, index) => index + 1);

  const now = new Date();
  const todayISO = fmtDate(now.getFullYear(), now.getMonth(), now.getDate());

  const dayMeta = days.map((day) => {
    const jsDate = new Date(year, monthIndex0, day);
    const dayOfWeek = jsDate.getDay();
    const dateISO = fmtDate(year, monthIndex0, day);

    return {
      dateISO,
      day,
      weekend: isWeekend(dayOfWeek),
      initial: WEEKDAY_INITIAL_PT[dayOfWeek] ?? "",
      full: WEEKDAY_FULL_PT[dayOfWeek] ?? "",
      isToday: dateISO === todayISO,
    };
  });

  return (
    <div
      className="w-full rounded-lg border bg-white"
      style={
        {
          ["--days" as string]: totalDays,
          ["--firstCol" as string]: "clamp(160px, 28vw, 280px)",
          ["--cell" as string]: "clamp(20px, calc((100% - var(--firstCol)) / var(--days)), 44px)",
          ["--rowH" as string]: "44px",
        } as React.CSSProperties
      }
    >
      <div className="sticky top-0 z-20 border-b bg-white">
        <div className="flex">
          <div className="sticky left-0 z-30 shrink-0 border-r bg-zinc-300 p-3 font-semibold" style={{ width: "var(--firstCol)" }}>
            <span className="font-bold text-black">Habitos</span>
          </div>

          {dayMeta.map((meta) => (
            <div
              key={meta.day}
              className={["shrink-0 border-r text-zinc-700", meta.weekend ? "bg-amber-100" : "bg-white"].join(" ")}
              style={{ width: "var(--cell)" }}
              title={`${meta.full} (dia ${meta.day})`}
            >
              <div className="flex flex-col items-center justify-center py-2 leading-none">
                <div
                  className={[
                    "text-[11px] font-semibold",
                    meta.isToday ? "rounded-full bg-black px-2 py-[2px] text-white" : meta.weekend ? "text-amber-700" : "text-zinc-800",
                  ].join(" ")}
                >
                  {meta.day}
                </div>

                <div className={["mt-1 text-[10px]", meta.weekend ? "font-medium text-amber-600" : "text-zinc-600"].join(" ")}>
                  {meta.initial}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        {habits.map((habit) => (
          <div key={habit.id} className="flex border-b last:border-b-0">
            <div className="sticky left-0 z-10 shrink-0 border-r bg-white p-3" style={{ width: "var(--firstCol)" }} title={habit.title}>
              <span className="ht-colored-title block truncate text-sm font-semibold" style={{ color: habit.color }}>
                {habit.title}
              </span>
            </div>

            {dayMeta.map((meta) => {
              const key = `${habit.id}:${meta.dateISO}`;
              const status = completionMap[key] ?? null;

              return (
                <HabitCompletionCell
                  key={meta.dateISO}
                  status={status}
                  color={habit.color}
                  canMark={canMarkHabitDate(meta.dateISO, todayISO)}
                  className={[
                    "relative shrink-0 border-r flex items-center justify-center",
                    meta.weekend ? "bg-amber-100" : "bg-white",
                    meta.isToday ? "z-[1]" : "",
                  ].join(" ")}
                  style={{ width: "var(--cell)", height: "var(--rowH)" }}
                  onClick={() => onToggle(habit.id, meta.dateISO)}
                  label={`${habit.title} - ${meta.dateISO}`}
                />
              );
            })}
          </div>
        ))}

        {habits.length === 0 ? <div className="p-6 text-sm text-zinc-600">Nenhum habito ainda. Va em “Gerenciar” para criar.</div> : null}
      </div>
    </div>
  );
}
