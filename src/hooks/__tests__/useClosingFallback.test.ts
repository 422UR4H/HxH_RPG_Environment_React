import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useClosingFallback } from "../useClosingFallback";

describe("useClosingFallback", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls onDone after the delay while closing", () => {
    const onDone = vi.fn();
    renderHook(() => useClosingFallback(true, onDone, 350));
    vi.advanceTimersByTime(349);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("does nothing when not closing", () => {
    const onDone = vi.fn();
    renderHook(() => useClosingFallback(false, onDone, 350));
    vi.advanceTimersByTime(1000);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("cancels the timer when closing ends or on unmount", () => {
    const onDone = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ closing }) => useClosingFallback(closing, onDone, 350),
      { initialProps: { closing: true } },
    );
    rerender({ closing: false });
    vi.advanceTimersByTime(1000);
    expect(onDone).not.toHaveBeenCalled();
    rerender({ closing: true });
    unmount();
    vi.advanceTimersByTime(1000);
    expect(onDone).not.toHaveBeenCalled();
  });
});
