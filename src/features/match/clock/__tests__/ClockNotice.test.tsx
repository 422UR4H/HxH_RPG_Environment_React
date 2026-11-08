import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import ClockNotice from "../ClockNotice";
import type { ClockChange } from "../clockMessages";

const adj = (to: string): ClockChange => ({ kind: "adjust", from: "2000-01-01T08:00:00", to, deltaSeconds: 60 });

afterEach(() => vi.useRealTimers());

describe("ClockNotice", () => {
  it("shows, coalesces, restarts the timer and hides after 6 s", () => {
    vi.useFakeTimers();
    const { rerender } = render(<ClockNotice change={null} changeSeq={0} />);
    expect(screen.queryByRole("status")).toBeNull();
    rerender(<ClockNotice change={adj("2000-01-01T08:01:00")} changeSeq={1} />);
    expect(screen.getByRole("status").textContent).toContain("+1 min");
    act(() => { vi.advanceTimersByTime(4000); });
    rerender(<ClockNotice change={adj("2000-01-01T08:02:00")} changeSeq={2} />);
    expect(screen.getByRole("status").textContent).toContain("+2 min");
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByRole("status")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(2100); });
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("ignores a change already present at mount", () => {
    render(<ClockNotice change={adj("2000-01-01T08:01:00")} changeSeq={3} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
