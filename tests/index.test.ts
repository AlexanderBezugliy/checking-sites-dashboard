import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  indexCanonicalHint,
  indexHomeLabel,
  indexKind,
  indexNotIndexedPageLabels,
  indexPartialDetail,
  indexRatioLabel,
  indexReportPages,
  isCsvIndexSlot,
  isIndexBad,
  isIndexOk,
  isIndexPartial,
  isIndexSkip,
  isIndexStale,
  isIndexUnknown,
  isNoindex,
} from "../src/lib/index";
import { computeMetrics } from "../src/lib/metrics";
import { filterAndSortRows } from "../src/lib/table";
import type { SiteRow, StatusPayload } from "../src/types";

const snapshot = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../public/status.json"),
    "utf8",
  ),
) as StatusPayload;

function row(partial: Partial<SiteRow> & Pick<SiteRow, "url" | "status">): SiteRow {
  return {
    ok: false,
    alive: true,
    ...partial,
  };
}

describe("index helpers", () => {
  it("classifies skip via null index or csv error", () => {
    expect(
      isIndexSkip(
        row({
          url: "https://skip.com",
          status: 200,
          index: null,
        }),
      ),
    ).toBe(true);
    expect(
      isIndexSkip(
        row({
          url: "https://csv.com",
          status: 200,
          index: {
            indexed: null,
            error: "нет в sites.csv / нет account",
            pages: [],
          },
        }),
      ),
    ).toBe(true);
    expect(isIndexSkip(snapshot.data.find((item) => item.url.includes("myteamware"))!)).toBe(
      true,
    );
  });

  it("separates noindex from real deindex", () => {
    const noindex = snapshot.data.find((item) => item.url.includes("vibrobet"))!;
    const bad = snapshot.data.find((item) => item.url.includes("fixture-deindexed"))!;
    expect(isNoindex(noindex)).toBe(true);
    expect(isIndexBad(noindex)).toBe(false);
    expect(indexKind(noindex)).toBe("noindex");
    expect(isIndexBad(bad)).toBe(true);
    expect(indexKind(bad)).toBe("bad");
  });

  it("uses pages_checked as ratio denominator", () => {
    const partial = snapshot.data.find((item) => item.url.includes("new-vegas"))!;
    expect(indexRatioLabel(partial)).toBe("7/8");
    expect(indexHomeLabel(partial)).toBe("7/8");
    // очередь ещё не дошла до всех слотов CSV — показываем, из скольких
    const queued = row({
      url: "https://rollettocasino-official.co.uk",
      status: 200,
      index: {
        indexed: true,
        pages_total: 9,
        pages_indexed: 1,
        pages_checked: 1,
        pages: [{ url: "https://rollettocasino-official.co.uk/", slot: "home", indexed: true }],
      },
    });
    expect(indexRatioLabel(queued)).toBe("1/1 из 9");
    expect(indexHomeLabel(queued)).toBe("1/1 из 9");
    const stale = snapshot.data.find((item) => item.url.includes("justincasino"))!;
    expect(indexRatioLabel(stale)).toBe("1/1 из 14");
    expect(indexHomeLabel(stale)).toBe("? stale");
    const nothing = row({
      url: "https://nothing.gb.net",
      status: 200,
      index: { indexed: null, pages_total: 9, pages_indexed: 0, pages_checked: 0, pages: [] },
    });
    expect(indexRatioLabel(nothing)).toBe("—");
    expect(isIndexPartial(partial)).toBe(true);
    expect(isIndexOk(partial)).toBe(true);
    expect(indexNotIndexedPageLabels(partial)).toEqual(["app"]);
    expect(indexPartialDetail(partial)).toBe("app");
    expect(indexReportPages(partial).map((page) => page.slot)).toEqual([
      "home",
      "login",
      "app",
      "register",
      "games",
      "bet",
      "bonus",
      "deposit",
    ]);
  });

  it("hides sitemap leftover slots and does not remap bonuses from the URL", () => {
    const leftover = snapshot.data.find((item) => item.url.includes("new-vegas"))!;
    const slots = leftover.index?.pages?.map((page) => page.slot) ?? [];
    expect(slots).toContain("contact-us");
    expect(slots).toContain("privacy-policy");
    expect(slots).toContain("bonuses");
    expect(indexReportPages(leftover).some((page) => page.slot === "bonuses")).toBe(
      false,
    );
    expect(indexNotIndexedPageLabels(leftover)).not.toContain("contact-us");
    expect(indexNotIndexedPageLabels(leftover)).not.toContain("privacy-policy");
    expect(indexNotIndexedPageLabels(leftover)).not.toContain("bonuses");
    expect(isCsvIndexSlot("bonus")).toBe(true);
    expect(isCsvIndexSlot("bonuses")).toBe(false);
    expect(isCsvIndexSlot("-bonus")).toBe(false);
  });

  it("does not mark a site partial only because legal sitemap pages are noindex", () => {
    const legalOnly = row({
      url: "https://legal-only.gb.net",
      status: 200,
      index: {
        indexed: true,
        noindex: false,
        pages_total: 8,
        pages_indexed: 8,
        pages_checked: 8,
        pages: [
          {
            url: "https://legal-only.gb.net/",
            slot: "home",
            indexed: true,
          },
          {
            url: "https://legal-only.gb.net/login/",
            slot: "login",
            indexed: true,
          },
          {
            url: "https://legal-only.gb.net/privacy-policy/",
            slot: "privacy-policy",
            indexed: false,
          },
        ],
      },
    });
    expect(isIndexPartial(legalOnly)).toBe(false);
    expect(indexKind(legalOnly)).toBe("ok");
    expect(indexNotIndexedPageLabels(legalOnly)).toEqual([]);
  });

  it("marks stale separately from unknown permission errors", () => {
    const stale = snapshot.data.find((item) => item.url.includes("justincasino"))!;
    const unknown = snapshot.data.find((item) => item.url.includes("basswin-casino-official"))!;
    expect(isIndexStale(stale)).toBe(true);
    expect(indexKind(stale)).toBe("stale");
    expect(isIndexUnknown(unknown)).toBe(true);
    expect(isIndexStale(unknown)).toBe(false);
    expect(indexKind(unknown)).toBe("unknown");
  });
});

