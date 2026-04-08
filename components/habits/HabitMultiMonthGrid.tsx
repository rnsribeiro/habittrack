"use client";

import React, { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { canMarkHabitDate, type HabitCompletionMap } from "@/lib/habits";
import type { Habit } from "@/lib/types";
import { endOfMonth, startOfMonth, toISODate } from "@/src/lib/period";
import { HabitCompletionCell } from "@/components/habits/HabitCompletionCell";

const WEEKDAY_INITIALS = {
  pt: ["D", "S", "T", "Q", "Q", "S", "S"],
  en: ["S", "M", "T", "W", "T", "F", "S"],
};

const WEEKDAY_FULL_NAMES = {
  pt: ["Domingo", "Segunda-feira", "Terca-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sabado"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

function isWeekend(dayOfWeek: number) {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function monthLabel(date: Date, locale: "pt" | "en") {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildMonthMeta(anchorMonth: Date, todayISO: string, locale: "pt" | "en") {
  const start = startOfMonth(anchorMonth);
  const end = endOfMonth(anchorMonth);

  const days: {
    iso: string;
    day: number;
    initial: string;
    full: string;
    weekend: boolean;
    isToday: boolean;
  }[] = [];

  const date = new Date(start);
  date.setHours(0, 0, 0, 0);

  const monthEnd = new Date(end);
  monthEnd.setHours(0, 0, 0, 0);

  while (date <= monthEnd) {
    const dow = date.getDay();
    const iso = toISODate(date);

    days.push({
      iso,
      day: date.getDate(),
      initial: WEEKDAY_INITIALS[locale][dow] ?? "",
      full: WEEKDAY_FULL_NAMES[locale][dow] ?? "",
      weekend: isWeekend(dow),
      isToday: iso === todayISO,
    });

    date.setDate(date.getDate() + 1);
  }

  return { start, end, label: monthLabel(start, locale), days };
}

function monthsInRange(start: Date, end: Date) {
  const result: Date[] = [];
  const date = new Date(start.getFullYear(), start.getMonth(), 1);
  date.setHours(0, 0, 0, 0);

  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  last.setHours(0, 0, 0, 0);

  while (date <= last) {
    result.push(new Date(date));
    date.setMonth(date.getMonth() + 1);
  }

  return result;
}

function MonthCard({
  label,
  days,
  habit,
  completionMap,
  onToggle,
  todayISO,
  locale,
}: {
  label: string;
  days: {
    iso: string;
    day: number;
    initial: string;
    full: string;
    weekend: boolean;
    isToday: boolean;
  }[];
  habit: Habit;
  completionMap: HabitCompletionMap;
  onToggle: (habitId: string, dateISO: string) => void;
  todayISO: string;
  locale: "pt" | "en";
}) {
  const totalDays = days.length;

  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <div className="border-b bg-white px-4 py-3">
        <div className="text-sm font-semibold capitalize text-zinc-900">{label}</div>
        <div className="mt-0.5 text-xs text-zinc-600">
          {locale === "en" ? "Click to switch between done, partial, and clear." : "Clique para alternar entre concluido, parcial e limpar."}
        </div>
      </div>

      <div
        className="w-full"
        style={
          {
            ["--days" as string]: totalDays,
            ["--cell" as string]: "clamp(20px, calc(100% / var(--days)), 44px)",
            ["--rowH" as string]: "42px",
          } as React.CSSProperties
        }
      >
        <div className="flex border-b">
          {days.map((day) => (
            <div
              key={day.iso}
              className={[
                "shrink-0 border-r last:border-r-0",
                day.isToday ? "bg-emerald-100" : day.weekend ? "bg-amber-100" : "bg-white",
              ].join(" ")}
              style={{ width: "var(--cell)" }}
              title={`${day.full} (${day.iso})`}
            >
              <div className="flex flex-col items-center justify-center py-2 leading-none">
                <div
                  className={[
                    "text-[11px] font-semibold",
                    day.isToday ? "text-emerald-700" : day.weekend ? "text-amber-700" : "text-zinc-900",
                  ].join(" ")}
                >
                  {day.day}
                </div>
                <div
                  className={[
                    "mt-1 text-[10px]",
                    day.isToday ? "font-bold text-emerald-700" : day.weekend ? "font-medium text-amber-600" : "text-zinc-600",
                  ].join(" ")}
                >
                  {day.initial}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex">
          {days.map((day) => {
            const key = `${habit.id}:${day.iso}`;
            const status = completionMap[key] ?? null;

            return (
              <HabitCompletionCell
                key={day.iso}
                status={status}
                color={habit.color}
                canMark={canMarkHabitDate(day.iso, todayISO)}
                className={[
                  "relative flex shrink-0 items-center justify-center border-r last:border-r-0",
                  day.isToday ? "bg-emerald-100" : day.weekend ? "bg-amber-100" : "bg-white",
                ].join(" ")}
                style={{ width: "var(--cell)", height: "var(--rowH)" }}
                onClick={() => onToggle(habit.id, day.iso)}
                label={`${habit.title} - ${day.iso}`}
              />
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
  completionMap: HabitCompletionMap;
  start: Date;
  end: Date;
  onToggle: (habitId: string, dateISO: string) => void;
  mode: "quarter" | "semester" | "year";
}) {
  const { locale } = useI18n();
  const todayISO = useMemo(() => toISODate(new Date()), []);
  const months = React.useMemo(() => monthsInRange(start, end), [start, end]);
  const monthBlocks = React.useMemo(
    () => months.map((month) => buildMonthMeta(month, todayISO, locale)),
    [locale, months, todayISO]
  );

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
  }, []);

  return (
    <div className="space-y-6">
      {habits.map((habit) => (
        <section key={habit.id} className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b px-4 py-3">
            <div className="text-base font-semibold ht-colored-title" style={{ color: habit.color }}>
              {habit.title}
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              {mode === "year"
                ? locale === "en"
                  ? "Year split by month. Future dates remain only as forecast."
                  : "Ano em meses. Datas futuras ficam apenas como previsao."
                : locale === "en"
                  ? "Months from the current period."
                  : "Meses do periodo atual."}
            </div>
          </div>

          <div className="p-4">
            {mode !== "year" ? (
              <div className="space-y-5">
                {monthBlocks.map((monthBlock) => (
                  <MonthCard
                    key={monthBlock.label}
                    label={monthBlock.label}
                    days={monthBlock.days}
                    habit={habit}
                    completionMap={completionMap}
                    onToggle={onToggle}
                    todayISO={todayISO}
                    locale={locale}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {monthBlocks.map((monthBlock) => {
                  const monthKey = `${monthBlock.start.getFullYear()}-${monthBlock.start.getMonth() + 1}`;
                  const isCurrentMonth = monthKey === currentMonthKey;

                  return (
                    <details key={monthBlock.label} className="group overflow-hidden rounded-2xl border bg-white" open={isCurrentMonth}>
                      <summary className="flex cursor-pointer list-none items-center justify-between border-b px-4 py-3 hover:bg-zinc-50">
                        <div className="text-sm font-semibold capitalize text-zinc-900">{monthBlock.label}</div>
                        <div className="text-xs text-zinc-600 group-open:hidden">{locale === "en" ? "Open" : "Abrir"}</div>
                        <div className="hidden text-xs text-zinc-600 group-open:block">{locale === "en" ? "Close" : "Fechar"}</div>
                      </summary>

                      <div className="p-4">
                        <MonthCard
                          label={monthBlock.label}
                          days={monthBlock.days}
                          habit={habit}
                          completionMap={completionMap}
                          onToggle={onToggle}
                          todayISO={todayISO}
                          locale={locale}
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
        <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-700">
          {locale === "en" ? "No habits yet. Go to Manage to create one." : "Nenhum habito ainda. Va em Gerenciar para criar."}
        </div>
      ) : null}
    </div>
  );
}
