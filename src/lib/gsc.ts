import type { GscInfo } from "../types";

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

export function gscTitle(info: GscInfo | null | undefined): string {
  if (!info) return "Нет аккаунта Search Console";
  if (info.error && info.impressions == null) return info.error;
  const range = info.start && info.end ? `${info.start} — ${info.end}` : "";
  const prev = info.prev_start && info.prev_end ? `${info.prev_start} — ${info.prev_end}` : "";
  const stale = info.stale ? " Данные вчерашние, сегодняшний запрос не удался." : "";
  return `Последние 14 дней ${range} против ${prev}.${stale}`.trim();
}
