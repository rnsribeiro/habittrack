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
    <div className="flex items-center justify-between gap-3 flex-col sm:flex-row">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onPrev}
          className="text-sm px-3 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200"
        >
          ←
        </button>

        <button
          onClick={onNext}
          className="text-sm px-3 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200"
        >
          →
        </button>

        <button
          onClick={onToday}
          className="text-sm px-3 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200"
        >
          Hoje
        </button>

        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as Period)}
          className="text-sm px-3 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="text-2xl text-zinc-50">
        <span className="font-semibold capitalize">
          {formatRangeLabel(period, anchor)}
        </span>
      </div>
    </div>
  );
}
