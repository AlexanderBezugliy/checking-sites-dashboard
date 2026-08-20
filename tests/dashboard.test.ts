import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hostnameOf, nsProvider, nsReason, statusKind, zoneOf } from "../src/lib/site";
import { computeMetrics, httpMixParts } from "../src/lib/metrics";
import { filterAndSortRows, nextSort } from "../src/lib/table";
import { formatRowCount, formatSslSummary, relativeFromNow } from "../src/lib/format";
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

describe("site helpers", () => {
  it("strips www and parses compound UK / gb.net zones", () => {
    expect(hostnameOf("https://www.example.co.uk/path")).toBe("example.co.uk");
    expect(zoneOf("https://slotscharm-casino.org.uk")).toBe("org.uk");
    expect(zoneOf("https://winbeastcasino.gb.net")).toBe("gb.net");
    expect(zoneOf("https://truefortune7.co.uk")).toBe("co.uk");
    expect(zoneOf("https://instaspin7.com")).toBe("com");
  });

  it("collapses nameservers to a provider", () => {
    expect(nsProvider(["gannon.ns.cloudflare.com", "stevie.ns.cloudflare.com"])).toBe(
      "cloudflare.com",
    );
    expect(nsProvider(["a.ns.example.com", "ns1.other.net"])).toBe("mixed");
    expect(nsProvider([])).toBe("—");
  });

  it("marks cloak vs down", () => {
    expect(statusKind(row({ url: "https://a.com", status: 503, alive: true }))).toBe(
      "cloak",
    );
    expect(statusKind(row({ url: "https://a.com", status: "DNS_ERROR", alive: false }))).toBe(
      "down",
    );
  });

  it("explains NS failures", () => {
    expect(
      nsReason(
        row({
          url: "https://dead.com",
          status: "DNS_ERROR",
          alive: false,
          dns: { ns: [], a: [], ok: false, error: "NS не найдены" },
        }),
      ),
    ).toBe("NS не найдены");
    expect(
      nsReason(row({ url: "https://ok.com", status: 200, alive: true })),
    ).toBeNull();
  });
});

