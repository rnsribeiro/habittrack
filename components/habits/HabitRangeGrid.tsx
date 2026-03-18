"use client";

import React from "react";
import { canMarkHabitDate, type HabitCompletionMap } from "@/lib/habits";
import type { Habit } from "@/lib/types";
import { toISODate } from "@/src/lib/period";
import { HabitCompletionCell } from "@/components/habits/HabitCompletionCell";

const WEEKDAY_INITIAL_PT = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_FULL_PT = ["Domingo", "Segunda-feira", "Terca-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sabado"];

function isWeekend(dow: number) {
  return dow === 0 || dow === 6;
}

function eachDayMeta(start: Date, end: Date, todayISO: string) {
  const result: {
    iso: string;
    day: number;
    initial: string;
    full: string;
    weekend: boolean;
    isToday: boolean;
  }[] = [];

  const date = new Date(start);
  date.setHours(0, 0, 0, 0);

  const rangeEnd = new Date(end);
  rangeEnd.setHours(0, 0, 0, 0);

  while (date <= rangeEnd) {
    const dow = date.getDay();
    const iso = toISODate(date);

    result.push({
      iso,
      day: date.getDate(),
      initial: WEEKDAY_INITIAL_PT[dow] ?? "",
      full: WEEKDAY_FULL_PT[dow] ?? "",
      weekend: isWeekend(dow),
      isToday: iso === todayISO,
    });

    date.setDate(date.getDate() + 1);
  }

  return result;
}

export function HabitRangeGrid({
  habits,
  completionMap,
  start,
  end,
  onToggle,
  compact = false,
}: {
  habits: Habit[];
  completionMap: HabitCompletionMap;
  start: Date;
  end: Date;
  onToggle: (habitId: string, dateISO: string) => void;
  compact?: boolean;
}) {
  const todayISO = React.useMemo(() => toISODate(new Date()), []);
  const meta = React.useMemo(() => eachDayMeta(start, end, todayISO), [start, end, todayISO]);
  const totalDays = meta.length;

  return (
    <div
      className="w-full rounded-lg border bg-white"
      style={
        {
          ["--days" as string]: totalDays,
          ["--firstCol" as string]: compact ? "clamp(128px, 38vw, 180px)" : "clamp(180px, 26vw, 300px)",
          ["--cell" as string]: "clamp(20px, calc((100% - var(--firstCol)) / var(--days)), 44px)",
          ["--rowH" as string]: compact ? "42px" : "44px",
        } as React.CSSProperties
      }
    >
      <div className="sticky top-0 z-20 border-b bg-white">
        <div className="flex">
          <div className="sticky left-0 z-30 shrink-0 border-r bg-zinc-300 p-3 font-semibold" style={{ width: "var(--firstCol)" }}>
            <span className={`font-bold text-black ${compact ? "text-sm" : ""}`}>Habitos</span>
          </div>

          {meta.map((item) => (
            <div
              key={item.iso}
              className={[
                "shrink-0 border-r",
                item.isToday ? "bg-emerald-100" : item.weekend ? "bg-amber-100" : "bg-white",
              ].join(" ")}
              style={{ width: "var(--cell)" }}
              title={`${item.full} (${item.iso})`}
            >
              <div className="flex flex-col items-center justify-center py-2 leading-none">
                <div
                  className={[
                    "text-[11px] font-semibold",
                    item.isToday ? "text-emerald-700" : item.weekend ? "text-amber-700" : "text-zinc-800",
                  ].join(" ")}
                >
                  {item.day}
                </div>
                <div
                  className={[
                    "mt-1 text-[10px]",
                    item.isToday ? "font-bold text-emerald-700" : item.weekend ? "font-medium text-amber-600" : "text-zinc-500",
                  ].join(" ")}
                >
                  {item.initial}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        {habits.map((habit) => (
          <div key={habit.id} className="flex border-b last:border-b-0">
            <div className="sticky left-0 z-10 shrink-0 border-r bg-white p-3" style={{ width: "var(--firstCol)" }}>
              <span className={`block truncate font-semibold italic ${compact ? "text-[13px]" : "text-sm"}`} style={{ color: habit.color }}>
                {habit.title}
              </span>
            </div>

            {meta.map((item) => {
              const key = `${habit.id}:${item.iso}`;
              const status = completionMap[key] ?? null;

              return (
                <HabitCompletionCell
                  key={item.iso}
                  status={status}
                  color={habit.color}
                  canMark={canMarkHabitDate(item.iso, todayISO)}
                  className={[
                    "relative shrink-0 border-r flex items-center justify-center",
                    item.isToday ? "bg-emerald-100" : item.weekend ? "bg-amber-100" : "bg-white",
                  ].join(" ")}
                  style={{ width: "var(--cell)", height: "var(--rowH)" }}
                  onClick={() => onToggle(habit.id, item.iso)}
                  label={`${habit.title} - ${item.iso}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