describe("index metrics from fixture", () => {
  const metrics = computeMetrics(snapshot);

  it("aggregates mutually exclusive home buckets", () => {
    expect(metrics.homesIndexed).toBe(1);
    expect(metrics.homesNotIndexed).toBe(1);
    expect(metrics.homesNoindex).toBe(1);
    expect(metrics.homesSkip).toBe(1);
    expect(metrics.homesStale).toBe(1);
    expect(metrics.homesUnknown).toBe(1);
    expect(metrics.homesPartial).toBe(1);
    expect(
      metrics.homesIndexed +
        metrics.homesNotIndexed +
        metrics.homesUnknown +
        metrics.homesStale +
        metrics.homesNoindex +
        metrics.homesSkip,
    ).toBe(snapshot.total_sites);
  });

  it("sums page counters across fleet", () => {
    const indexed = snapshot.data.reduce(
      (sum, item) => sum + (item.index?.pages_indexed ?? 0),
      0,
    );
    const checked = snapshot.data.reduce(
      (sum, item) => sum + (item.index?.pages_checked ?? 0),
      0,
    );
    expect(metrics.pagesIndexedTotal).toBe(indexed);
    expect(metrics.pagesCheckedTotal).toBe(checked);
    expect(metrics.indexQueueCursor).toBe(snapshot.index_queue_cursor);
  });

  it("builds problem lists for strip", () => {
    expect(metrics.indexBad).toHaveLength(1);
    expect(metrics.indexPartial).toHaveLength(1);
    expect(metrics.indexPartial[0]?.reason).toBe("app");
    expect(metrics.indexStale).toHaveLength(1);
    expect(metrics.indexProblems).toHaveLength(3);
  });
});

