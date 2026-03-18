"use client";

import React from "react";
import type { Period } from "@/src/lib/period";
import { formatRangeLabel } from "@/src/lib/period";

const PERIODS: { value: Period; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "quarter", label: "Trimestre" },
  { value: "semester", label: "Semestre" },
  { value: "year", label: "Ano" },
];

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
  const periodOptions = availablePeriods?.length
    ? PERIODS.filter((item) => availablePeriods.includes(item.value))
    : PERIODS;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onPrev} className="app-btn app-btn-secondary" aria-label="Periodo anterior">
          &larr;
        </button>

        <button onClick={onNext} className="app-btn app-btn-secondary" aria-label="Proximo periodo">
          &rarr;
        </button>

        <button onClick={onToday} className="app-btn app-btn-secondary">
          Hoje
        </button>

        {showPeriodSelect ? (
          <select value={period} onChange={(e) => onPeriodChange(e.target.value as Period)} className="app-select min-w-[10rem]">
            {periodOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="text-xl font-semibold text-white sm:text-2xl">
        <span className="capitalize">{formatRangeLabel(period, anchor)}</span>
      </div>
    </div>
  );
}
