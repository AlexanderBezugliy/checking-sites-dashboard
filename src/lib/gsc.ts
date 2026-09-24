import type { GscInfo } from "../types";

export type GscTone = "up" | "down" | "flat";

export type GscChange = {
  text: string;
  tone: GscTone;
};

const nf = new Intl.NumberFormat("ru-RU");

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

export function gscTitle(info: GscInfo | null | undefined): string {
  if (!info) return "Нет аккаунта Search Console";
  if (info.error && info.impressions == null) return info.error;
  const range = info.start && info.end ? `${info.start} — ${info.end}` : "";
  const prev = info.prev_start && info.prev_end ? `${info.prev_start} — ${info.prev_end}` : "";
  const stale = info.stale ? " Данные вчерашние, сегодняшний запрос не удался." : "";
  return `Последние 7 дней ${range} против ${prev}.${stale}`.trim();
}