describe("index table filters", () => {
  const rows = snapshot.data;

  it("filters by index state", () => {
    expect(filterAndSortRows(rows, "", "indexok", "host", "asc")).toHaveLength(2);
    expect(filterAndSortRows(rows, "", "indexbad", "host", "asc")).toHaveLength(1);
    expect(filterAndSortRows(rows, "", "indexpartial", "host", "asc")).toHaveLength(1);
    expect(filterAndSortRows(rows, "", "indexstale", "host", "asc")).toHaveLength(1);
    expect(filterAndSortRows(rows, "", "indexnoindex", "host", "asc")).toHaveLength(1);
    expect(filterAndSortRows(rows, "", "indexskip", "host", "asc")).toHaveLength(1);
    expect(filterAndSortRows(rows, "", "indexunknown", "host", "asc")).toHaveLength(1);
  });

  it("shows a foreign googleCanonical and hides the same-page one", () => {
    expect(
      indexCanonicalHint({
        url: "https://winztercasino.gb.net/",
        indexed: true,
        googleCanonical: "https://tynemouth-priory-theatre.com/",
      }),
    ).toBe("tynemouth-priory-theatre.com/");
    expect(
      indexCanonicalHint({
        url: "https://bet-ninja-casino.org/how-to-register/",
        indexed: true,
        googleCanonical: "https://investorsincarers.com/how-to-register/",
      }),
    ).toBe("investorsincarers.com/how-to-register");
    expect(
      indexCanonicalHint({
        url: "https://winztercasino.gb.net/",
        indexed: true,
        googleCanonical: "https://www.winztercasino.gb.net/",
      }),
    ).toBeNull();
    const pbnHome = row({
      url: "https://winztercasino.gb.net",
      status: 302,
      index: {
        indexed: true,
        coverageState: "Duplicate, Google chose different canonical than user",
        pages: [
          {
            url: "https://winztercasino.gb.net/",
            slot: "home",
            indexed: true,
            googleCanonical: "https://tynemouth-priory-theatre.com/",
          },
        ],
      },
    });
    expect(isIndexOk(pbnHome)).toBe(true);
    expect(isIndexBad(pbnHome)).toBe(false);
    expect(indexKind(pbnHome)).toBe("ok");
  });

  it("hides the subfolder twin canonical but keeps foreign and other-path ones", () => {
    const twin = {
      url: "https://mrluck-casino.org.uk/en-gb/bonuses/",
      indexed: true,
      googleCanonical: "https://mrluck-casino.org.uk/bonuses/",
    };
    expect(indexCanonicalHint(twin, "en-gb")).toBeNull();
    expect(indexCanonicalHint(twin)).toBe("mrluck-casino.org.uk/bonuses");
    expect(indexCanonicalHint(twin, null)).toBe("mrluck-casino.org.uk/bonuses");
    expect(
      indexCanonicalHint(
        {
          url: "https://freshbet-uk.org/login/",
          indexed: true,
          googleCanonical: "https://freshbet-uk.org/en-gb/login/",
        },
        "en-gb",
      ),
    ).toBeNull();
    expect(
      indexCanonicalHint(
        { url: "https://freshbet-uk.org/", indexed: true, googleCanonical: "https://freshbet-uk.org/en-gb/" },
        "en-gb",
      ),
    ).toBeNull();
    // склейка в главную — другая страница, подсказку оставляем (адрес как у Google)
    expect(
      indexCanonicalHint(
        {
          url: "https://freshbet-uk.org/en-gb/login/",
          indexed: false,
          googleCanonical: "https://freshbet-uk.org/en-gb/",
        },
        "en-gb",
      ),
    ).toBe("freshbet-uk.org/en-gb");
    // другая подпапка — не наша пара
    expect(
      indexCanonicalHint(
        {
          url: "https://freshbet-uk.org/it/login/",
          indexed: false,
          googleCanonical: "https://freshbet-uk.org/login/",
        },
        "en-gb",
      ),
    ).toBe("freshbet-uk.org/login");
    // PBN с подпапкой — по-прежнему показываем чужой хост
    expect(
      indexCanonicalHint(
        {
          url: "https://bet-ninja-casino.org/en-gb/how-to-register/",
          indexed: true,
          googleCanonical: "https://investorsincarers.com/en-gb/how-to-register/",
        },
        "en-gb",
      ),
    ).toBe("investorsincarers.com/en-gb/how-to-register");
  });

  it("does not mix noindex into indexbad", () => {
    const bad = filterAndSortRows(rows, "", "indexbad", "host", "asc");
    expect(bad.every((item) => !item.index?.noindex)).toBe(true);
  });

  it("does not search leftover sitemap slots", () => {
    const byPrivacy = filterAndSortRows(rows, "privacy-policy", "all", "host", "asc");
    expect(byPrivacy.some((item) => item.url.includes("new-vegas"))).toBe(false);
    const byApp = filterAndSortRows(rows, "app", "all", "host", "asc");
    expect(byApp.some((item) => item.url.includes("new-vegas"))).toBe(true);
  });
});
