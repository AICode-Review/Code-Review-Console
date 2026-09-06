import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIdleTimeout } from "./useIdleTimeout";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useIdleTimeout", () => {
  it("calls onIdle after the timeout elapses with no activity", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(onIdle, 1000, true));
    vi.advanceTimersByTime(999);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("resets the timer on activity — never fires while the user keeps interacting", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(onIdle, 1000, true));
    vi.advanceTimersByTime(700);
    window.dispatchEvent(new Event("mousemove"));
    vi.advanceTimersByTime(700);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled — no timer, no listeners", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(onIdle, 1000, false));
    vi.advanceTimersByTime(5000);
    expect(onIdle).not.toHaveBeenCalled();
  });
});
