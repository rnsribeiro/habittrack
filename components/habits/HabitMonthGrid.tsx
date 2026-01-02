"use client";

import React from "react";
import { daysInMonth, fmtDate } from "@/lib/dates";
import type { Habit } from "@/lib/types";

type CompletionMap = Record<string, true>;

// 0=Dom,1=Seg,2=Ter,3=Qua,4=Qui,5=Sex,6=Sab
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
  completionMap: CompletionMap;
  year: number;
  monthIndex0: number; // 0=Jan
  onToggle: (habitId: string, date: string) => void;
}) {
  const totalDays = daysInMonth(year, monthIndex0);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  // "hoje" em ISO (YYYY-MM-DD) no fuso local
  const now = new Date();
  const todayISO = fmtDate(now.getFullYear(), now.getMonth(), now.getDate());

  // pré-calcula dayOfWeek e weekend pra não recomputar em cada linha
  const dayMeta = days.map((d) => {
    const jsDate = new Date(year, monthIndex0, d);
    const wd = jsDate.getDay();
    const dateISO = fmtDate(year, monthIndex0, d);

    return {
      d,
      wd,
      weekend: isWeekend(wd),
      initial: WEEKDAY_INITIAL_PT[wd] ?? "",
      full: WEEKDAY_FULL_PT[wd] ?? "",
      dateISO,
      isToday: dateISO === todayISO,
    };
  });

  return (
    <div
      className="w-full border rounded-lg bg-white"
      style={
        {
          ["--days" as any]: totalDays,
          ["--firstCol" as any]: "clamp(160px, 28vw, 280px)",
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

          {dayMeta.map(({ d, full, initial, weekend, isToday }) => (
            <div
              key={d}
              className={[
                "shrink-0 border-r text-zinc-700",
                weekend ? "bg-zinc-50" : "bg-white",
              ].join(" ")}
              style={{ width: "var(--cell)" }}
              title={`${full} (dia ${d})`}
            >
              <div className="py-2 leading-none flex flex-col items-center justify-center">
                {/* ✅ Destaque só no número do dia */}
                <div
                  className={[
                    "text-[11px] font-semibold",
                    isToday
                      ? "px-2 py-[2px] rounded-full bg-black text-white"
                      : "text-zinc-800",
                  ].join(" ")}
                >
                  {d}
                </div>

                <div className="text-[10px] text-zinc-600 mt-1">{initial}</div>
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
              title={h.title}
            >
              <span
                className="text-sm font-semibold truncate block ht-colored-title"
                style={{ color: h.color }}
              >
                {h.title}
              </span>
            </div>

            {/* Dias */}
            {dayMeta.map(({ dateISO, weekend, isToday }) => {
              const key = `${h.id}:${dateISO}`;
              const done = !!completionMap[key];

              return (
                <button
                  key={dateISO}
                  type="button"
                  className={[
                    "shrink-0 border-r flex items-center justify-center hover:bg-zinc-100 relative",
                    weekend ? "bg-zinc-50" : "bg-white",
                    isToday ? "z-[1]" : "",
                  ].join(" ")}
                  style={{ width: "var(--cell)", height: "var(--rowH)" }}
                  onClick={() => onToggle(h.id, dateISO)}
                  aria-pressed={done}
                  aria-label={`${h.title} - ${dateISO}`}
                  title={dateISO}
                >
                  {/* ✅ Anel discreto do dia atual (não pinta a coluna) */}
                  {isToday ? (
                    <span className="pointer-events-none absolute inset-[6px] rounded-md ring-2 ring-black/70" />
                  ) : null}

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

        {habits.length === 0 ? (
          <div className="p-6 text-sm text-zinc-600">
            Nenhum hábito ainda. Vá em “Gerenciar” para criar.
          </div>
        ) : null}
      </div>
    </div>
  );
}
