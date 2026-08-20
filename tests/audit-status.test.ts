import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { config } from "../src/config";
import { formatSslSummary } from "../src/lib/format";
import { buildDigest, computeMetrics, httpMixParts } from "../src/lib/metrics";
import {
  SSL_WARN_DAYS,
  isSslSoon,
  nsReason,
  sslDaysLeft,
  sslLabel,
} from "../src/lib/site";
import { filterAndSortRows } from "../src/lib/table";
import type { StatusPayload } from "../src/types";

const localPayload = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../public/status.json"),
    "utf8",
  ),
) as StatusPayload;

function recount(payload: StatusPayload) {
  const rows = payload.data ?? [];
  const http200 = rows.filter((row) => row.status === 200).length;
  const cloak503 = rows.filter((row) => row.status === 503).length;
  const sslDays = rows
    .map((row) => row.ssl?.daysLeft)
    .filter((days): days is number => typeof days === "number");
  const urlCounts = new Map<string, number>();
  for (const row of rows) {
    urlCounts.set(row.url, (urlCounts.get(row.url) || 0) + 1);
  }

  return {
    rows: rows.length,
    alive: rows.filter((row) => row.alive).length,
    failed: rows.filter((row) => !row.alive).length,
    http200,
    cloak503,
    sslErrors: rows.filter((row) => row.status === "SSL_ERROR").length,
    sslSoon: rows.filter(
      (row) =>
        row.ssl?.daysLeft != null && row.ssl.daysLeft <= SSL_WARN_DAYS,
    ).length,
    sslMin: sslDays.length ? Math.min(...sslDays) : null,
    sslMax: sslDays.length ? Math.max(...sslDays) : null,
    sslWithCert: sslDays.length,
    nsProblems: rows.filter((row) => nsReason(row) !== null).length,
    foreignRedirects: rows.filter((row) => row.redirect?.foreign).length,
    duplicateUrls: [...urlCounts.values()].filter((count) => count > 1).length,
    durations: rows
      .map((row) => row.duration)
      .filter((ms): ms is number => typeof ms === "number")
      .sort((a, b) => a - b),
  };
}

