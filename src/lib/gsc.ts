import { hostnameOf } from "./site";
import type { GscInfo, StatusPayload } from "../types";

export type GscTone = "up" | "down" | "flat";

export type GscChange = {
  text: string;
  tone: GscTone;
};

export type GscFoot = {
  was: string;
  change: string | null;
  tone: GscTone;
};

const nf = new Intl.NumberFormat("ru-RU");

export type GscPeriodId = "7" | "14" | "28" | "90" | "180";

export const GSC_PERIODS: { id: GscPeriodId; days: number; label: string }[] = [
  { id: "7", days: 7, label: "7 дней" },
  { id: "14", days: 14, label: "14 дней" },
  { id: "28", days: 28, label: "28 дней" },
  { id: "90", days: 90, label: "3 месяца" },
  { id: "180", days: 180, label: "6 месяцев" },
];

export function gscPeriodDays(id: GscPeriodId): number {
  return GSC_PERIODS.find((item) => item.id === id)?.days ?? 14;
}

function addDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

type GscDay = [string, number, number, number | null];

function isGscDay(value: unknown): value is GscDay {
  return Array.isArray(value) && typeof value[0] === "string";
}

/** Клики, показы и место с весом по показам, как в Search Console. */
export function sumGscDays(
  days: GscInfo["days"],
  start: string,
  end: string,
): {
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
} {
  let clicks = 0;
  let impressions = 0;
  let posSum = 0;
  let posWeight = 0;
  for (const point of days ?? []) {
    if (!isGscDay(point)) continue;
    const [day, rawClicks, rawImpr, rawPos] = point;
    if (day < start || day > end) continue;
    const dayClicks = Number(rawClicks) || 0;
    const dayImpr = Number(rawImpr) || 0;
    clicks += dayClicks;
    impressions += dayImpr;
    if (typeof rawPos === "number" && Number.isFinite(rawPos) && dayImpr > 0) {
      posSum += rawPos * dayImpr;
      posWeight += dayImpr;
    }
  }
  return {
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : null,
    position: posWeight ? Math.round((posSum / posWeight) * 100) / 100 : null,
  };
}

/**
 * Подменяет суммы в `gsc` на выбранную длину, конец — `info.end`.
 * Без ряда по дням 14-дневный снимок остаётся как есть.
 */
export function projectGsc(
  info: GscInfo | null | undefined,
  periodDays: number,
): GscInfo | null | undefined {
  if (!info) return info;
  const end = info.end;
  if (!info.days?.length || !end) {
    if (periodDays === 14) return info;
    return {
      ...info,
      clicks: null,
      impressions: null,
      ctr: null,
      position: null,
      prev_clicks: null,
      prev_impressions: null,
      prev_ctr: null,
      prev_position: null,
      error: info.error || "Для этого периода нет ряда по дням",
    };
  }
  const start = addDays(end, -(periodDays - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(periodDays - 1));
  const current = sumGscDays(info.days, start, end);
  const prev = sumGscDays(info.days, prevStart, prevEnd);
  return {
    ...info,
    start,
    end,
    prev_start: prevStart,
    prev_end: prevEnd,
    clicks: current.clicks,
    impressions: current.impressions,
    ctr: current.ctr,
    position: current.position,
    prev_clicks: prev.clicks,
    prev_impressions: prev.impressions,
    prev_ctr: prev.ctr,
    prev_position: prev.position,
  };
}

export function formatGscCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return nf.format(Math.round(value));
}

export function formatGscPosition(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

export function formatGscCtr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

/** (текущее − прошлое) / прошлое. Ноль в прошлом периоде — процента нет. */
export function percentChange(
  current: number | null | undefined,
  previous: number | null | undefined,
): GscChange | null {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) {
    return null;
  }
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.05) return { text: "0%", tone: "flat" };
  const tone: GscTone = pct > 0 ? "up" : "down";
  const arrow = pct > 0 ? "↑" : "↓";
  return { text: `${arrow} ${Math.abs(pct).toFixed(1)}%`, tone };
}

/**
 * Позиция: меньше — лучше. Стрелка вверх, когда число уменьшилось.
 * Разница в пунктах, как на эталонной панели, без знака процента.
 */
export function positionChange(
  current: number | null | undefined,
  previous: number | null | undefined,
): GscChange | null {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) {
    return null;
  }
  const improved = previous - current;
  if (Math.abs(improved) < 0.05) return { text: "0", tone: "flat" };
  const tone: GscTone = improved > 0 ? "up" : "down";
  const arrow = improved > 0 ? "↑" : "↓";
  return { text: `${arrow} ${Math.abs(improved).toFixed(1)}`, tone };
}

