import { describe, expect, it } from "vitest";
import { countFoot, gscWasAbsent, mergeGsc, payloadHasGsc, percentChange, positionChange, positionFoot, shareFoot } from "../src/lib/gsc";
import type { SiteRow, StatusPayload } from "../src/types";

describe("gsc deltas", () => {
  it("counts relative change", () => {
    expect(percentChange(80, 100)).toEqual({ text: "↓ 20.0%", tone: "down" });
    expect(percentChange(173, 100)?.tone).toBe("up");
    expect(percentChange(5, 0)).toBeNull();
  });

  it("treats a lower position as an improvement", () => {
    expect(positionChange(10.67, 12.87)).toEqual({ text: "↑ 2.2", tone: "up" });
    expect(positionChange(12, 10)?.tone).toBe("down");
  });

  it("says what the previous 7 days were", () => {
    expect(countFoot(0, 0)).toEqual({ was: "было 0", change: null, tone: "flat" });
    expect(countFoot(5, 0).change).toBe("появились");
    expect(countFoot(179, 123)).toMatchObject({ was: "было 123", tone: "up" });
    expect(positionFoot(11.39, 11.71)).toMatchObject({ was: "было 11.71", change: "лучше на 0.3", tone: "up" });
    expect(positionFoot(33.4, 22.9).change).toMatch(/^хуже/);
    expect(shareFoot(0.008, 0.009).change).toBe("хуже");
    expect(gscWasAbsent({ impressions: 0, prev_impressions: 0 })).toBe(true);
    expect(gscWasAbsent({ impressions: 0, prev_impressions: 15 })).toBe(false);
  });

  it("fills clicks from the snapshot that still has them", () => {
    const row = (url: string, clicks?: number): SiteRow => ({
      url,
      status: 200,
      ok: true,
      alive: true,
      gsc: clicks == null ? null : { clicks, impressions: 10, ctr: 0.1, position: 4 },
    });
    const current: StatusPayload = {
      last_update: "2026-09-25T07:00:00Z",
      total_sites: 1,
      alive_count: 1,
      failed_count: 0,
      data: [row("https://ek333win.org")],
    };
    const source: StatusPayload = {
      ...current,
      gsc_last_update: "2026-09-24T13:45:37.955Z",
      data: [row("https://ek333win.org/", 0)],
    };
    expect(payloadHasGsc(current)).toBe(false);
    const merged = mergeGsc(current, source);
    expect(merged.data[0].gsc?.clicks).toBe(0);
    expect(merged.data[0].gsc?.impressions).toBe(10);
    expect(merged.gsc_last_update).toBe("2026-09-24T13:45:37.955Z");
  });
});
