// src/lib/period.ts
export type Period = "week" | "month" | "quarter" | "semester" | "year";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Semana começando na segunda (pt-BR)
export function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 dom..6 sab
  const diff = day === 0 ? -6 : 1 - day; // segunda
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfWeek(date: Date) {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(0, 0, 0, 0);
  return e;
}

export function startOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfQuarter(date: Date) {
  const m = date.getMonth();
  const qStart = Math.floor(m / 3) * 3;
  const d = new Date(date.getFullYear(), qStart, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfQuarter(date: Date) {
  const s = startOfQuarter(date);
  const d = new Date(s.getFullYear(), s.getMonth() + 3, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfSemester(date: Date) {
  const m = date.getMonth();
  const semStart = m < 6 ? 0 : 6;
  const d = new Date(date.getFullYear(), semStart, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfSemester(date: Date) {
  const s = startOfSemester(date);
  const d = new Date(s.getFullYear(), s.getMonth() + 6, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfYear(date: Date) {
  const d = new Date(date.getFullYear(), 0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfYear(date: Date) {
  const d = new Date(date.getFullYear(), 12, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getPeriodRange(anchor: Date, period: Period) {
  if (period === "week") {
    const start = startOfWeek(anchor);
    const end = endOfWeek(anchor);
    return { start, end };
  }
  if (period === "month") {
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    return { start, end };
  }
  if (period === "quarter") {
    const start = startOfQuarter(anchor);
    const end = endOfQuarter(anchor);
    return { start, end };
  }
  if (period === "semester") {
    const start = startOfSemester(anchor);
    const end = endOfSemester(anchor);
    return { start, end };
  }
  const start = startOfYear(anchor);
  const end = endOfYear(anchor);
  return { start, end };
}

// move o anchor para o período anterior/próximo
export function shiftAnchor(anchor: Date, period: Period, delta: number) {
  const d = new Date(anchor);
  d.setHours(0, 0, 0, 0);

  if (period === "week") d.setDate(d.getDate() + 7 * delta);
  else if (period === "month") d.setMonth(d.getMonth() + delta);
  else if (period === "quarter") d.setMonth(d.getMonth() + 3 * delta);
  else if (period === "semester") d.setMonth(d.getMonth() + 6 * delta);
  else d.setFullYear(d.getFullYear() + delta);

  return d;
}

export function formatRangeLabel(period: Period, anchor: Date) {
  const { start, end } = getPeriodRange(anchor, period);

  const fmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (period === "month") {
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(start);
  }

  if (period === "quarter") {
    const q = Math.floor(start.getMonth() / 3) + 1;
    return `T${q} de ${start.getFullYear()}`;
  }

  if (period === "semester") {
    const s = start.getMonth() === 0 ? 1 : 2;
    return `${s}º semestre de ${start.getFullYear()}`;
  }

  if (period === "year") {
    return String(start.getFullYear());
  }

  // week
  return `${fmt.format(start)} — ${fmt.format(end)}`;
}
