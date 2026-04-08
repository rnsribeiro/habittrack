import type { HabitCompletionStatus } from "@/lib/types";
import type { AppLocale } from "@/lib/locale";
import { intlLocale } from "@/lib/locale";

export type HabitCompletionMap = Record<string, HabitCompletionStatus>;

export function nextHabitCompletionStatus(status: HabitCompletionStatus | null | undefined) {
  if (!status || status === "missed") return "done" as const;
  if (status === "done") return "partial" as const;
  if (status === "partial") return null;
  return null;
}

export function habitCompletionWeight(status: HabitCompletionStatus | null | undefined) {
  if (status === "done") return 1;
  if (status === "partial") return 0.5;
  return 0;
}

export function formatHabitScore(value: number, locale: AppLocale = "pt") {
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function canMarkHabitDate(dateISO: string, todayISO: string) {
  return dateISO <= todayISO;
}

export function habitCompletionLabel(status: HabitCompletionStatus | null | undefined, locale: AppLocale = "pt") {
  if (status === "done") return locale === "en" ? "Done" : "Concluido";
  if (status === "partial") return locale === "en" ? "Partial" : "Parcial";
  return locale === "en" ? "Not marked" : "Sem marcacao";
}
