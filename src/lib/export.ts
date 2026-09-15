import { formatKyiv } from "./format";
import { CSV_INDEX_SLOTS, indexReportPages, isIndexSkip } from "./index";
import { hostnameOf } from "./site";
import type { IndexPage, SiteRow } from "../types";

export const NOT_INDEXED_CSV_HEADER = [
  "хост",
  "страница",
  "URL",
  "статус",
  "причина Google",
  "каноникал",
  "проверка",
] as const;

const CSV_SEP = ";";

export type NotIndexedStatus = "noindex" | "stale" | "не в индексе";

export type NotIndexedPage = {
  host: string;
  slot: string;
  url: string;
  status: NotIndexedStatus;
  coverage: string;
  canonical: string;
  checkedAt: string;
};

const SLOT_ORDER = new Map<string, number>(
  CSV_INDEX_SLOTS.map((slot, index) => [slot, index]),
);

function notIndexedStatus(page: IndexPage): NotIndexedStatus {
  if (page.stale === true) return "stale";
  if (String(page.coverageState || "").toLowerCase().includes("noindex")) {
    return "noindex";
  }
  return "не в индексе";
}

/** CSV-слоты с `indexed === false`. Skip-сайты и `null`/ошибки Google не входят. */
export function collectNotIndexedPages(rows: SiteRow[]): NotIndexedPage[] {
  const byHost = new Map<string, SiteRow>();
  for (const row of rows) {
    if (isIndexSkip(row) || !row.index) continue;
    const host = hostnameOf(row.url);
    if (!host || byHost.has(host)) continue;
    byHost.set(host, row);
  }

  const items: NotIndexedPage[] = [];
  for (const row of byHost.values()) {
    const host = hostnameOf(row.url);
    for (const page of indexReportPages(row)) {
      if (page.indexed !== false || !page.url) continue;
      const slot = String(page.slot || "").toLowerCase();
      if (!SLOT_ORDER.has(slot)) continue;
      items.push({
        host,
        slot,
        url: page.url,
        status: notIndexedStatus(page),
        coverage: page.coverageState || "",
        canonical: page.googleCanonical || "",
        checkedAt: page.checked_at || "",
      });
    }
  }

  items.sort((a, b) => {
    const byHostName = a.host.localeCompare(b.host);
    if (byHostName) return byHostName;
    return (SLOT_ORDER.get(a.slot) ?? 99) - (SLOT_ORDER.get(b.slot) ?? 99);
  });
  return items;
}

function csvCell(value: string): string {
  if (/[";\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function csvCheckedAt(iso: string): string {
  if (!iso) return "";
  const label = formatKyiv(iso);
  return label === "—" ? iso : label;
}

/** CSV для русской Excel: `sep=;`, колонки через `;`, дата по Киеву. */
export function notIndexedCsv(items: NotIndexedPage[]): string {
  const lines = [
    `sep=${CSV_SEP}`,
    NOT_INDEXED_CSV_HEADER.join(CSV_SEP),
    ...items.map((item) =>
      [
        item.host,
        item.slot,
        item.url,
        item.status,
        item.coverage,
        item.canonical,
        csvCheckedAt(item.checkedAt),
      ]
        .map(csvCell)
        .join(CSV_SEP),
    ),
    "",
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function notIndexedFileName(now = new Date()): string {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `not-indexed-${ymd}.csv`;
}
