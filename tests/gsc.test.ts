import { describe, expect, it } from "vitest";
import { countFoot, gscWasAbsent, mergeGsc, payloadHasGsc, percentChange, positionChange, positionFoot, projectGsc, shareFoot, sumGscDays } from "../src/lib/gsc";
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

  it("sums a chosen period from daily rows, weighting position by impressions", () => {
    const info = {
      end: "2026-10-19",
      start: "2026-10-06",
      clicks: 99,
      impressions: 99,
      days: [
        ["2026-10-18", 1, 100, 10],
        ["2026-10-19", 1, 300, 20],
        ["2026-10-12", 5, 50, 4],
      ] as [string, number, number, number | null][],
    };
    expect(sumGscDays(info.days, "2026-10-18", "2026-10-19")).toMatchObject({
      clicks: 2,
      impressions: 400,
      position: 17.5,
    });
    const week = projectGsc(info, 7);
    expect(week?.start).toBe("2026-10-13");
    expect(week?.end).toBe("2026-10-19");
    expect(week?.clicks).toBe(2);
    expect(week?.prev_start).toBe("2026-10-06");
    expect(week?.prev_clicks).toBe(5);
    expect(projectGsc({ clicks: 35, impressions: 100, start: "2026-09-08", end: "2026-09-21" }, 14)?.clicks).toBe(35);
    expect(projectGsc({ clicks: 35, impressions: 100, end: "2026-09-21" }, 7)?.impressions).toBeNull();
  });
});
