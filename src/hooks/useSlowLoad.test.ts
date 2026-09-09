import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSlowLoad } from "./useSlowLoad";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useSlowLoad", () => {
  it("stays false for a normal-speed load that finishes before the delay", () => {
    const { result, rerender } = renderHook(({ loading }) => useSlowLoad(loading, 1000), {
      initialProps: { loading: true },
    });
    vi.advanceTimersByTime(500);
    rerender({ loading: false });
    expect(result.current).toBe(false);
  });

  it("flips true once loading has persisted past the delay", () => {
    const { result } = renderHook(() => useSlowLoad(true, 1000));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1001));
    expect(result.current).toBe(true);
  });

  it("resets back to false once loading finishes, even after firing once", () => {
    const { result, rerender } = renderHook(({ loading }) => useSlowLoad(loading, 1000), {
      initialProps: { loading: true },
    });
    act(() => vi.advanceTimersByTime(1001));
    expect(result.current).toBe(true);
    rerender({ loading: false });
    expect(result.current).toBe(false);
  });
});
