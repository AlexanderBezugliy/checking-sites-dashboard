import type {
  LatencyBucket,
  Metrics,
  NamedCount,
  NsProblem,
  StatusPayload,
} from "../types";
import { hostnameOf, nsProvider, nsReason, SSL_WARN_DAYS, statusLabel, zoneOf } from "./site";

const LATENCY_BUCKETS: Omit<LatencyBucket, "count">[] = [
  { label: "0–250", min: 0, max: 250 },
  { label: "250–500", min: 250, max: 500 },
  { label: "500–750", min: 500, max: 750 },
  { label: "750–1с", min: 750, max: 1000 },
  { label: "1–1.5с", min: 1000, max: 1500 },
  { label: "1.5–2с", min: 1500, max: 2000 },
  { label: "2с+", min: 2000, max: Infinity },
];

function percentile(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  const index = Math.min(
    sorted.length - 1,
    Math.floor((sorted.length - 1) * q),
  );
  return sorted[index];
}

function tally(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}

function toNamedCounts(map: Map<string, number>): NamedCount[] {
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeMetrics(payload: StatusPayload): Metrics {
  const rows = payload.data ?? [];
  const durations = rows
    .map((row) => row.duration)
    .filter((ms): ms is number => typeof ms === "number")
    .sort((a, b) => a - b);

  const zones = new Map<string, number>();
  const ns = new Map<string, number>();
  const urlCounts = new Map<string, number>();
  const nsProblems: NsProblem[] = [];

  let http200 = 0;
  let cloak503 = 0;
  let otherHttp = 0;
  let dnsErrors = 0;
  let sslErrors = 0;
  let sslSoon = 0;
  let foreignRedirects = 0;
  const sslDays: number[] = [];

  for (const row of rows) {
    if (row.status === 200) http200 += 1;
    else if (row.status === 503) cloak503 += 1;
    else if (typeof row.status === "number") otherHttp += 1;

    if (row.status === "DNS_ERROR" || row.dns?.ok === false) dnsErrors += 1;
    if (row.status === "SSL_ERROR") sslErrors += 1;
    if (row.ssl?.daysLeft != null && row.ssl.daysLeft <= SSL_WARN_DAYS) {
      sslSoon += 1;
    }
    if (typeof row.ssl?.daysLeft === "number") sslDays.push(row.ssl.daysLeft);
    if (row.redirect?.foreign) foreignRedirects += 1;

    tally(zones, zoneOf(row.url));
    tally(urlCounts, row.url);
    const provider = nsProvider(row.dns?.ns);
    if (provider !== "—") tally(ns, provider);

    const reason = nsReason(row);
    if (reason) {
      nsProblems.push({
        url: row.url,
        host: hostnameOf(row.url),
        reason,
        nameservers: row.dns?.ns ?? [],
      });
    }
  }

  const buckets: LatencyBucket[] = LATENCY_BUCKETS.map((bucket) => ({
    ...bucket,
    count: durations.filter((ms) => ms >= bucket.min && ms < bucket.max).length,
  }));

  const slowest = [...rows]
    .filter((row) => typeof row.duration === "number")
    .sort((a, b) => (b.duration || 0) - (a.duration || 0))
    .slice(0, 8);

  return {
    total: payload.total_sites ?? rows.length,
    alive: payload.alive_count ?? rows.filter((row) => row.alive).length,
    failed: payload.failed_count ?? rows.filter((row) => !row.alive).length,
    http200,
    cloak503,
    otherHttp,
    dnsErrors,
    sslErrors,
    sslSoon,
    sslMinDays: sslDays.length ? Math.min(...sslDays) : null,
    sslMaxDays: sslDays.length ? Math.max(...sslDays) : null,
    foreignRedirects,
    durationMin: durations[0] ?? null,
    durationP50: percentile(durations, 0.5),
    durationP95: percentile(durations, 0.95),
    durationMax: durations.at(-1) ?? null,
    buckets,
    zones: toNamedCounts(zones),
    nsProviders: toNamedCounts(ns),
    nsOk: rows.length - nsProblems.length,
    nsProblems,
    slowest,
    duplicateUrls: [...urlCounts.values()].filter((count) => count > 1).length,
  };
}

export function httpMixParts(metrics: Metrics) {
  const other = Math.max(0, metrics.total - metrics.http200 - metrics.cloak503);
  const total = Math.max(1, metrics.http200 + metrics.cloak503 + other);
  return {
    total,
    other,
    okShare: metrics.http200 / total,
    cloakShare: metrics.cloak503 / total,
    otherShare: other / total,
  };
}

/** Текст дайджеста в том же смысле, что бот шлёт в группу MONITOR. */
export function buildDigest(payload: StatusPayload, metrics: Metrics): string {
  const slow = metrics.slowest
    .slice(0, 3)
    .map((row) => `   • ${hostnameOf(row.url)} — ${row.duration}ms`)
    .join("\n");
  const slowBlock = slow ? `\n\nТоп медленных:\n${slow}` : "";

  if (metrics.failed > 0) {
    const downs = payload.data
      .filter((row) => !row.alive)
      .slice(0, 12)
      .map((row) => `   • ${hostnameOf(row.url)} — ${statusLabel(row)}`)
      .join("\n");
    return `Проблемы: ${metrics.failed}/${metrics.total}\nЖивые (DNS + 200/503): ${metrics.alive}\nHTTP 200: ${metrics.http200} | клоака 503: ${metrics.cloak503}\n${downs}${slowBlock}`;
  }

  return `Всё тихо: ${metrics.alive}/${metrics.total} живые (DNS + 200/503)\nHTTP 200: ${metrics.http200} | клоака 503: ${metrics.cloak503}${slowBlock}`;
}
