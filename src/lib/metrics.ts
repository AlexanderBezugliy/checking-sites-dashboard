import type {
  IndexProblem,
  LatencyBucket,
  Metrics,
  NamedCount,
  NsMismatch,
  NsProblem,
  SiteRow,
  StatusPayload,
} from "../types";
import {
  hasIndexData,
  indexReason,
  indexRatioLabel,
  isIndexBad,
  isIndexOk,
  isIndexPartial,
  isIndexSkip,
  isIndexStale,
  isIndexUnknown,
  isNoindex,
} from "./index";
import {
  hostnameOf,
  nsMatchOf,
  nsProvider,
  nsReason,
  SSL_WARN_DAYS,
  statusLabel,
  zoneOf,
} from "./site";

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

function indexProblemOf(row: SiteRow): IndexProblem | null {
  if (isIndexSkip(row) || !row.index) return null;
  if (!isIndexBad(row) && !isIndexStale(row) && !isIndexPartial(row)) return null;
  return {
    url: row.url,
    host: hostnameOf(row.url),
    reason: indexReason(row),
    ratio: indexRatioLabel(row),
  };
}

function indexBucket(row: SiteRow): keyof Pick<
  Metrics,
  | "homesIndexed"
  | "homesNotIndexed"
  | "homesUnknown"
  | "homesStale"
  | "homesNoindex"
  | "homesSkip"
> | null {
  if (isIndexSkip(row)) return "homesSkip";
  if (isNoindex(row)) return "homesNoindex";
  if (isIndexStale(row)) return "homesStale";
  if (isIndexUnknown(row)) return "homesUnknown";
  if (isIndexBad(row)) return "homesNotIndexed";
  if (isIndexOk(row)) return "homesIndexed";
  return "homesUnknown";
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
  const nsMismatches: NsMismatch[] = [];
  const indexProblems: IndexProblem[] = [];
  const indexBad: IndexProblem[] = [];
  const indexStale: IndexProblem[] = [];
  const indexPartial: IndexProblem[] = [];

  let http200 = 0;
  let http302 = 0;
  let cloak503 = 0;
  let otherHttp = 0;
  let dnsErrors = 0;
  let sslErrors = 0;
  let sslSoon = 0;
  let foreignRedirects = 0;
  let nsMatchOk = 0;
  let nsMatchBad = 0;
  let nsMatchSkip = 0;
  let homesIndexed = 0;
  let homesNotIndexed = 0;
  let homesUnknown = 0;
  let homesStale = 0;
  let homesNoindex = 0;
  let homesSkip = 0;
  let homesPartial = 0;
  let pagesIndexedTotal = 0;
  let pagesCheckedTotal = 0;
  const sslDays: number[] = [];

  for (const row of rows) {
    if (row.status === 200) http200 += 1;
    else if (row.status === 302) http302 += 1;
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

    const match = nsMatchOf(row);
    if (match === true) nsMatchOk += 1;
    else if (match === false) {
      nsMatchBad += 1;
      nsMismatches.push({
        url: row.url,
        host: hostnameOf(row.url),
        expected: row.ns_expected ?? [],
        live: row.dns?.ns ?? [],
      });
    } else nsMatchSkip += 1;

    const bucket = indexBucket(row);
    if (bucket === "homesIndexed") homesIndexed += 1;
    else if (bucket === "homesNotIndexed") homesNotIndexed += 1;
    else if (bucket === "homesUnknown") homesUnknown += 1;
    else if (bucket === "homesStale") homesStale += 1;
    else if (bucket === "homesNoindex") homesNoindex += 1;
    else if (bucket === "homesSkip") homesSkip += 1;

    if (isIndexPartial(row)) homesPartial += 1;
    if (hasIndexData(row)) {
      pagesIndexedTotal += row.index?.pages_indexed ?? 0;
      pagesCheckedTotal += row.index?.pages_checked ?? 0;
    }

    const problem = indexProblemOf(row);
    if (problem) {
      indexProblems.push(problem);
      if (isIndexStale(row)) indexStale.push(problem);
      else if (isIndexBad(row)) indexBad.push(problem);
      else if (isIndexPartial(row)) indexPartial.push(problem);
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
    http302,
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
    nsMatchOk,
    nsMatchBad,
    nsMatchSkip,
    nsMismatches,
    slowest,
    duplicateUrls: [...urlCounts.values()].filter((count) => count > 1).length,
    homesIndexed,
    homesNotIndexed,
    homesUnknown,
    homesStale,
    homesNoindex,
    homesSkip,
    homesPartial,
    pagesIndexedTotal,
    pagesCheckedTotal,
    indexQueueCursor: payload.index_queue_cursor ?? null,
    indexProblems,
    indexBad,
    indexStale,
    indexPartial,
  };
}

export function httpMixParts(metrics: Metrics) {
  const other = Math.max(
    0,
    metrics.total - metrics.http200 - metrics.http302 - metrics.cloak503,
  );
  const total = Math.max(
    1,
    metrics.http200 + metrics.http302 + metrics.cloak503 + other,
  );
  return {
    total,
    other,
    okShare: metrics.http200 / total,
    redirectShare: metrics.http302 / total,
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
    return `Проблемы: ${metrics.failed}/${metrics.total}\nЖивые (DNS + 200/503): ${metrics.alive}\nHTTP 200: ${metrics.http200} | редирект 302: ${metrics.http302} | клоака 503: ${metrics.cloak503}\n${downs}${slowBlock}`;
  }

  return `Всё тихо: ${metrics.alive}/${metrics.total} живые (DNS + 200/503)\nHTTP 200: ${metrics.http200} | редирект 302: ${metrics.http302} | клоака 503: ${metrics.cloak503}${slowBlock}`;
}
