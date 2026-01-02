export function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function fmtDate(year: number, monthIndex0: number, day: number) {
  const mm = String(monthIndex0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function monthRangeISO(year: number, monthIndex0: number) {
  const start = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-01`;
  const end = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(
    daysInMonth(year, monthIndex0)
  ).padStart(2, "0")}`;
  return { start, end };
}
