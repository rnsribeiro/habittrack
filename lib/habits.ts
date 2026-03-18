import type { HabitCompletionStatus } from "@/lib/types";

export type HabitCompletionMap = Record<string, HabitCompletionStatus>;

export function nextHabitCompletionStatus(status: HabitCompletionStatus | null | undefined) {
  if (!status) return "done" as const;
  if (status === "done") return "partial" as const;
  if (status === "partial") return "missed" as const;
  return null;
}

export function habitCompletionWeight(status: HabitCompletionStatus | null | undefined) {
  if (status === "done") return 1;
  if (status === "partial") return 0.5;
  return 0;
}

export function formatHabitScore(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function canMarkHabitDate(dateISO: string, todayISO: string) {
  return dateISO <= todayISO;
}

export function habitCompletionLabel(status: HabitCompletionStatus | null | undefined) {
  if (status === "done") return "Concluido";
  if (status === "partial") return "Parcial";
  if (status === "missed") return "Nao realizado";
  return "Sem marcacao";
}
