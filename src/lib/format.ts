const KYIV = "Europe/Kyiv";

export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

export function formatKyiv(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: KYIV,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function relativeFromNow(
  iso: string | null | undefined,
  now = Date.now(),
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.round((now - date.getTime()) / 60_000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} ч назад`;
  return `${Math.round(hours / 24)} дн назад`;
}

/** 1 строка, 2 строки, 5 строк */
export function formatRowCount(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return `${n} строк`;
  if (last === 1) return `${n} строка`;
  if (last >= 2 && last <= 4) return `${n} строки`;
  return `${n} строк`;
}

export function formatSslSummary(metrics: {
  sslErrors: number;
  sslSoon: number;
  sslMinDays: number | null;
  sslMaxDays: number | null;
}): string {
  const alerts = `${metrics.sslErrors} / ${metrics.sslSoon}`;
  if (metrics.sslMinDays == null || metrics.sslMaxDays == null) return alerts;
  const range = `${metrics.sslMinDays}–${metrics.sslMaxDays} дн`;
  if (metrics.sslErrors || metrics.sslSoon) return `${range} · ${alerts}`;
  return range;
}

