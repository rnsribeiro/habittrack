"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import type { Period } from "@/src/lib/period";
import { formatRangeLabel } from "@/src/lib/period";

const PERIODS: Record<"pt" | "en", { value: Period; label: string }[]> = {
  pt: [
    { value: "week", label: "Semana" },
    { value: "month", label: "Mes" },
    { value: "quarter", label: "Trimestre" },
    { value: "semester", label: "Semestre" },
    { value: "year", label: "Ano" },
  ],
  en: [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "quarter", label: "Quarter" },
    { value: "semester", label: "Semester" },
    { value: "year", label: "Year" },
  ],
};

export function PeriodControls({
  period,
  anchor,
  onPeriodChange,
  onPrev,
  onNext,
  onToday,
  availablePeriods,
  showPeriodSelect = true,
}: {
  period: Period;
  anchor: Date;
  onPeriodChange: (p: Period) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  availablePeriods?: Period[];
  showPeriodSelect?: boolean;
}) {
  const { locale } = useI18n();
  const copy =
    locale === "en"
      ? {
          previous: "Previous period",
          next: "Next period",
          today: "Today",
        }
      : {
          previous: "Periodo anterior",
          next: "Proximo periodo",
          today: "Hoje",
        };

  const allOptions = PERIODS[locale];
  const periodOptions = availablePeriods?.length
    ? allOptions.filter((item) => availablePeriods.includes(item.value))
    : allOptions;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onPrev} className="app-btn app-btn-secondary" aria-label={copy.previous}>
          &larr;
        </button>

        <button onClick={onNext} className="app-btn app-btn-secondary" aria-label={copy.next}>
          &rarr;
        </button>

        <button onClick={onToday} className="app-btn app-btn-secondary">
          {copy.today}
        </button>

        {showPeriodSelect ? (
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as Period)}
            className="app-select min-w-[10rem] flex-none"
            style={{ width: "auto" }}
          >
            {periodOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="text-xl font-semibold text-white sm:text-2xl">
        <span className="capitalize">{formatRangeLabel(period, anchor, locale)}</span>
      </div>
    </div>
  );
}
