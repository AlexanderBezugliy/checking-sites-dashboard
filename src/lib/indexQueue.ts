import { indexReportPages, isCsvIndexSlot, isIndexSkip } from "./index";
import type { IndexPage, SiteRow } from "../types";

/** SpeedyIndex Google indexer, pay-per-result. Держать вместе с проверкой баланса на сервере. */
export const INDEX_SUBMIT_TOKENS = 100;

export function isIndexSubmitPage(page: IndexPage): boolean {
  if (!isCsvIndexSlot(page.slot) || !page.url) return false;
  if (page.indexed !== false || page.stale === true) return false;
  return !String(page.coverageState || "").toLowerCase().includes("noindex");
}

/** Страницы, которые можно отправить: не в индексе, без noindex и без stale. Дроп не отправляем. */
export function indexSubmitPages(row: SiteRow, isDrop = false): IndexPage[] {
  if (isDrop || isIndexSkip(row) || row.index?.noindex === true) return [];
  return indexReportPages(row).filter(isIndexSubmitPage);
}

export function indexSubmitUrls(
  row: SiteRow,
  sent: ReadonlySet<string>,
  isDrop = false,
): string[] {
  return indexSubmitPages(row, isDrop)
    .map((page) => page.url)
    .filter((url) => !sent.has(url));
}

/** Винительный падеж: «1 страницу», «2 страницы», «5 страниц». */
export function indexSubmitCountLabel(count: number): string {
  const n = Math.abs(count);
  const mod10 = n % 10;
  const mod100 = n % 100;
  const noun =
    mod10 === 1 && mod100 !== 11
      ? "страницу"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "страницы"
        : "страниц";
  return `${count} ${noun}`;
}
