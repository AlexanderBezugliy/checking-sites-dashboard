import { isIndexSkip } from "./index";
import { hostnameOf, isSiteUp } from "./site";
import type { SiteRow } from "../types";

function hostKey(url: string): string {
  return hostnameOf(url).replace(/\.$/, "").toLowerCase();
}

/** Хосты текущего status.json — money и дропы в одном флоте. */
export function fleetHostSet(rows: SiteRow[]): Set<string> {
  const hosts = new Set<string>();
  for (const row of rows) {
    const host = hostKey(row.url);
    if (host) hosts.add(host);
  }
  return hosts;
}

export function redirectTargetHost(
  location: string | null | undefined,
  fromUrl: string,
): string {
  if (!location) return "";
  try {
    return hostKey(new URL(location, fromUrl).href);
  } catch {
    return "";
  }
}

function redirectStatus(row: SiteRow): number | null {
  const fromRedirect = row.redirect?.status;
  if (typeof fromRedirect === "number") return fromRedirect;
  return typeof row.status === "number" ? row.status : null;
}

/**
 * Рабочий дроп: нет в CSV (GSC skip), 301 на другой хост **этого же** флота.
 * 302, увод на google.com, money→money с аккаунтом — не дроп.
 */
export function isFleetDrop(row: SiteRow, fleetHosts: Set<string>): boolean {
  if (!fleetHosts.size || !isIndexSkip(row)) return false;
  if (row.redirect?.foreign !== true) return false;
  if (redirectStatus(row) !== 301) return false;
  const self = hostKey(row.url);
  const target = redirectTargetHost(row.redirect.location, row.url);
  if (!self || !target || target === self) return false;
  return fleetHosts.has(target);
}

/** Живой для панели: обычные 200/302/503 плюс рабочий дроп. */
export function isSiteUpForDashboard(
  row: SiteRow,
  fleetHosts: Set<string>,
): boolean {
  if (isFleetDrop(row, fleetHosts)) return true;
  return isSiteUp(row);
}

export function dropTargetLabel(row: SiteRow): string {
  const host = redirectTargetHost(row.redirect?.location, row.url);
  return host || row.redirect?.location || "";
}