function assertMetricsMatchPayload(payload: StatusPayload) {
  const metrics = computeMetrics(payload);
  const expected = recount(payload);
  const mix = httpMixParts(metrics);

  expect(Array.isArray(payload.data)).toBe(true);
  expect(payload.data.length).toBe(payload.total_sites);
  expect(metrics.total).toBe(expected.rows);
  expect(metrics.alive).toBe(payload.alive_count);
  expect(metrics.alive).toBe(expected.alive);
  expect(metrics.failed).toBe(payload.failed_count);
  expect(metrics.failed).toBe(expected.failed);
  expect(metrics.alive + metrics.failed).toBe(metrics.total);
  expect(metrics.http200).toBe(expected.http200);
  expect(metrics.cloak503).toBe(expected.cloak503);
  expect(metrics.sslErrors).toBe(expected.sslErrors);
  expect(metrics.sslSoon).toBe(expected.sslSoon);
  expect(metrics.sslMinDays).toBe(expected.sslMin);
  expect(metrics.sslMaxDays).toBe(expected.sslMax);
  expect(metrics.nsProblems).toHaveLength(expected.nsProblems);
  expect(metrics.nsOk).toBe(expected.rows - expected.nsProblems);
  expect(metrics.foreignRedirects).toBe(expected.foreignRedirects);
  expect(metrics.duplicateUrls).toBe(expected.duplicateUrls);

  expect(metrics.http200 + metrics.cloak503 + mix.other).toBe(metrics.total);
  expect(mix.okShare + mix.cloakShare + mix.otherShare).toBeCloseTo(1, 10);
  expect(payload.data.filter(isSslSoon)).toHaveLength(
    expected.sslErrors + expected.sslSoon,
  );

  expect(filterAndSortRows(payload.data, "", "200", "host", "asc")).toHaveLength(
    expected.http200,
  );
  expect(filterAndSortRows(payload.data, "", "503", "host", "asc")).toHaveLength(
    expected.cloak503,
  );
  expect(filterAndSortRows(payload.data, "", "down", "host", "asc")).toHaveLength(
    expected.failed,
  );
  expect(filterAndSortRows(payload.data, "", "ns", "host", "asc")).toHaveLength(
    expected.nsProblems,
  );
  expect(filterAndSortRows(payload.data, "", "ssl", "host", "asc")).toHaveLength(
    payload.data.filter(isSslSoon).length,
  );
  expect(filterAndSortRows(payload.data, "", "all", "host", "asc")).toHaveLength(
    expected.rows,
  );

  const digest = buildDigest(payload, metrics);
  expect(digest.length).toBeGreaterThan(10);
  expect(Number.isNaN(Date.parse(payload.last_update))).toBe(false);

  if (expected.durations.length) {
    expect(metrics.durationMin).toBe(expected.durations[0]);
    expect(metrics.durationMax).toBe(expected.durations.at(-1));
    expect(metrics.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(
      expected.durations.length,
    );
  }

  return { metrics, expected };
}

describe("independent recount of local snapshot", () => {
  it("dashboard math matches a second pass over public/status.json", () => {
    const { metrics, expected } = assertMetricsMatchPayload(localPayload);
    expect(formatSslSummary(metrics)).toBe(
      expected.sslMin == null
        ? `${expected.sslErrors} / ${expected.sslSoon}`
        : expected.sslErrors || expected.sslSoon
          ? `${expected.sslMin}–${expected.sslMax} дн · ${expected.sslErrors} / ${expected.sslSoon}`
          : `${expected.sslMin}–${expected.sslMax} дн`,
    );
  });
});

describe("live GitHub status.json", () => {
  it("is reachable, CORS-friendly, and matches dashboard math", async () => {
    const response = await fetch(`${config.remoteStatusUrl}?t=${Date.now()}`);
    expect(response.ok).toBe(true);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");

    const payload = (await response.json()) as StatusPayload;
    const { metrics, expected } = assertMetricsMatchPayload(payload);

    expect(expected.rows).toBeGreaterThan(0);
    expect(expected.sslWithCert).toBeGreaterThan(0);
    expect(metrics.sslMinDays).not.toBeNull();
    expect(metrics.sslMaxDays).not.toBeNull();
    expect(metrics.sslMinDays).toBeLessThanOrEqual(metrics.sslMaxDays as number);
    expect(formatSslSummary(metrics)).toContain("дн");

    for (const row of payload.data) {
      expect(row.url.startsWith("http")).toBe(true);
      const days = sslDaysLeft(row);
      if (days != null) expect(Number.isFinite(days)).toBe(true);
    }
  });
});

describe("SSL labels and summary text", () => {
  it("formats expired, missing, and day counts", () => {
    expect(
      sslLabel({
        url: "https://a.com",
        status: "SSL_ERROR",
        ok: false,
        alive: false,
      }),
    ).toBe("истёк");
    expect(
      sslLabel({
        url: "https://a.com",
        status: 200,
        ok: true,
        alive: true,
      }),
    ).toBe("—");
    expect(
      sslLabel({
        url: "https://a.com",
        status: 200,
        ok: true,
        alive: true,
        ssl: { daysLeft: 39, validTo: "2026-09-28T00:00:00.000Z" },
      }),
    ).toBe("39 дн");
  });

  it("shows range, then alerts only when SSL is actually in the warning window", () => {
    expect(
      formatSslSummary({
        sslErrors: 0,
        sslSoon: 0,
        sslMinDays: 39,
        sslMaxDays: 83,
      }),
    ).toBe("39–83 дн");
    expect(
      formatSslSummary({
        sslErrors: 1,
        sslSoon: 2,
        sslMinDays: 3,
        sslMaxDays: 80,
      }),
    ).toBe("3–80 дн · 1 / 2");
    expect(
      formatSslSummary({
        sslErrors: 0,
        sslSoon: 0,
        sslMinDays: null,
        sslMaxDays: null,
      }),
    ).toBe("0 / 0");
  });
});
