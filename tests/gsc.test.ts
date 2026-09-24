import { describe, expect, it } from "vitest";
import { countFoot, gscWasAbsent, percentChange, positionChange, positionFoot, shareFoot } from "../src/lib/gsc";

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
});
