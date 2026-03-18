import { daysInMonth, fmtDate } from "@/lib/dates";
import type { HabitCompletionMap } from "@/lib/habits";
import type { Habit, HabitCompletionStatus } from "@/lib/types";

const WEEKDAY_INITIAL_PT = ["D", "S", "T", "Q", "Q", "S", "S"];

export type HabitMonthExportFormat = "svg" | "png" | "pdf";

type MonthDayMeta = {
  dateISO: string;
  day: number;
  initial: string;
  weekend: boolean;
  isToday: boolean;
};

type SvgResult = {
  svg: string;
  width: number;
  height: number;
  filenameBase: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function buildMonthMeta(anchor: Date) {
  const year = anchor.getFullYear();
  const monthIndex0 = anchor.getMonth();
  const totalDays = daysInMonth(year, monthIndex0);
  const now = new Date();
  const todayISO = fmtDate(now.getFullYear(), now.getMonth(), now.getDate());

  const days: MonthDayMeta[] = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, monthIndex0, day);
    const dow = date.getDay();
    const dateISO = fmtDate(year, monthIndex0, day);

    return {
      dateISO,
      day,
      initial: WEEKDAY_INITIAL_PT[dow] ?? "",
      weekend: dow === 0 || dow === 6,
      isToday: dateISO === todayISO,
    };
  });

  const monthValue = String(monthIndex0 + 1).padStart(2, "0");

  return {
    label: monthLabel(anchor),
    todayISO,
    year,
    monthIndex0,
    days,
    filenameBase: `habitos-${year}-${monthValue}`,
  };
}

function statusMarkup(status: HabitCompletionStatus | null, color: string, x: number, y: number, size: number) {
  const inset = 1;
  const innerX = x + inset;
  const innerY = y + inset;
  const innerSize = size - inset * 2;

  if (status === "done") {
    return [
      `<rect x="${innerX}" y="${innerY}" width="${innerSize}" height="${innerSize}" rx="5" fill="${color}" stroke="${color}" />`,
      `<text x="${x + size / 2}" y="${y + size / 2 + 3.5}" text-anchor="middle" font-size="10" font-weight="700" fill="#ffffff">✓</text>`,
    ].join("");
  }

  if (status === "partial") {
    return [
      `<rect x="${innerX}" y="${innerY}" width="${innerSize}" height="${innerSize}" rx="5" fill="#ffffff" stroke="${color}" />`,
      `<rect x="${innerX}" y="${innerY}" width="${Math.floor(innerSize / 2)}" height="${innerSize}" fill="${color}" />`,
    ].join("");
  }

  if (status === "missed") {
    return [
      `<rect x="${innerX}" y="${innerY}" width="${innerSize}" height="${innerSize}" rx="5" fill="#fff1f2" stroke="#ef4444" />`,
      `<text x="${x + size / 2}" y="${y + size / 2 + 3.5}" text-anchor="middle" font-size="10" font-weight="700" fill="#dc2626">x</text>`,
    ].join("");
  }

  return `<rect x="${innerX}" y="${innerY}" width="${innerSize}" height="${innerSize}" rx="5" fill="transparent" stroke="#94a3b8" />`;
}

