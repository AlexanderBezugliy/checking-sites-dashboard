import { describe, expect, it } from "vitest";
import { collectNotIndexedPages } from "../src/lib/export";
import {
  dropTargetLabel,
  fleetHostSet,
  isFleetDrop,
  isSiteUpForDashboard,
  redirectTargetHost,
} from "../src/lib/drop";
import { isIndexSkip } from "../src/lib/index";
import { computeMetrics, httpMixParts } from "../src/lib/metrics";
import { isSiteUp } from "../src/lib/site";
import { filterAndSortRows } from "../src/lib/table";
import type { SiteRow, StatusPayload } from "../src/types";

function row(partial: Partial<SiteRow> & Pick<SiteRow, "url" | "status">): SiteRow {
  return { ok: false, alive: true, ...partial };
}

const skipIndex = {
  indexed: null as null,
  error: "нет в sites.csv / нет account",
  pages: [] as [],
};

const dropAir = row({
  url: "https://airnaturel.co.uk",
  status: 301,
  alive: false,
  index: skipIndex,
  redirect: {
    status: 301,
    location: "https://freshbetcasino.gb.net/?view=d7Fm2Kp9Qx4Nw8Rz",
    foreign: true,
  },
  cloak: { present: null, status: null, error: "foreign redirect" },
});

const moneyFresh = row({
  url: "https://freshbetcasino.gb.net",
  status: 200,
  index: { indexed: true, pages: [{ url: "https://freshbetcasino.gb.net/", slot: "home", indexed: true }] },
});

describe("fleet drop", () => {
  const fleet = fleetHostSet([dropAir, moneyFresh]);

  it("is a drop only for CSV-skip + 301 onto another fleet host", () => {
    expect(isIndexSkip(dropAir)).toBe(true);
    expect(isFleetDrop(dropAir, fleet)).toBe(true);
    expect(isSiteUp(dropAir)).toBe(false);
    expect(isSiteUpForDashboard(dropAir, fleet)).toBe(true);
    expect(dropTargetLabel(dropAir)).toBe("freshbetcasino.gb.net");
    expect(
      redirectTargetHost(
        "https://www.FreshBetCasino.gb.net/?view=x",
        "https://airnaturel.co.uk",
      ),
    ).toBe("freshbetcasino.gb.net");
  });

  it("does not treat money-site 301 to another fleet host as a drop", () => {
    const moneyAway = row({
      url: "https://freshbetcasino.gb.net",
      status: 301,
      alive: false,
      index: {
        indexed: true,
        pages: [{ url: "https://freshbetcasino.gb.net/", slot: "home", indexed: true }],
      },
      redirect: {
        status: 301,
        location: "https://winzter-go.com/",
        foreign: true,
      },
    });
    const fleet = fleetHostSet([
      moneyAway,
      row({ url: "https://winzter-go.com", status: 200 }),
    ]);
    expect(isIndexSkip(moneyAway)).toBe(false);
    expect(isFleetDrop(moneyAway, fleet)).toBe(false);
    expect(isSiteUpForDashboard(moneyAway, fleet)).toBe(false);
    const metrics = computeMetrics({
      last_update: "2026-09-17T00:00:00Z",
      total_sites: 2,
      alive_count: 1,
      failed_count: 1,
      data: [moneyAway, row({ url: "https://winzter-go.com", status: 200 })],
    });
    expect(metrics.homesDrop).toBe(0);
    expect(metrics.failed).toBe(1);
    expect(metrics.otherHttp).toBe(1);
  });

  it("keeps skip+301 to a host outside the fleet as a real down", () => {
    const stray = row({
      url: "https://stray-drop.co.uk",
      status: 301,
      alive: false,
      index: skipIndex,
      redirect: {
        status: 301,
        location: "https://google.com/",
        foreign: true,
      },
    });
    expect(isFleetDrop(stray, fleet)).toBe(false);
    expect(isSiteUpForDashboard(stray, fleet)).toBe(false);
  });

  it("does not count same-host 301, 302 foreign, or skip without redirect", () => {
    expect(
      isFleetDrop(
        row({
          url: "https://airnaturel.co.uk",
          status: 301,
          alive: false,
          index: skipIndex,
          redirect: {
            status: 301,
            location: "https://www.airnaturel.co.uk/",
            foreign: true,
          },
        }),
        fleet,
      ),
    ).toBe(false);
    expect(
      isFleetDrop(
        row({
          url: "https://airnaturel.co.uk",
          status: 302,
          alive: false,
          index: skipIndex,
          redirect: {
            status: 302,
            location: "https://freshbetcasino.gb.net/",
            foreign: true,
          },
        }),
        fleet,
      ),
    ).toBe(false);
    expect(
      isFleetDrop(
        row({
          url: "https://myteamware.com",
          status: 302,
          index: skipIndex,
          redirect: { status: 302, location: "/", foreign: false },
        }),
        fleet,
      ),
    ).toBe(false);
    expect(isFleetDrop(moneyFresh, new Set())).toBe(false);
  });

  it("leaves ordinary 200/302/503 and DNS failures unchanged", () => {
    const hosts = fleetHostSet([
      row({ url: "https://a.com", status: 200 }),
      row({ url: "https://b.com", status: 302 }),
    ]);
    expect(isSiteUpForDashboard(row({ url: "https://a.com", status: 200 }), hosts)).toBe(
      true,
    );
    expect(
      isSiteUpForDashboard(
        row({
          url: "https://b.com",
          status: 302,
          redirect: { status: 302, location: "/", foreign: false },
        }),
        hosts,
      ),
    ).toBe(true);
    expect(
      isSiteUpForDashboard(row({ url: "https://c.com", status: 503, alive: true }), hosts),
    ).toBe(true);
    expect(
      isSiteUpForDashboard(
        row({ url: "https://d.com", status: "DNS_ERROR", alive: false }),
        hosts,
      ),
    ).toBe(false);
    expect(
      isSiteUpForDashboard(
        row({
          url: "https://e.com",
          status: 302,
          redirect: { status: 302, location: "https://other.com", foreign: true },
        }),
        hosts,
      ),
    ).toBe(false);
  });

  it("keeps drops out of KPI failures, skip filter and not-indexed CSV", () => {
    const down = row({
      url: "https://dead.com",
      status: "DNS_ERROR",
      alive: false,
    });
    const payload: StatusPayload = {
      last_update: "2026-09-17T00:00:00Z",
      total_sites: 3,
      alive_count: 1,
      failed_count: 2,
      data: [dropAir, moneyFresh, down],
    };
    const metrics = computeMetrics(payload);
    expect(metrics.homesDrop).toBe(1);
    expect(metrics.homesSkip).toBe(1);
    expect(metrics.alive).toBe(2);
    expect(metrics.failed).toBe(1);
    expect(metrics.alive + metrics.failed).toBe(3);
    expect(metrics.http200).toBe(1);
    expect(metrics.otherHttp).toBe(0);
    expect(httpMixParts(metrics).other).toBe(1);
    expect(filterAndSortRows(payload.data, "", "down", "host", "asc").map((item) => item.url)).toEqual(
      ["https://dead.com"],
    );
    expect(filterAndSortRows(payload.data, "", "indexdrop", "host", "asc")).toEqual([dropAir]);
    expect(filterAndSortRows(payload.data, "", "indexskip", "host", "asc")).toEqual([down]);
    expect(collectNotIndexedPages(payload.data)).toEqual([]);
  });
});