export function countFoot(
  current: number | null | undefined,
  previous: number | null | undefined,
): GscFoot {
  const was = `было ${formatGscCount(previous)}`;
  if (current == null || previous == null) return { was: "нет данных", change: null, tone: "flat" };
  if (previous === 0 && current === 0) return { was: "было 0", change: null, tone: "flat" };
  if (previous === 0 && current > 0) return { was: "было 0", change: "появились", tone: "up" };
  const change = percentChange(current, previous);
  if (!change || change.tone === "flat") {
    return { was, change: "без изменений", tone: "flat" };
  }
  return { was, change: change.text, tone: change.tone };
}

export function positionFoot(
  current: number | null | undefined,
  previous: number | null | undefined,
): GscFoot {
  if (current == null) return { was: "нет показов", change: null, tone: "flat" };
  if (previous == null) return { was: "раньше места не было", change: null, tone: "flat" };
  const was = `было ${formatGscPosition(previous)}`;
  const improved = previous - current;
  if (Math.abs(improved) < 0.05) return { was, change: "так же", tone: "flat" };
  const tone: GscTone = improved > 0 ? "up" : "down";
  const word = improved > 0 ? "лучше" : "хуже";
  return { was, change: `${word} на ${Math.abs(improved).toFixed(1)}`, tone };
}

export function shareFoot(
  current: number | null | undefined,
  previous: number | null | undefined,
): GscFoot {
  if (current == null) return { was: "нет показов", change: null, tone: "flat" };
  const was = previous == null ? "раньше доли не было" : `было ${formatGscCtr(previous)}`;
  if (previous == null || previous === 0) {
    return { was: "было 0%", change: null, tone: "flat" };
  }
  const change = percentChange(current, previous);
  if (!change || change.tone === "flat") return { was, change: "так же", tone: "flat" };
  return { was, change: change.tone === "up" ? "лучше" : "хуже", tone: change.tone };
}

/** Оба окна без показов: сравнивать нечего. */
export function gscWasAbsent(info: GscInfo): boolean {
  const now = info.impressions ?? 0;
  const prev = info.prev_impressions ?? 0;
  return now === 0 && prev === 0;
}

/** Окно из монитора: даты текущего периода против предыдущего. */
const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function splitDay(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** «6–19 октября» или «22 сентября – 5 октября». */
export function formatGscRange(start: string, end: string): string {
  const from = splitDay(start);
  const to = splitDay(end);
  if (!from || !to) return `${start} — ${end}`;
  if (from.y === to.y && from.m === to.m) {
    return `${from.d}–${to.d} ${MONTHS[to.m - 1]}`;
  }
  const fromText = `${from.d} ${MONTHS[from.m - 1]}${from.y === to.y ? "" : ` ${from.y}`}`;
  const toText = `${to.d} ${MONTHS[to.m - 1]}${from.y === to.y ? "" : ` ${to.y}`}`;
  return `${fromText} – ${toText}`;
}

/** Подпись под выбором периода: текущие даты и такой же прошлый отрезок. */
export function gscPeriodSentence(info: GscInfo | null | undefined): string {
  if (!info?.start || !info?.end) return "";
  const current = formatGscRange(info.start, info.end);
  if (!info.prev_start || !info.prev_end) return `${current}.`;
  return `${current}. Сравнение с ${formatGscRange(info.prev_start, info.prev_end)}.`;
}

export function gscWindowLabel(info: GscInfo | null | undefined): string {
  if (!info) return "";
  const range = info.start && info.end ? `${info.start} — ${info.end}` : "";
  const prev = info.prev_start && info.prev_end ? `${info.prev_start} — ${info.prev_end}` : "";
  if (range && prev) return `${range} против ${prev}`;
  return range || prev;
}

export function gscFleetWindow(rows: { gsc?: GscInfo | null }[]): string {
  for (const row of rows) {
    const label = gscWindowLabel(row.gsc);
    if (label) return label;
  }
  return "";
}

export function payloadHasGsc(payload: StatusPayload): boolean {
  return payload.data.some((row) => row.gsc?.impressions != null);
}

/** К утреннему status.json приклеить клики из снимка, где блок Google ещё был. */
export function mergeGsc(current: StatusPayload, source: StatusPayload): StatusPayload {
  const byHost = new Map<string, GscInfo>();
  for (const row of source.data) {
    if (row.gsc?.impressions == null) continue;
    byHost.set(hostnameOf(row.url), row.gsc);
  }
  if (!byHost.size) return current;
  return {
    ...current,
    gsc_last_update: current.gsc_last_update || source.gsc_last_update || null,
    data: current.data.map((row) => {
      if (row.gsc?.impressions != null) return row;
      const gsc = byHost.get(hostnameOf(row.url));
      return gsc ? { ...row, gsc } : row;
    }),
  };
}

export function gscTitle(info: GscInfo | null | undefined): string {
  if (!info) return "Нет аккаунта Search Console";
  if (info.error && info.impressions == null) return info.error;
  const windowLabel = gscWindowLabel(info);
  const stale = info.stale ? " Данные вчерашние, сегодняшний запрос не удался." : "";
  if (!windowLabel) return stale.trim() || "Нет дат окна Search Console";
  return `${windowLabel}.${stale}`.trim();
}
