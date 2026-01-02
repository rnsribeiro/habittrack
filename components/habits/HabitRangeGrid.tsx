"use client";

import React from "react";
import type { Habit } from "@/lib/types";
import { toISODate } from "@/src/lib/period";

// 0=Dom..6=Sab
const WEEKDAY_INITIAL_PT: string[] = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_FULL_PT: string[] = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

type CompletionMap = Record<string, true>;

function isWeekend(dow: number) {
  return dow === 0 || dow === 6;
}

function eachDayMeta(start: Date, end: Date, todayISO: string) {
  const res: {
    iso: string;
    day: number;
    dow: number;
    initial: string;
    full: string;
    weekend: boolean;
    isToday: boolean;
  }[] = [];

  const d = new Date(start);
  d.setHours(0, 0, 0, 0);

  const e = new Date(end);
  e.setHours(0, 0, 0, 0);

  while (d <= e) {
    const dow = d.getDay();
    const iso = toISODate(d);

    res.push({
      iso,
      day: d.getDate(),
      dow,
      initial: WEEKDAY_INITIAL_PT[dow] ?? "",
      full: WEEKDAY_FULL_PT[dow] ?? "",
      weekend: isWeekend(dow),
      isToday: iso === todayISO,
    });

    d.setDate(d.getDate() + 1);
  }

  return res;
}

export function HabitRangeGrid({
  habits,
  completionMap,
  start,
  end,
  onToggle,
}: {
  habits: Habit[];
  completionMap: CompletionMap;
  start: Date;
  end: Date;
  onToggle: (habitId: string, dateISO: string) => void;
}) {
  const todayISO = React.useMemo(() => toISODate(new Date()), []);

  const meta = React.useMemo(
    () => eachDayMeta(start, end, todayISO),
    [start, end, todayISO]
  );

  const totalDays = meta.length;

  return (
    <div
      className="w-full border rounded-lg bg-white"
      style={
        {
          ["--days" as any]: totalDays,
          ["--firstCol" as any]: "clamp(180px, 26vw, 300px)",
          ["--cell" as any]:
            "clamp(20px, calc((100% - var(--firstCol)) / var(--days)), 44px)",
          ["--rowH" as any]: "44px",
        } as React.CSSProperties
      }
    >
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="flex">
          <div
            className="shrink-0 font-semibold p-3 border-r sticky left-0 bg-zinc-300 z-30"
            style={{ width: "var(--firstCol)" }}
          >
            <span className="font-bold text-black">Hábitos</span>
          </div>

          {meta.map((m) => (
            <div
              key={m.iso}
              className={[
                "shrink-0 border-r",
                m.isToday
                  ? "bg-emerald-100"
                  : m.weekend
                  ? "bg-zinc-50"
                  : "bg-white",
              ].join(" ")}
              style={{ width: "var(--cell)" }}
              title={`${m.full} (${m.iso})`}
            >
              <div className="py-2 leading-none flex flex-col items-center justify-center">
                <div
                  className={[
                    "text-[11px] font-semibold",
                    m.isToday ? "text-emerald-700" : "text-zinc-800",
                  ].join(" ")}
                >
                  {m.day}
                </div>

                <div
                  className={[
                    "text-[10px] mt-1",
                    m.isToday ? "text-emerald-700 font-bold" : "text-zinc-500",
                  ].join(" ")}
                >
                  {m.initial}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div>
        {habits.map((h) => (
          <div key={h.id} className="flex border-b last:border-b-0">
            {/* Coluna do hábito */}
            <div
              className="shrink-0 p-3 border-r sticky left-0 bg-white z-10"
              style={{ width: "var(--firstCol)" }}
            >
              <span
                className="text-sm font-semibold italic truncate block"
                style={{ color: h.color }}
              >
                {h.title}
              </span>
            </div>

            {/* Dias */}
            {meta.map((m) => {
              const key = `${h.id}:${m.iso}`;
              const done = !!completionMap[key];

              return (
                <button
                  key={m.iso}
                  type="button"
                  className={[
                    "shrink-0 border-r flex items-center justify-center hover:bg-emerald-100 hover:rounded-md",
                    m.isToday
                      ? "bg-emerald-100"
                      : m.weekend
                      ? "bg-zinc-50"
                      : "bg-white",
                  ].join(" ")}
                  style={{ width: "var(--cell)", height: "var(--rowH)" }}
                  onClick={() => onToggle(h.id, m.iso)}
                >
                  <span
                    className={[
                      "rounded-[5px] border",
                      done ? "border-transparent" : "border-zinc-400",
                    ].join(" ")}
                    style={{
                      width: "clamp(10px, calc(var(--cell) * 0.6), 16px)",
                      height: "clamp(10px, calc(var(--cell) * 0.6), 16px)",
                      backgroundColor: done ? h.color : "transparent",
                    }}
                  />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
