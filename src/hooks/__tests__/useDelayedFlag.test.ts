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

  it("fica falso antes do prazo e verdadeiro depois", () => {
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

  it("não dispara depois de desmontar", () => {
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
