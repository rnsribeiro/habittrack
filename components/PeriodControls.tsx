"use client";

import React from "react";
import type { Period } from "@/src/lib/period";
import { formatRangeLabel } from "@/src/lib/period";

const PERIODS: { value: Period; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
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
}: {
  period: Period;
  anchor: Date;
  onPeriodChange: (p: Period) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onPrev} className="app-btn app-btn-secondary" aria-label="Período anterior">
          &larr;
        </button>

        <button onClick={onNext} className="app-btn app-btn-secondary" aria-label="Próximo período">
          &rarr;
        </button>

        <button onClick={onToday} className="app-btn app-btn-secondary">
          Hoje
        </button>

        <select value={period} onChange={(e) => onPeriodChange(e.target.value as Period)} className="app-select min-w-[10rem]">
          {PERIODS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="text-xl font-semibold text-white sm:text-2xl">
        <span className="capitalize">{formatRangeLabel(period, anchor)}</span>
      </div>
    </div>
  );
}
