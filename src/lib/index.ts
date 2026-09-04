import type { IndexKind, IndexPage, SiteRow } from "../types";

const SKIP_ERROR_RE = /нет в sites\.csv|нет account/i;

/** Слоты колонки `pages` в sites.csv. Хвосты sitemap (contact-us, bonuses) сюда не входят. */
export const CSV_INDEX_SLOTS = [
  "home",
  "login",
  "app",
  "register",
  "games",
  "bet",
  "bonus",
  "deposit",
  "withdrawal",
  "payments",
  "faq",
  "casino",
] as const;

export type CsvIndexSlot = (typeof CSV_INDEX_SLOTS)[number];

const CSV_INDEX_SLOT_SET = new Set<string>(CSV_INDEX_SLOTS);

export function isCsvIndexSlot(slot: string | undefined | null): boolean {
  if (!slot) return false;
  if (slot.startsWith("-")) return false;
  return CSV_INDEX_SLOT_SET.has(slot.toLowerCase());
}

export function isIndexSkip(row: SiteRow): boolean {
  if (row.index == null) return true;
  return SKIP_ERROR_RE.test(row.index.error ?? "");
}

export function isNoindex(row: SiteRow): boolean {
  return row.index?.noindex === true;
}

export function hasIndexData(row: SiteRow): boolean {
  return row.index != null && !isIndexSkip(row);
}

export function indexPages(row: SiteRow): IndexPage[] {
  return row.index?.pages ?? [];
}

/** Страницы отчёта: только CSV-слоты. Старые sitemap-имена скрываются, без маппинга URL. */
export function indexReportPages(row: SiteRow): IndexPage[] {
  return indexPages(row).filter((page) => isCsvIndexSlot(page.slot));
}

export function isIndexStale(row: SiteRow): boolean {
  if (isIndexSkip(row)) return false;
  return indexReportPages(row).some((page) => page.stale === true);
}

export function isIndexUnknown(row: SiteRow): boolean {
  if (isIndexSkip(row) || !row.index) return false;
  if (isIndexStale(row)) return false;
  return row.index.indexed == null;
}

export function isIndexBad(row: SiteRow): boolean {
  return row.index?.indexed === false && row.index.noindex !== true;
}

export function isIndexOk(row: SiteRow): boolean {
  return row.index?.indexed === true;
}

export function isIndexPartial(row: SiteRow): boolean {
  const info = row.index;
  if (!info || info.indexed !== true) return false;
  return indexReportPages(row).some(
    (page) => page.slot !== "home" && page.indexed === false,
  );
}

/** Взаимоисключающий вид для компактной подписи. */
export function indexKind(row: SiteRow): IndexKind {
  if (isIndexSkip(row)) return "skip";
  if (isNoindex(row)) return "noindex";
  if (isIndexStale(row)) return "stale";
  if (isIndexUnknown(row)) return "unknown";
  if (isIndexBad(row)) return "bad";
  if (isIndexPartial(row)) return "partial";
  if (isIndexOk(row)) return "ok";
  return "unknown";
}

export function isIndexAutoExpand(row: SiteRow): boolean {
  return isIndexBad(row) || isIndexStale(row);
}

export function indexRatioLabel(row: SiteRow): string {
  const checked = row.index?.pages_checked ?? 0;
  const indexed = row.index?.pages_indexed ?? 0;
  if (checked <= 0) return "—";
  return `${indexed}/${checked}`;
}

export function indexHomeLabel(row: SiteRow): string {
  const kind = indexKind(row);
  if (kind === "skip") return "— skip";
  if (kind === "noindex") return "noindex";
  if (kind === "stale") return "? stale";
  if (kind === "unknown") return "? нет ответа";
  if (kind === "bad") return "✗ главная";
  const ratio = indexRatioLabel(row);
  if (kind === "partial") return `~ ${ratio}`;
  return `✓ ${ratio}`;
}

export function indexSortScore(row: SiteRow): number | null {
  if (isIndexSkip(row) || !row.index) return null;
  const checked = row.index.pages_checked ?? 0;
  if (checked <= 0) return row.index.indexed === true ? 1 : null;
  return (row.index.pages_indexed ?? 0) / checked;
}

export function indexProblemPages(row: SiteRow): IndexPage[] {
  return indexReportPages(row).filter(
    (page) =>
      page.stale === true ||
      page.indexed === false ||
      (page.indexed == null && Boolean(page.error)),
  );
}

/** CSV-имена внутренних страниц с indexed === false (без home). */
export function indexNotIndexedPageLabels(
  row: SiteRow,
  limit = 6,
): string[] {
  const labels = indexReportPages(row)
    .filter((page) => page.slot !== "home" && page.indexed === false)
    .map((page) => pageSlotLabel(page))
    .filter(Boolean);
  return limit > 0 ? labels.slice(0, limit) : labels;
}

export function pageSlotLabel(page: IndexPage): string {
  if (!isCsvIndexSlot(page.slot)) return "";
  return page.slot as string;
}

export function indexPartialDetail(row: SiteRow): string {
  const slots = indexNotIndexedPageLabels(row, 0);
  if (slots.length) return formatPageLabelList(slots, 5);
  const checked = row.index?.pages_checked ?? 0;
  const indexed = row.index?.pages_indexed ?? 0;
  if (checked > 0 && indexed < checked) {
    return `частично · ${indexed}/${checked}`;
  }
  return "частично";
}

function formatPageLabelList(labels: string[], maxShown: number): string {
  if (!labels.length) return "";
  const shown = labels.slice(0, maxShown);
  const rest = labels.length - shown.length;
  const list = shown.join(", ");
  return rest > 0 ? `${list} +${rest}` : list;
}

export function pageIndexKind(
  page: IndexPage,
): "ok" | "bad" | "stale" | "unknown" {
  if (page.stale === true) return "stale";
  if (page.indexed === true) return "ok";
  if (page.indexed === false) return "bad";
  return "unknown";
}

export function pageIndexLabel(page: IndexPage): string {
  const kind = pageIndexKind(page);
  if (kind === "stale") return "? stale";
  if (kind === "ok") return "✓ в индексе";
  if (kind === "bad") return "✗ нет";
  return page.error ? "? ошибка" : "—";
}

export function indexErrorLabel(error: string | null | undefined): string {
  if (!error) return "";
  if (SKIP_ERROR_RE.test(error)) return "нет account";
  if (/PERMISSION_DENIED/i.test(error)) return "нет доступа GSC";
  if (/INTERNAL/i.test(error)) return "Google не ответил";
  return error.length > 64 ? `${error.slice(0, 63)}…` : error;
}

export function indexReason(row: SiteRow): string {
  const kind = indexKind(row);
  if (kind === "skip") return "нет GSC / skip";
  if (kind === "noindex") return row.index?.coverageState || "noindex";
  if (kind === "stale") {
    return indexErrorLabel(row.index?.error) || "stale";
  }
  if (kind === "unknown") {
    return indexErrorLabel(row.index?.error) || "Google не ответил";
  }
  if (kind === "bad") {
    return row.index?.coverageState || "не в индексе";
  }
  if (kind === "partial") {
    return indexPartialDetail(row);
  }
  return "в индексе";
}
