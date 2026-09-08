import { describe, expect, it } from "vitest";
import {
  cloakHint,
  cloakLabel,
  cloakOf,
  hasCloakColumn,
  hasCloakData,
  isCloaked,
  isUnconfirmedCloak,
} from "../src/lib/cloak";
import { computeMetrics } from "../src/lib/metrics";
import { filterAndSortRows, matchesQuery } from "../src/lib/table";
import type { CloakInfo, SiteRow, StatusPayload } from "../src/types";

function row(partial: Partial<SiteRow> & Pick<SiteRow, "url" | "status">): SiteRow {
  return {
    ok: false,
    alive: true,
    ...partial,
  };
}

function cloak(partial: Partial<CloakInfo> = {}): CloakInfo {
  return {
    present: null,
    status: null,
    error: null,
    ...partial,
  };
}

describe("cloak helpers", () => {
  it("hides the column when the object is missing", () => {
    expect(hasCloakData(row({ url: "https://old.com", status: 302 }))).toBe(false);
    expect(hasCloakColumn([row({ url: "https://old.com", status: 302 })])).toBe(false);
    expect(cloakLabel(null)).toBe("—");
  });

  it("shows dash only when A opened 200, 503 when present or A was not 200/503", () => {
    const yes = cloak({ present: true, status: 503 });
    const no = cloak({ present: false, status: null });
    const maybe = cloak({
      present: null,
      status: null,
      error: "A 302, not 200/503",
    });
    const skip = cloak({
      present: null,
      status: null,
      error: "foreign redirect",
    });
    const blocked = cloak({
      present: null,
      status: null,
      error: "probe blocked",
    });
    const bypass = cloak({
      present: null,
      status: null,
      error: "bypass not confirmed",
    });

    expect(cloakLabel(yes)).toBe("503");
    expect(cloakLabel(no)).toBe("—");
    expect(cloakLabel(maybe)).toBe("503");
    expect(cloakLabel(skip)).toBe("—");
    expect(cloakLabel(blocked)).toBe("—");
    expect(cloakLabel(bypass)).toBe("503");
    expect(isUnconfirmedCloak(maybe)).toBe(true);
    expect(isUnconfirmedCloak(skip)).toBe(false);
    expect(cloakHint(maybe)).toBe("A 302, not 200/503");
    expect(cloakHint(yes)).toBeUndefined();
    expect(cloakHint(no)).toBeUndefined();

    const uptime302 = row({
      url: "https://money.com",
      status: 302,
      redirect: { status: 302, location: "/", foreign: false },
      cloak: no,
    });
    expect(uptime302.redirect?.status).toBe(302);
    expect(cloakLabel(uptime302.cloak!)).toBe("—");
    expect(isCloaked(uptime302)).toBe(false);
  });

  it("finds cloaked and unconfirmed rows by 503 in search, not open 200", () => {
    const cloaked = row({
      url: "https://winbeastcasino.gb.net",
      status: 302,
      cloak: cloak({ present: true, status: 503 }),
    });
    const maybe = row({
      url: "https://mrjamescasino-official.co.uk",
      status: 302,
      cloak: cloak({ present: null, error: "A 302, not 200/503" }),
    });
    const open = row({
      url: "https://slotscharmcasino.org.uk",
      status: 200,
      cloak: cloak({ present: false }),
    });
    expect(matchesQuery(cloaked, "503")).toBe(true);
    expect(matchesQuery(maybe, "503")).toBe(true);
    expect(matchesQuery(open, "503")).toBe(false);
    expect(hasCloakColumn([cloaked, open])).toBe(true);
    expect(cloakOf(cloaked)?.present).toBe(true);
  });

  it("counts cloak from present true or unconfirmed A, not from sure-open 200", () => {
    const cloaked = row({
      url: "https://winbeastcasino.gb.net",
      status: 302,
      cloak: cloak({ present: true, status: 503 }),
    });
    const maybe = row({
      url: "https://mrjamescasino-official.co.uk",
      status: 302,
      cloak: cloak({ present: null, error: "A 302, not 200/503" }),
    });
    const open200 = row({
      url: "https://open.com",
      status: 200,
      cloak: cloak({ present: false }),
    });
    const foreign = row({
      url: "https://away.com",
      status: 301,
      cloak: cloak({ present: null, error: "foreign redirect" }),
    });
    const legacy = row({ url: "https://old.com", status: 503 });
    expect(isCloaked(cloaked)).toBe(true);
    expect(isCloaked(maybe)).toBe(true);
    expect(isCloaked(open200)).toBe(false);
    expect(isCloaked(foreign)).toBe(false);
    expect(isCloaked(legacy)).toBe(true);
    expect(
      filterAndSortRows(
        [cloaked, maybe, open200, foreign, legacy],
        "",
        "503",
        "host",
        "asc",
      ),
    ).toHaveLength(3);
    expect(
      filterAndSortRows([cloaked, maybe, open200], "", "200", "host", "asc"),
    ).toEqual([open200]);
  });

  it("puts unconfirmed 302 into KPI cloak, not into redirect", () => {
    const payload: StatusPayload = {
      last_update: "2026-09-08T00:00:00Z",
      total_sites: 4,
      alive_count: 3,
      failed_count: 1,
      data: [
        row({
          url: "https://yes.com",
          status: 302,
          cloak: cloak({ present: true, status: 503 }),
        }),
        row({
          url: "https://maybe.com",
          status: 302,
          cloak: cloak({ present: null, error: "A 302, not 200/503" }),
        }),
        row({
          url: "https://open.com",
          status: 200,
          cloak: cloak({ present: false }),
        }),
        row({
          url: "https://away.com",
          status: 301,
          alive: false,
          cloak: cloak({ present: null, error: "foreign redirect" }),
        }),
      ],
    };
    const metrics = computeMetrics(payload);
    expect(metrics.cloak503).toBe(2);
    expect(metrics.http200).toBe(1);
    expect(metrics.http302).toBe(0);
    expect(metrics.http200 + metrics.http302 + metrics.cloak503).toBe(3);
  });
});
