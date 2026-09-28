import { describe, expect, it } from "vitest";
import { isRetiredHost, withoutRetiredSites } from "../src/lib/retired";
import type { SiteRow, StatusPayload } from "../src/types";

function row(url: string): SiteRow {
  return { url, status: 200, ok: true, alive: true };
}

describe("retired hosts", () => {
  it("drops the domains we no longer watch", () => {
    const payload: StatusPayload = {
      last_update: "2026-09-25T00:00:00Z",
      total_sites: 3,
      alive_count: 3,
      failed_count: 0,
      data: [
        row("https://ek333-bd.org"),
        row("https://www.cv666.it.com/"),
        row("https://slotlair-casino.gb.net"),
      ],
    };
    const next = withoutRetiredSites(payload);
    expect(next.data.map((item) => item.url)).toEqual(["https://ek333-bd.org"]);
    expect(next.total_sites).toBe(1);
    expect(isRetiredHost("https://SmoothSpinsCasino.org.uk")).toBe(true);
  });
});