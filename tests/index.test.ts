import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  indexHomeLabel,
  indexKind,
  indexRatioLabel,
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
    expect(indexRatioLabel(partial)).toBe("8/10");
    expect(indexHomeLabel(partial)).toBe("~ 8/10");
    expect(isIndexPartial(partial)).toBe(true);
    expect(isIndexOk(partial)).toBe(true);
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

  it("does not mix noindex into indexbad", () => {
    const bad = filterAndSortRows(rows, "", "indexbad", "host", "asc");
    expect(bad.every((item) => !item.index?.noindex)).toBe(true);
  });
});
