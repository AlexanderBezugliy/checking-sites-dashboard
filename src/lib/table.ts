import type { SiteRow, SortDir, SortKey, TableFilter } from "../types";
import {
  hasIndexData,
  indexReportPages,
  isIndexBad,
  isIndexIssue,
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
  httpColumnLabel,
  isOwnHomeRedirect,
  isLiveSslProblem,
  nsMatchOf,
  nsProvider,
  nsReason,
  sslDaysLeft,
  zoneOf,
} from "./site";
import { cloakLabel, isCloaked } from "./cloak";
import { fleetHostSet, isFleetDrop, isSiteUpForDashboard } from "./drop";
import { subfolderFolderLabel, subfolderGlueLabel, subfolderOf } from "./subfolder";

export function matchesFilter(
  row: SiteRow,
  filter: TableFilter,
  fleetHosts: Set<string>,
): boolean {
  if (filter === "200") {
    return (row.status === 200 || isOwnHomeRedirect(row)) && !isCloaked(row);
  }
  if (filter === "302") {
    return row.status === 302 && !isCloaked(row) && !isOwnHomeRedirect(row);
  }
  if (filter === "503") return isCloaked(row);
  if (filter === "down") return !isSiteUpForDashboard(row, fleetHosts);
  if (filter === "ns") return nsReason(row) !== null;
  if (filter === "nsok") return nsMatchOf(row) === true;
  if (filter === "nsbad") return nsMatchOf(row) === false;
  if (filter === "nsskip") return nsMatchOf(row) == null;
  if (filter === "ssl") return isLiveSslProblem(row);
  if (filter === "indexissue") return isIndexIssue(row);
  if (filter === "indexok") return isIndexOk(row);
  if (filter === "indexbad") return isIndexBad(row);
  if (filter === "indexpartial") return isIndexPartial(row);
  if (filter === "indexstale") return isIndexStale(row);
  if (filter === "indexnoindex") return isNoindex(row);
  if (filter === "indexskip") return isIndexSkip(row) && !isFleetDrop(row, fleetHosts);
  if (filter === "indexdrop") return isFleetDrop(row, fleetHosts);
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
  const sub = subfolderOf(row);
  const subfolderText = [
    sub?.folder,
    sub?.csv,
    sub?.glue,
    sub?.live_folder,
    sub?.error,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const cloakText = isCloaked(row) ? "503" : "";
  const dropText = row.redirect?.foreign ? `drop ${row.redirect.location || ""}` : "";
  const httpText = httpColumnLabel(row).toLowerCase();
  return (
    row.url.toLowerCase().includes(needle) ||
    hostnameOf(row.url).toLowerCase().includes(needle) ||
    zoneOf(row.url).toLowerCase().includes(needle) ||
    nsProvider(row.dns?.ns).toLowerCase().includes(needle) ||
    ns.includes(needle) ||
    expected.includes(needle) ||
    indexText.includes(needle) ||
    subfolderText.includes(needle) ||
    cloakText.includes(needle) ||
    dropText.toLowerCase().includes(needle) ||
    httpText.includes(needle)
  );
}

function textRank(value: string): string {
  const text = value.trim();
  return !text || text === "—" ? "" : text;
}

function compareText(a: string, b: string, direction: number, hostA: string, hostB: string): number {
  const left = textRank(a);
  const right = textRank(b);
  if (!left && !right) return hostA.localeCompare(hostB, "ru");
  if (!left) return 1;
  if (!right) return -1;
  const byText = left.localeCompare(right, "ru");
  if (byText !== 0) return direction * byText;
  return hostA.localeCompare(hostB, "ru");
}

function compareNumber(
  left: number | null,
  right: number | null,
  direction: number,
  hostA: string,
  hostB: string,
): number {
  if (left == null && right == null) return hostA.localeCompare(hostB, "ru");
  if (left == null) return 1;
  if (right == null) return -1;
  if (left === right) return hostA.localeCompare(hostB, "ru");
  return direction * (left - right);
}

function gscNumber(row: SiteRow, key: "clicks" | "impressions" | "position" | "ctr"): number | null {
  const value = row.gsc?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function compareRows(a: SiteRow, b: SiteRow, sortKey: SortKey): number {
  if (sortKey === "duration") return (a.duration || 0) - (b.duration || 0);
  if (sortKey === "status") {
    const byCode = httpColumnLabel(a).localeCompare(httpColumnLabel(b), "ru");
    if (byCode !== 0) return byCode;
    return hostnameOf(a.url).localeCompare(hostnameOf(b.url), "ru");
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
  const fleetHosts = fleetHostSet(rows);
  return rows
    .filter((row) => matchesFilter(row, filter, fleetHosts) && matchesQuery(row, query))
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
      const hostA = hostnameOf(a.url);
      const hostB = hostnameOf(b.url);
      if (sortKey === "clicks" || sortKey === "impressions" || sortKey === "position" || sortKey === "ctr") {
        return compareNumber(gscNumber(a, sortKey), gscNumber(b, sortKey), direction, hostA, hostB);
      }
      if (sortKey === "cloak") {
        return compareText(cloakLabel(a.cloak ?? null), cloakLabel(b.cloak ?? null), direction, hostA, hostB);
      }
      if (sortKey === "subfolder") {
        return compareText(
          subfolderFolderLabel(subfolderOf(a)),
          subfolderFolderLabel(subfolderOf(b)),
          direction,
          hostA,
          hostB,
        );
      }
      if (sortKey === "glue") {
        return compareText(
          subfolderGlueLabel(subfolderOf(a)?.glue),
          subfolderGlueLabel(subfolderOf(b)?.glue),
          direction,
          hostA,
          hostB,
        );
      }
      if (sortKey === "ns") {
        const left = (a.dns?.ns ?? []).join(" ") || nsReason(a) || "";
        const right = (b.dns?.ns ?? []).join(" ") || nsReason(b) || "";
        return compareText(left, right, direction, hostA, hostB);
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
      nextKey === "index" ||
      nextKey === "position" ||
      nextKey === "cloak" ||
      nextKey === "subfolder" ||
      nextKey === "glue" ||
      nextKey === "ns"
        ? "asc"
        : "desc",
  };
}

export function hasIndexColumn(rows: SiteRow[]): boolean {
  return rows.some((row) => hasIndexData(row) || isIndexSkip(row));
}