describe("metrics from live snapshot", () => {
  const metrics = computeMetrics(snapshot);

  it("matches status.json totals", () => {
    expect(metrics.total).toBe(snapshot.total_sites);
    expect(metrics.alive).toBe(snapshot.alive_count);
    expect(metrics.failed).toBe(snapshot.failed_count);
    expect(metrics.http200).toBe(
      snapshot.data.filter((row) => row.status === 200).length,
    );
    expect(metrics.cloak503).toBe(
      snapshot.data.filter((row) => row.status === 503).length,
    );
    expect(metrics.http200 + metrics.cloak503 + metrics.otherHttp).toBe(
      snapshot.data.filter((row) => typeof row.status === "number").length,
    );
    expect(metrics.alive + metrics.failed).toBe(metrics.total);
  });

  it("counts duplicate URLs once per repeated address", () => {
    const urlCounts = new Map<string, number>();
    for (const row of snapshot.data) {
      urlCounts.set(row.url, (urlCounts.get(row.url) || 0) + 1);
    }
    expect(metrics.duplicateUrls).toBe(
      [...urlCounts.values()].filter((count) => count > 1).length,
    );
  });

  it("treats snapshot NS as healthy", () => {
    expect(metrics.nsProblems).toEqual([]);
    expect(metrics.nsOk).toBe(snapshot.data.length);
    expect(metrics.nsProviders[0]?.name).toBe("cloudflare.com");
  });

  it("places every timed site into a latency bucket", () => {
    const timed = snapshot.data.filter((item) => typeof item.duration === "number").length;
    expect(metrics.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(timed);
  });

  it("puts non-200/503 rows into the mix remainder once", () => {
    const payload: StatusPayload = {
      last_update: "2026-08-20T00:00:00Z",
      total_sites: 3,
      alive_count: 2,
      failed_count: 1,
      data: [
        row({ url: "https://a.com", status: 200 }),
        row({ url: "https://b.com", status: 503 }),
        row({ url: "https://c.com", status: "ERROR", alive: false, error: "timeout" }),
      ],
    };
    const mix = httpMixParts(computeMetrics(payload));
    expect(mix.other).toBe(1);
    expect(mix.okShare + mix.cloakShare + mix.otherShare).toBeCloseTo(1, 10);
  });

  it("reads SSL day range without counting healthy certs as soon", () => {
    const payload: StatusPayload = {
      last_update: "2026-08-20T00:00:00Z",
      total_sites: 2,
      alive_count: 2,
      failed_count: 0,
      data: [
        row({
          url: "https://a.com",
          status: 200,
          ssl: { daysLeft: 10, validTo: null },
        }),
        row({
          url: "https://b.com",
          status: 200,
          ssl: { daysLeft: 40, validTo: null },
        }),
      ],
    };
    const sslMetrics = computeMetrics(payload);
    expect(sslMetrics.sslMinDays).toBe(10);
    expect(sslMetrics.sslMaxDays).toBe(40);
    expect(sslMetrics.sslSoon).toBe(0);
    expect(sslMetrics.sslErrors).toBe(0);
  });
});

describe("table filter / sort", () => {
  const rows: SiteRow[] = [
    row({ url: "https://alpha.gb.net", status: 200, alive: true, duration: 100 }),
    row({ url: "https://beta.org.uk", status: 503, alive: true, duration: 400 }),
    row({ url: "https://down.com", status: "DNS_ERROR", alive: false, duration: 20 }),
  ];

  it("filters by cloak and query", () => {
    expect(filterAndSortRows(rows, "", "503", "host", "asc")).toHaveLength(1);
    expect(filterAndSortRows(rows, "gb.net", "all", "host", "asc")[0].url).toContain(
      "alpha",
    );
    expect(filterAndSortRows(rows, "", "down", "host", "asc")[0].url).toContain("down");
    expect(filterAndSortRows(rows, "", "ns", "host", "asc")).toHaveLength(1);
  });

  it("sorts duration desc by default toggle", () => {
    const sorted = filterAndSortRows(rows, "", "all", "duration", "desc");
    expect(sorted.map((item) => item.duration)).toEqual([400, 100, 20]);
    expect(nextSort("duration", "desc", "duration")).toEqual({
      sortKey: "duration",
      sortDir: "asc",
    });
  });

  it("filters SSL window and sorts missing days last", () => {
    const sslRows: SiteRow[] = [
      row({
        url: "https://ok.com",
        status: 200,
        ssl: { daysLeft: 40, validTo: null },
      }),
      row({
        url: "https://soon.com",
        status: 200,
        ssl: { daysLeft: 3, validTo: null },
      }),
      row({ url: "https://none.com", status: 503 }),
      row({ url: "https://dead-ssl.com", status: "SSL_ERROR", alive: false }),
    ];
    const soon = filterAndSortRows(sslRows, "", "ssl", "ssl", "asc");
    expect(soon.map((item) => item.url)).toEqual([
      "https://dead-ssl.com",
      "https://soon.com",
    ]);

    const bySsl = filterAndSortRows(sslRows, "", "all", "ssl", "asc");
    expect(bySsl.map((item) => item.url)).toEqual([
      "https://dead-ssl.com",
      "https://soon.com",
      "https://ok.com",
      "https://none.com",
    ]);
    expect(nextSort("duration", "desc", "ssl")).toEqual({
      sortKey: "ssl",
      sortDir: "asc",
    });
  });
});

describe("format", () => {
  it("speaks relative time in Russian", () => {
    const now = Date.parse("2026-08-20T12:00:00Z");
    expect(relativeFromNow("2026-08-20T11:50:00Z", now)).toBe("10 мин назад");
  });

  it("declines «строка»", () => {
    expect(formatRowCount(1)).toBe("1 строка");
    expect(formatRowCount(3)).toBe("3 строки");
    expect(formatRowCount(215)).toBe("215 строк");
  });

  it("formats SSL summary from metrics", () => {
    expect(
      formatSslSummary({
        sslErrors: 0,
        sslSoon: 0,
        sslMinDays: 39,
        sslMaxDays: 83,
      }),
    ).toBe("39–83 дн");
  });
});
