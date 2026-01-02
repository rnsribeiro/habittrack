"use client";

import React from "react";
import { useMemo } from "react";

import type { Habit } from "@/lib/types";
import { toISODate, startOfMonth, endOfMonth } from "@/src/lib/period";

type CompletionMap = Record<string, true>;

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

function isWeekend(dow: number) {
  return dow === 0 || dow === 6;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function buildMonthMeta(anchorMonth: Date) {
  const start = startOfMonth(anchorMonth);
  const end = endOfMonth(anchorMonth);

  const days: {
    iso: string;
    day: number;
    dow: number;
    initial: string;
    full: string;
    weekend: boolean;
  }[] = [];

  const d = new Date(start);
  d.setHours(0, 0, 0, 0);

  const e = new Date(end);
  e.setHours(0, 0, 0, 0);

  while (d <= e) {
    const dow = d.getDay();
    days.push({
      iso: toISODate(d),
      day: d.getDate(),
      dow,
      initial: WEEKDAY_INITIAL_PT[dow] ?? "",
      full: WEEKDAY_FULL_PT[dow] ?? "",
      weekend: isWeekend(dow),
    });
    d.setDate(d.getDate() + 1);
  }

  return { start, end, label: monthLabel(start), days };
}

function monthsInRange(start: Date, end: Date) {
  const res: Date[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  d.setHours(0, 0, 0, 0);

  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  last.setHours(0, 0, 0, 0);

  while (d <= last) {
    res.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return res;
}

function MonthCard({
  label,
  days,
  habit,
  completionMap,
  onToggle,
}: {
  label: string;
  days: {
    iso: string;
    day: number;
    dow: number;
    initial: string;
    full: string;
    weekend: boolean;
  }[];
  habit: Habit;
  completionMap: CompletionMap;
  onToggle: (habitId: string, dateISO: string) => void;
}) {
  const totalDays = days.length;

  return (
    <div className="bg-white border rounded-2xl overflow-hidden">
      {/* header do mês */}
      <div className="px-4 py-3 border-b bg-white">
        <div className="text-sm font-semibold capitalize text-zinc-900">{label}</div>
        <div className="text-xs text-zinc-600 mt-0.5">Clique para marcar/desmarcar.</div>
      </div>

      {/* grade */}
      <div
        className="w-full"
        style={
          {
            ["--days" as any]: totalDays,
            ["--cell" as any]: `clamp(20px, calc(100% / var(--days)), 44px)`,
            ["--rowH" as any]: "42px",
          } as React.CSSProperties
        }
      >
        {/* header dias */}
        <div className="flex border-b">
          {days.map((d) => (
            <div
              key={d.iso}
              className={[
                "shrink-0 border-r last:border-r-0",
                d.weekend ? "bg-zinc-50" : "bg-white",
              ].join(" ")}
              style={{ width: "var(--cell)" }}
              title={`${d.full} (${d.iso})`}
            >
              <div className="py-2 leading-none flex flex-col items-center justify-center">
                <div className="text-[11px] font-semibold text-zinc-900">{d.day}</div>
                <div className="text-[10px] text-zinc-600 mt-1">{d.initial}</div>
              </div>
            </div>
          ))}
        </div>

        {/* linha de marcação */}
        <div className="flex">
          {days.map((d) => {
            const key = `${habit.id}:${d.iso}`;
            const done = !!completionMap[key];

            return (
              <button
                key={d.iso}
                type="button"
                className={[
                  "shrink-0 border-r last:border-r-0 flex items-center justify-center hover:bg-zinc-100",
                  d.weekend ? "bg-zinc-50" : "bg-white",
                ].join(" ")}
                style={{ width: "var(--cell)", height: "var(--rowH)" }}
                onClick={() => onToggle(habit.id, d.iso)}
                aria-pressed={done}
                aria-label={`${habit.title} - ${d.iso}`}
                title={d.iso}
              >
                <span
                  className={[
                    "rounded-[5px] border",
                    done ? "border-transparent" : "border-zinc-400",
                  ].join(" ")}
                  style={{
                    width: "16px",
                    height: "16px",
                    backgroundColor: done ? habit.color : "transparent",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function HabitMultiMonthGrid({
  habits,
  completionMap,
  start,
  end,
  onToggle,
  mode,
}: {
  habits: Habit[];
  completionMap: CompletionMap;
  start: Date;
  end: Date;
  onToggle: (habitId: string, dateISO: string) => void;
  mode: "quarter" | "semester" | "year";
}) {
  const months = React.useMemo(() => monthsInRange(start, end), [start, end]);
  const monthBlocks = React.useMemo(() => months.map((m) => buildMonthMeta(m)), [months]);

  // accordion: por padrão, no ano, abre só o mês atual (se estiver no range)
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
  }, []);

  function monthKeyFromLabel(label: string) {
    // label é tipo "janeiro de 2026" — usamos o start do monthBlocks para chave
    return label;
  }

  return (
    <div className="space-y-6">
      {habits.map((h) => (
        <section key={h.id} className="bg-white border rounded-2xl overflow-hidden">
          {/* título do hábito */}
          <div className="px-4 py-3 border-b">
            <div className="text-base font-semibold ht-colored-title" style={{ color: h.color }}>
              {h.title}
            </div>
            <div className="text-xs text-zinc-600 mt-1">
              {mode === "year"
                ? "Ano em meses (clique para abrir/fechar cada mês)."
                : "Meses do período."}
            </div>
          </div>

          <div className="p-4">
            {mode !== "year" ? (
              <div className="space-y-5">
                {monthBlocks.map((mb) => (
                  <MonthCard
                    key={mb.label}
                    label={mb.label}
                    days={mb.days}
                    habit={h}
                    completionMap={completionMap}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {monthBlocks.map((mb) => {
                  // abre automaticamente o mês atual do mesmo ano quando possível
                  const mbYear = mb.start.getFullYear();
                  const mbMonth = mb.start.getMonth() + 1;
                  const isCurrentMonth = `${mbYear}-${mbMonth}` === currentMonthKey;

                  return (
                    <details
                      key={mb.label}
                      className="group bg-white border rounded-2xl overflow-hidden"
                      open={isCurrentMonth}
                    >
                      <summary className="cursor-pointer list-none px-4 py-3 border-b flex items-center justify-between hover:bg-zinc-50">
                        <div className="text-sm font-semibold capitalize text-zinc-900">
                          {mb.label}
                        </div>
                        <div className="text-xs text-zinc-600 group-open:hidden">Abrir</div>
                        <div className="text-xs text-zinc-600 hidden group-open:block">Fechar</div>
                      </summary>

                      <div className="p-4">
                        <MonthCard
                          label={mb.label}
                          days={mb.days}
                          habit={h}
                          completionMap={completionMap}
                          onToggle={onToggle}
                        />
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ))}

      {habits.length === 0 ? (
        <div className="bg-white border rounded-2xl p-6 text-sm text-zinc-700">
          Nenhum hábito ainda. Vá em “Gerenciar” para criar.
        </div>
      ) : null}
    </div>
  );
}
