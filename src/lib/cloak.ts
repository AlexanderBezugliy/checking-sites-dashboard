import type { CloakInfo, SiteRow } from "../types";

const SKIP_ERRORS = new Set(["foreign redirect", "probe blocked"]);

export function hasCloakData(row: SiteRow): boolean {
  return row.cloak != null && typeof row.cloak === "object";
}

export function hasCloakColumn(rows: SiteRow[]): boolean {
  return rows.some(hasCloakData);
}

export function cloakOf(row: SiteRow): CloakInfo | null {
  return hasCloakData(row) ? row.cloak! : null;
}

/**
 * `false` — без ключа открылся 200, клоаки нет.
 * `true` / не 200 и не 503 — в колонке 503.
 * foreign / blocked / нет замера — не клоака.
 */
export function isCloaked(row: SiteRow): boolean {
  const info = cloakOf(row);
  if (!info) return row.status === 503;
  if (info.present === true) return true;
  if (info.present === false) return false;
  return isUnconfirmedCloak(info);
}

export function isUnconfirmedCloak(info: CloakInfo): boolean {
  if (info.present !== null) return false;
  const err = (info.error || "").trim();
  if (!err || SKIP_ERRORS.has(err)) return false;
  if (err === "bypass not confirmed") return true;
  if (/^A \S+, not 200\/503$/.test(err)) return true;
  return false;
}

/** `—` только при `present === false` или когда замер сорвался. Иначе `503`. */
export function cloakLabel(info: CloakInfo | null): string {
  if (!info) return "—";
  if (info.present === false) return "—";
  if (info.present === true || isUnconfirmedCloak(info)) return "503";
  return "—";
}

export function cloakHint(info: CloakInfo | null): string | undefined {
  if (!info || info.present === true) return undefined;
  return info.error || undefined;
}