export function createHabitMonthSvg({
  anchor,
  habits,
  completionMap,
}: {
  anchor: Date;
  habits: Habit[];
  completionMap: HabitCompletionMap;
}): SvgResult {
  const month = buildMonthMeta(anchor);
  const pagePadding = 28;
  const titleHeight = 36;
  const subtitleHeight = 20;
  const legendHeight = 34;
  const tableHeaderHeight = 56;
  const rowHeight = 42;
  const cellSize = 28;
  const tableRadius = 24;

  const longestTitle = habits.reduce((max, habit) => Math.max(max, habit.title.length), 12);
  const firstColWidth = clamp(longestTitle * 7.2 + 42, 190, 340);
  const totalRows = Math.max(habits.length, 1);
  const tableWidth = firstColWidth + month.days.length * cellSize;
  const tableHeight = tableHeaderHeight + totalRows * rowHeight;
  const width = pagePadding * 2 + tableWidth;
  const height = pagePadding * 2 + titleHeight + subtitleHeight + legendHeight + tableHeight + 18;
  const tableX = pagePadding;
  const tableY = pagePadding + titleHeight + subtitleHeight + legendHeight;

  const legendItems = [
    { label: "Concluido", color: "#22c55e", status: "done" as const },
    { label: "Parcial", color: "#22c55e", status: "partial" as const },
    { label: "Nao realizado", color: "#ef4444", status: "missed" as const },
    { label: "Sem marcacao", color: "#94a3b8", status: null },
  ];

  const columnBackgrounds = month.days
    .map((day, index) => {
      const x = tableX + firstColWidth + index * cellSize;
      const fill = day.isToday ? "#dcfce7" : day.weekend ? "#fef3c7" : "#ffffff";
      return `<rect x="${x}" y="${tableY}" width="${cellSize}" height="${tableHeight}" fill="${fill}" />`;
    })
    .join("");

  const headerCells = month.days
    .map((day, index) => {
      const x = tableX + firstColWidth + index * cellSize;
      return [
        `<rect x="${x}" y="${tableY}" width="${cellSize}" height="${tableHeaderHeight}" fill="transparent" stroke="#e2e8f0" />`,
        `<text x="${x + cellSize / 2}" y="${tableY + 21}" text-anchor="middle" font-size="11" font-weight="700" fill="${day.isToday ? "#047857" : day.weekend ? "#b45309" : "#0f172a"}">${day.day}</text>`,
        `<text x="${x + cellSize / 2}" y="${tableY + 36}" text-anchor="middle" font-size="10" font-weight="${day.isToday ? "700" : "500"}" fill="${day.isToday ? "#047857" : day.weekend ? "#d97706" : "#64748b"}">${day.initial}</text>`,
      ].join("");
    })
    .join("");

  const rows = habits.length
    ? habits
        .map((habit, rowIndex) => {
          const rowY = tableY + tableHeaderHeight + rowIndex * rowHeight;
          const title = escapeXml(habit.title);

          const cells = month.days
            .map((day, dayIndex) => {
              const x = tableX + firstColWidth + dayIndex * cellSize;
              const markerSize = 16;
              const markerX = x + (cellSize - markerSize) / 2;
              const markerY = rowY + (rowHeight - markerSize) / 2;
              const status = completionMap[`${habit.id}:${day.dateISO}`] ?? null;

              return [
                `<rect x="${x}" y="${rowY}" width="${cellSize}" height="${rowHeight}" fill="transparent" stroke="#e2e8f0" />`,
                statusMarkup(status, habit.color, markerX, markerY, markerSize),
              ].join("");
            })
            .join("");

          return [
            `<rect x="${tableX}" y="${rowY}" width="${firstColWidth}" height="${rowHeight}" fill="#ffffff" stroke="#e2e8f0" />`,
            `<text x="${tableX + 14}" y="${rowY + 25}" font-size="13" font-style="italic" font-weight="700" fill="${habit.color}">${title}</text>`,
            cells,
          ].join("");
        })
        .join("")
    : [
        `<rect x="${tableX}" y="${tableY + tableHeaderHeight}" width="${tableWidth}" height="${rowHeight}" fill="#ffffff" stroke="#e2e8f0" />`,
        `<text x="${tableX + 16}" y="${tableY + tableHeaderHeight + 25}" font-size="13" fill="#475569">Nenhum habito cadastrado neste momento.</text>`,
      ].join("");

  const legend = legendItems
    .map((item, index) => {
      const x = pagePadding + index * 158;
      const y = pagePadding + titleHeight + subtitleHeight + 10;
      return [
        statusMarkup(item.status, item.color, x, y, 16),
        `<text x="${x + 24}" y="${y + 12}" font-size="12" font-weight="600" fill="#475569">${item.label}</text>`,
      ].join("");
    })
    .join("");

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">`,
    `<rect width="${width}" height="${height}" rx="28" fill="#f8fafc" />`,
    `<text x="${pagePadding}" y="${pagePadding + 6}" font-size="24" font-weight="700" fill="#0f172a">Tabela de Habitos</text>`,
    `<text x="${pagePadding}" y="${pagePadding + 28}" font-size="14" fill="#475569">Mes exportado: ${escapeXml(month.label)}</text>`,
    legend,
    `<rect x="${tableX}" y="${tableY}" width="${tableWidth}" height="${tableHeight}" rx="${tableRadius}" fill="#ffffff" stroke="#cbd5e1" />`,
    columnBackgrounds,
    `<rect x="${tableX}" y="${tableY}" width="${firstColWidth}" height="${tableHeaderHeight}" fill="#e5e7eb" stroke="#cbd5e1" />`,
    `<text x="${tableX + 16}" y="${tableY + 31}" font-size="15" font-weight="700" fill="#111827">Habitos</text>`,
    headerCells,
    rows,
    `</svg>`,
  ].join("");

  return {
    svg,
    width,
    height,
    filenameBase: month.filenameBase,
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function svgToCanvas(svg: string, width: number, height: number) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Nao foi possivel renderizar a tabela."));
      img.src = url;
    });

    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Nao foi possivel criar o canvas da exportacao.");
    }

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadHabitMonthExport({
  anchor,
  habits,
  completionMap,
  format,
}: {
  anchor: Date;
  habits: Habit[];
  completionMap: HabitCompletionMap;
  format: HabitMonthExportFormat;
}) {
  const { svg, width, height, filenameBase } = createHabitMonthSvg({
    anchor,
    habits,
    completionMap,
  });

  if (format === "svg") {
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${filenameBase}.svg`);
    return;
  }

  const canvas = await svgToCanvas(svg, width, height);

  if (format === "png") {
    const dataUrl = canvas.toDataURL("image/png");
    const anchorElement = document.createElement("a");
    anchorElement.href = dataUrl;
    anchorElement.download = `${filenameBase}.png`;
    anchorElement.click();
    return;
  }

  const pngDataUrl = canvas.toDataURL("image/png");
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
  });

  pdf.addImage(pngDataUrl, "PNG", 0, 0, width, height);
  pdf.save(`${filenameBase}.pdf`);
}
