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
    expect(screen.getByRole("status").textContent).toContain("avançou o tempo 1 min");
    act(() => { vi.advanceTimersByTime(4000); });
    rerender(<ClockNotice change={adj("2000-01-01T08:02:00")} changeSeq={2} />);
    expect(screen.getByRole("status").textContent).toContain("avançou o tempo 2 min");
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByRole("status")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(2100); });
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("a silent change (limit) keeps the visible adjust notice and its timer", () => {
    vi.useFakeTimers();
    const { rerender } = render(<ClockNotice change={null} changeSeq={0} />);
    rerender(<ClockNotice change={adj("2000-01-01T08:01:00")} changeSeq={1} />);
    const text = screen.getByRole("status").textContent;
    act(() => { vi.advanceTimersByTime(4000); });
    rerender(<ClockNotice change={{ kind: "limit", to: "2000-01-01T08:01:00" }} changeSeq={2} />);
    expect(screen.getByRole("status").textContent).toBe(text);
    // O relógio não foi reiniciado pela mudança silenciosa.
    act(() => { vi.advanceTimersByTime(2100); });
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("ignores a change already present at mount", () => {
    render(<ClockNotice change={adj("2000-01-01T08:01:00")} changeSeq={3} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("text mode shows on a new noticeKey and restarts the timer", () => {
    vi.useFakeTimers();
    const { rerender } = render(<ClockNotice text={null} noticeKey={0} />);
    rerender(<ClockNotice text="Tempo real ligado há 5 min" noticeKey={1} />);
    expect(screen.getByRole("status").textContent).toBe("Tempo real ligado há 5 min");
    act(() => { vi.advanceTimersByTime(4000); });
    rerender(<ClockNotice text="Tempo real ligado há 10 min" noticeKey={2} />);
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByRole("status").textContent).toBe("Tempo real ligado há 10 min");
    act(() => { vi.advanceTimersByTime(2100); });
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("text mode: new text with the same key still hides after 6 s", () => {
    vi.useFakeTimers();
    const { rerender } = render(<ClockNotice text={null} noticeKey={0} />);
    rerender(<ClockNotice text="A" noticeKey={1} />);
    rerender(<ClockNotice text="B" noticeKey={1} />);
    expect(screen.getByRole("status").textContent).toBe("A");
    act(() => { vi.advanceTimersByTime(6100); });
    expect(screen.queryByRole("status")).toBeNull();
  });
});
