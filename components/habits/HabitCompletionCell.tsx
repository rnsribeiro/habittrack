"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import { habitCompletionLabel } from "@/lib/habits";
import type { HabitCompletionStatus } from "@/lib/types";

function markAppearance(status: HabitCompletionStatus | null, color: string) {
  if (status === "done") {
    return {
      className: "flex items-center justify-center rounded-[6px] border text-[11px] font-bold text-white",
      style: {
        borderColor: color,
        backgroundColor: color,
      } satisfies CSSProperties,
      label: "\u2713",
    };
  }

  if (status === "partial") {
    return {
      className: "rounded-[6px] border",
      style: {
        borderColor: color,
        background: `linear-gradient(90deg, ${color} 50%, rgba(255,255,255,0.92) 50%)`,
      } satisfies CSSProperties,
      label: "",
    };
  }

  return {
    className: "rounded-[6px] border border-zinc-400 bg-transparent",
    style: {} satisfies CSSProperties,
    label: "",
  };
}

export function HabitCompletionCell({
  status,
  color,
  canMark,
  className,
  style,
  onClick,
  label,
}: {
  status: HabitCompletionStatus | null;
  color: string;
  canMark: boolean;
  className: string;
  style: CSSProperties;
  onClick?: () => void;
  label: string;
}) {
  const { locale } = useI18n();
  const mark = markAppearance(status, color);

  return (
    <button
      type="button"
      className={[
        className,
        canMark ? "cursor-pointer hover:bg-emerald-100/80" : "cursor-default",
        "touch-manipulation focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
      ].join(" ")}
      style={style}
      onClick={canMark ? onClick : undefined}
      disabled={!canMark}
      aria-label={`${label} - ${habitCompletionLabel(status, locale)}`}
      title={`${label} - ${habitCompletionLabel(status, locale)}`}
    >
      <span
        className={mark.className}
        style={{
          width: "clamp(10px, calc(var(--cell) * 0.6), 16px)",
          height: "clamp(10px, calc(var(--cell) * 0.6), 16px)",
          ...mark.style,
        }}
      >
        {mark.label}
      </span>
    </button>
  );
}
