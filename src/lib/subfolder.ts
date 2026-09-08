import type { SiteRow, SubfolderGlue, SubfolderInfo, SubfolderMatch } from "../types";

/** Ключ есть и это объект — даже все `null` после аптайма. */
export function hasSubfolderData(row: SiteRow): boolean {
  return row.subfolder != null && typeof row.subfolder === "object";
}

export function hasSubfolderColumn(rows: SiteRow[]): boolean {
  return rows.some(hasSubfolderData);
}

export function subfolderOf(row: SiteRow): SubfolderInfo | null {
  return hasSubfolderData(row) ? row.subfolder! : null;
}

/** Имя из CSV. `live_folder` сюда не подставлять. */
export function subfolderFolderLabel(info: SubfolderInfo | null): string {
  const folder = info?.folder;
  return folder ? folder : "—";
}

export function subfolderGlueLabel(
  glue: SubfolderGlue | string | null | undefined,
): string {
  if (glue === "canonical") return "Canonical";
  if (glue === "301") return "301";
  return "—";
}

export function subfolderMatchOf(info: SubfolderInfo | null): SubfolderMatch {
  if (!info) return null;
  if (info.match === true) return true;
  if (info.match === false) return false;
  return null;
}

/** Тултип: ошибка при `match === null` и/или живая папка, если не как в CSV. */
export function subfolderHint(info: SubfolderInfo | null): string | undefined {
  if (!info) return undefined;
  const parts: string[] = [];
  if (info.match === null && info.error) parts.push(info.error);
  if (info.live_folder) parts.push(`на сайте: ${info.live_folder}`);
  return parts.length ? parts.join(" · ") : undefined;
}
