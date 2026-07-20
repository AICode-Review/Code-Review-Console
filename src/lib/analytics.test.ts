import { describe, expect, it } from "vitest";
import { actionCategory, bucketByDay, countBy, withColors } from "../lib/analytics";

describe("analytics helpers", () => {
  it("countBy aggregates and sorts descending", () => {
    expect(countBy(["a", "b", "a", "a", "b"], (x) => x)).toEqual([
      { name: "a", count: 3 },
      { name: "b", count: 2 },
    ]);
  });

  it("withColors attaches palette fills", () => {
    const rows = withColors(countBy(["pro", "free"], (x) => x), { pro: "#0f0", free: "#888" });
    expect(rows.find((r) => r.name === "pro")?.fill).toBe("#0f0");
  });

  it("actionCategory splits dotted actions", () => {
    expect(actionCategory("billing.cancel_requested")).toBe("billing");
    expect(actionCategory("onboarding")).toBe("onboarding");
  });

  it("bucketByDay fills empty days", () => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const series = bucketByDay([{ at: today, n: 2 }], (x) => x.at, (x) => x.n, 3);
    expect(series).toHaveLength(3);
    expect(series[series.length - 1]?.value).toBe(2);
  });
});
