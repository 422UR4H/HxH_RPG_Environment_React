import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { debounce } from "../debounce";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("case 1: single call runs after the delay, not before", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 400);

    debouncedFn("arg1");

    // Before delay expires, function should not have been called
    expect(mockFn).not.toHaveBeenCalled();

    // Advance time by 399ms (just before delay)
    vi.advanceTimersByTime(399);
    expect(mockFn).not.toHaveBeenCalled();

    // Advance time by 1ms (total 400ms, delay expires)
    vi.advanceTimersByTime(1);
    expect(mockFn).toHaveBeenCalledOnce();
    expect(mockFn).toHaveBeenCalledWith("arg1");
  });

  it("case 2: three calls within the delay window run exactly once with the last call arguments", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 400);

    // Make three calls within the delay window
    debouncedFn("arg1");
    vi.advanceTimersByTime(100);
    debouncedFn("arg2");
    vi.advanceTimersByTime(100);
    debouncedFn("arg3");

    // Function should not have been called yet
    expect(mockFn).not.toHaveBeenCalled();

    // Advance time past the final delay
    vi.advanceTimersByTime(400);

    // Function should have been called exactly once with the last call's arguments
    expect(mockFn).toHaveBeenCalledOnce();
    expect(mockFn).toHaveBeenCalledWith("arg3");
  });

  it("case 3: calls spaced further apart than the delay each run once", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 400);

    // First call
    debouncedFn("arg1");
    vi.advanceTimersByTime(400);
    expect(mockFn).toHaveBeenCalledOnce();
    expect(mockFn).toHaveBeenCalledWith("arg1");

    // Second call after 400ms delay (spaced beyond delay)
    debouncedFn("arg2");
    vi.advanceTimersByTime(400);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith("arg2");

    // Third call after 400ms delay (spaced beyond delay)
    debouncedFn("arg3");
    vi.advanceTimersByTime(400);
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(mockFn).toHaveBeenLastCalledWith("arg3");
  });

  it("case 4: multiple arguments are preserved through debouncing", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 400);

    debouncedFn("arg1", "arg2", 123, { key: "value" });

    vi.advanceTimersByTime(400);

    expect(mockFn).toHaveBeenCalledOnce();
    expect(mockFn).toHaveBeenCalledWith("arg1", "arg2", 123, {
      key: "value",
    });
  });

  it("case 5: debounced function can be called multiple times independently", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 400);

    // Rapid calls
    debouncedFn("a");
    debouncedFn("b");
    debouncedFn("c");

    vi.advanceTimersByTime(400);
    expect(mockFn).toHaveBeenCalledOnce();
    expect(mockFn).toHaveBeenCalledWith("c");

    // New set of calls
    debouncedFn("x");
    debouncedFn("y");
    debouncedFn("z");

    vi.advanceTimersByTime(400);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith("z");
  });

  it("case 6: zero delay executes immediately (edge case)", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 0);

    debouncedFn("arg");

    // With 0ms delay, should execute on next tick
    vi.advanceTimersByTime(0);
    expect(mockFn).toHaveBeenCalledOnce();
    expect(mockFn).toHaveBeenCalledWith("arg");
  });

  it("case 7: void return type works correctly", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 400);

    debouncedFn("test");
    vi.advanceTimersByTime(400);

    expect(mockFn).toHaveBeenCalledWith("test");
  });
});
