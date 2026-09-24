import { describe, expect, it } from "vitest";
import { percentChange, positionChange } from "../src/lib/gsc";

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
});
