import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  NOT_INDEXED_CSV_HEADER,
  collectNotIndexedPages,
  notIndexedCsv,
  notIndexedFileName,
} from "../src/lib/export";
import { isCsvIndexSlot, isIndexSkip } from "../src/lib/index";
import type { SiteRow, StatusPayload } from "../src/types";

const snapshot = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../public/status.json"),
    "utf8",
  ),
) as StatusPayload;

function row(partial: Partial<SiteRow> & Pick<SiteRow, "url" | "status">): SiteRow {
  return { ok: false, alive: true, ...partial };
}

describe("not-indexed export", () => {
  it("collects only indexed === false from CSV slots, skips skip-sites and null", () => {
    const rows: SiteRow[] = [
      row({
        url: "https://zeta.gb.net",
        status: 200,
        index: {
          indexed: true,
          pages: [
            { url: "https://zeta.gb.net/", slot: "home", indexed: true },
            {
              url: "https://zeta.gb.net/en-gb/bonuses/",
              slot: "bonus",
              indexed: false,
              coverageState: "Discovered - currently not indexed",
              checked_at: "2026-09-15T15:06:43.611Z",
            },
            {
              url: "https://zeta.gb.net/en-gb/login/",
              slot: "login",
              indexed: false,
              coverageState: "URL is unknown to Google",
            },
            // legal-URL из sitemap — не CSV-слот, в выгрузку не идёт
            { url: "https://zeta.gb.net/privacy-policy/", slot: "privacy-policy", indexed: false },
            // Google не ответил — это не «нет»
            { url: "https://zeta.gb.net/en-gb/app/", slot: "app", indexed: null, error: "INTERNAL" },
          ],
        },
      }),
      row({
        url: "https://alpha.it.com",
        status: 200,
        index: {
          indexed: false,
          noindex: true,
          pages: [
            {
              url: "https://alpha.it.com/",
              slot: "home",
              indexed: false,
              coverageState: "Excluded by ‘noindex’ tag",
            },
            {
              url: "https://alpha.it.com/login/",
              slot: "login",
              indexed: false,
              stale: true,
              coverageState: "Crawled - currently not indexed",
              googleCanonical: "https://alpha.it.com/login/",
            },
          ],
        },
      }),
      row({
        url: "https://skip.com",
        status: 200,
        index: {
          indexed: null,
          error: "нет в sites.csv / нет account",
          pages: [{ url: "https://skip.com/", slot: "home", indexed: false }],
        },
      }),
      row({ url: "https://none.com", status: 200, index: null }),
    ];
    // тот же хост второй строкой (как в живом status.json) — страницы не удваиваются
    rows.push({ ...rows[1], url: "https://alpha.it.com/?view=x", status: 302 });

    const items = collectNotIndexedPages(rows);
    // сортировка: хост, потом порядок слотов из CSV (home, login, …, bonus)
    expect(items.map((item) => `${item.host} ${item.slot}`)).toEqual([
      "alpha.it.com home",
      "alpha.it.com login",
      "zeta.gb.net login",
      "zeta.gb.net bonus",
    ]);
    expect(items.map((item) => item.status)).toEqual([
      "noindex",
      "stale",
      "не в индексе",
      "не в индексе",
    ]);
    expect(items[1]).toEqual({
      host: "alpha.it.com",
      slot: "login",
      url: "https://alpha.it.com/login/",
      status: "stale",
      coverage: "Crawled - currently not indexed",
      canonical: "https://alpha.it.com/login/",
      checkedAt: "",
    });
    expect(items.some((item) => item.slot === "privacy-policy")).toBe(false);
    expect(items.some((item) => item.slot === "app")).toBe(false);
    expect(items.some((item) => item.host === "skip.com")).toBe(false);
  });

  it("matches the fixture: deindexed home, noindex home, new-vegas app", () => {
    const items = collectNotIndexedPages(snapshot.data);
    const keys = items.map((item) => `${item.host} ${item.slot}`);
    expect(keys).toContain("fixture-deindexed.gb.net home");
    expect(keys).toContain("vibrobet.gb.net home");
    expect(keys).toContain("new-vegas-casino.gb.net app");
    expect(keys.some((key) => key.startsWith("myteamware"))).toBe(false);
    expect(items.find((item) => item.host === "vibrobet.gb.net")?.status).toBe("noindex");
    expect(items.length).toBe(
      snapshot.data
        .filter((item) => !isIndexSkip(item))
        .flatMap((item) => item.index?.pages ?? [])
        .filter((page) => page.indexed === false && isCsvIndexSlot(page.slot)).length,
    );
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("writes CSV with BOM, header and quoted cells", () => {
    const csv = notIndexedCsv([
      {
        host: "alpha.it.com",
        slot: "login",
        url: "https://alpha.it.com/login/",
        status: "не в индексе",
        coverage: 'Duplicate, "Google" chose different canonical',
        canonical: "https://other.com/login/",
        checkedAt: "2026-09-15T15:06:43.611Z",
      },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe(NOT_INDEXED_CSV_HEADER.join(","));
    expect(lines[0]).toBe("host,slot,url,status,coverage,google_canonical,checked_at");
    expect(lines[1]).toBe(
      'alpha.it.com,login,https://alpha.it.com/login/,не в индексе,"Duplicate, ""Google"" chose different canonical",https://other.com/login/,2026-09-15T15:06:43.611Z',
    );
    expect(lines[2]).toBe("");
    expect(notIndexedCsv([]).slice(1)).toBe(`${NOT_INDEXED_CSV_HEADER.join(",")}\r\n`);
  });

  it("names the file by date", () => {
    expect(notIndexedFileName(new Date("2026-09-15T20:30:00+03:00"))).toBe(
      "not-indexed-2026-09-15.csv",
    );
  });
});
