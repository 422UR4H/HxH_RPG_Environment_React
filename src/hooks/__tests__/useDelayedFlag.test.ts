import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useDelayedFlag from "../useDelayedFlag";

describe("useDelayedFlag", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("stays false before the deadline and true after it", () => {
    const { result } = renderHook(() => useDelayedFlag(3000));
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it("does not fire after unmount", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = renderHook(() => useDelayedFlag(3000));

    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
