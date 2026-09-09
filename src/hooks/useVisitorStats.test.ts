import { describe, expect, it } from "vitest";
import { sinceForRange } from "./useVisitorStats";

describe("sinceForRange", () => {
  it("'today' is the start of the current UTC day, not a rolling 24h window", () => {
    const since = sinceForRange("today");
    const now = new Date();
    expect(since.getUTCFullYear()).toBe(now.getUTCFullYear());
    expect(since.getUTCMonth()).toBe(now.getUTCMonth());
    expect(since.getUTCDate()).toBe(now.getUTCDate());
    expect(since.getUTCHours()).toBe(0);
    expect(since.getUTCMinutes()).toBe(0);
    expect(since.getUTCSeconds()).toBe(0);
  });

  it("'7d' and '30d' are rolling windows back from now", () => {
    const now = Date.now();
    const seven = sinceForRange("7d").getTime();
    const thirty = sinceForRange("30d").getTime();
    expect(now - seven).toBeCloseTo(7 * 86_400_000, -3);
    expect(now - thirty).toBeCloseTo(30 * 86_400_000, -3);
    expect(thirty).toBeLessThan(seven);
  });
});
