import type { SiteRow, SortDir, SortKey, TableFilter } from "../types";
import {
  hasIndexData,
  indexReportPages,
  isIndexBad,
  isIndexOk,
  isIndexPartial,
  isIndexSkip,
  isIndexStale,
  isIndexUnknown,
  isNoindex,
  indexSortScore,
} from "./index";
import {
  hostnameOf,
  isSslSoon,
  nsMatchOf,
  nsProvider,
  nsReason,
  sslDaysLeft,
  zoneOf,
} from "./site";

export function matchesFilter(row: SiteRow, filter: TableFilter): boolean {
  if (filter === "200") return row.status === 200;
  if (filter === "302") return row.status === 302;
  if (filter === "503") return row.status === 503;
  if (filter === "down") return !row.alive;
  if (filter === "ns") return nsReason(row) !== null;
  if (filter === "nsok") return nsMatchOf(row) === true;
  if (filter === "nsbad") return nsMatchOf(row) === false;
  if (filter === "nsskip") return nsMatchOf(row) == null;
  if (filter === "ssl") return isSslSoon(row);
  if (filter === "indexok") return isIndexOk(row);
  if (filter === "indexbad") return isIndexBad(row);
  if (filter === "indexpartial") return isIndexPartial(row);
  if (filter === "indexstale") return isIndexStale(row);
  if (filter === "indexnoindex") return isNoindex(row);
  if (filter === "indexskip") return isIndexSkip(row);
  if (filter === "indexunknown") return isIndexUnknown(row);
  return true;
}

export function matchesQuery(row: SiteRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const ns = (row.dns?.ns ?? []).join(" ").toLowerCase();
  const expected = (row.ns_expected ?? []).join(" ").toLowerCase();
  const indexPages = indexReportPages(row);
  const indexText = [
    row.index?.coverageState,
    row.index?.error,
    row.index?.siteUrl,
    ...indexPages.map((page) => page.url),
    ...indexPages.map((page) => page.slot),
    ...indexPages.map((page) => page.coverageState),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    row.url.toLowerCase().includes(needle) ||
    hostnameOf(row.url).toLowerCase().includes(needle) ||
    zoneOf(row.url).toLowerCase().includes(needle) ||
    nsProvider(row.dns?.ns).toLowerCase().includes(needle) ||
    ns.includes(needle) ||
    expected.includes(needle) ||
    indexText.includes(needle)
  );
}

function compareRows(a: SiteRow, b: SiteRow, sortKey: SortKey): number {
  if (sortKey === "duration") return (a.duration || 0) - (b.duration || 0);
  if (sortKey === "status") {
    return String(a.status).localeCompare(String(b.status), "ru");
  }
  if (sortKey === "zone") {
    return zoneOf(a.url).localeCompare(zoneOf(b.url), "ru");
  }
  return hostnameOf(a.url).localeCompare(hostnameOf(b.url), "ru");
}

export function filterAndSortRows(
  rows: SiteRow[],
  query: string,
  filter: TableFilter,
  sortKey: SortKey,
  sortDir: SortDir,
): SiteRow[] {
  const direction = sortDir === "asc" ? 1 : -1;
  return rows
    .filter((row) => matchesFilter(row, filter) && matchesQuery(row, query))
    .sort((a, b) => {
      if (sortKey === "ssl") {
        const left = sslDaysLeft(a);
        const right = sslDaysLeft(b);
        if (left == null && right == null) {
          return hostnameOf(a.url).localeCompare(hostnameOf(b.url), "ru");
        }
        if (left == null) return 1;
        if (right == null) return -1;
        return direction * (left - right);
      }
      if (sortKey === "index") {
        const left = indexSortScore(a);
        const right = indexSortScore(b);
        if (left == null && right == null) {
          return hostnameOf(a.url).localeCompare(hostnameOf(b.url), "ru");
        }
        if (left == null) return 1;
        if (right == null) return -1;
        return direction * (left - right);
      }
      return direction * compareRows(a, b, sortKey);
    });
}

export function nextSort(
  currentKey: SortKey,
  currentDir: SortDir,
  nextKey: SortKey,
): { sortKey: SortKey; sortDir: SortDir } {
  if (currentKey === nextKey) {
    return {
      sortKey: currentKey,
      sortDir: currentDir === "asc" ? "desc" : "asc",
    };
  }
  return {
    sortKey: nextKey,
    sortDir:
      nextKey === "host" ||
      nextKey === "zone" ||
      nextKey === "ssl" ||
      nextKey === "index"
        ? "asc"
        : "desc",
  };
}

export function hasIndexColumn(rows: SiteRow[]): boolean {
  return rows.some((row) => hasIndexData(row) || isIndexSkip(row));
}
