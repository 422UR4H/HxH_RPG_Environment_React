import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClockPill from "../ClockPill";
import type { StoryClockView } from "../useStoryClock";

function view(over: Partial<StoryClockView> = {}): StoryClockView {
  return {
    now: "2000-01-01T08:30:00",
    running: false,
    limitAt: null,
    limitReason: "",
    realElapsedSeconds: 0,
    phase: "idle",
    pulseKey: 0,
    alertKey: 0,
    ...over,
  };
}

function styleText() {
  return Array.from(document.querySelectorAll("style"))
    .map((s) => s.textContent ?? "")
    .join("\n")
    .replace(/\s+/g, " ");
}

describe("ClockPill", () => {
  it("renders the time and the date", () => {
    render(<ClockPill clock={view()} interactive={false} />);
    expect(screen.getByText("08:30:00")).toBeInTheDocument();
    expect(screen.getByText("01/01/2000")).toBeInTheDocument();
  });

  it("shows the unset copy when there is no story time", () => {
    render(<ClockPill clock={view({ now: null })} interactive={false} />);
    expect(screen.getByText("Hora a definir")).toBeInTheDocument();
    expect(screen.queryByText("01/01/2000")).not.toBeInTheDocument();
  });

  it("player pill is not a button and is not focusable", async () => {
    render(<ClockPill clock={view()} interactive={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    const pill = screen.getByRole("status");
    expect(pill).toHaveAttribute("aria-live", "off");
    expect(pill).toHaveAttribute("title", expect.stringContaining("01/01/2000"));
    expect(pill).not.toHaveAttribute("tabindex");
    await userEvent.tab();
    expect(document.body).toHaveFocus();
  });

  it("master pill toggles through a labelled button", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<ClockPill clock={view()} interactive open={false} onToggle={onToggle} />);
    const button = screen.getByRole("button", { name: "Relógio da história" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<ClockPill clock={view()} interactive open onToggle={onToggle} />);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("shows the live dot only while running", () => {
    const { rerender } = render(<ClockPill clock={view()} interactive={false} />);
    expect(screen.queryByTestId("clock-live-dot")).not.toBeInTheDocument();
    rerender(<ClockPill clock={view({ running: true, phase: "running" })} interactive={false} />);
    expect(screen.getByTestId("clock-live-dot")).toBeInTheDocument();
  });

  it("data-phase follows the hook", () => {
    const { rerender } = render(<ClockPill clock={view({ running: true, phase: "pulse", pulseKey: 1 })} interactive />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-phase", "pulse");
    rerender(<ClockPill clock={view({ running: true, phase: "alert", pulseKey: 30 })} interactive />);
    expect(button).toHaveAttribute("data-phase", "alert");
  });

  it("restarts the pulse ring on every pulseKey", () => {
    const { rerender } = render(<ClockPill clock={view({ running: true, phase: "pulse", pulseKey: 1 })} interactive />);
    const first = screen.getByTestId("clock-pulse-ring");
    rerender(<ClockPill clock={view({ running: true, phase: "pulse", pulseKey: 2 })} interactive />);
    expect(screen.getByTestId("clock-pulse-ring")).not.toBe(first);
  });

  it("shows the real elapsed minutes to the master from one minute on", () => {
    render(<ClockPill clock={view({ running: true, phase: "strongPulse", realElapsedSeconds: 185 })} interactive />);
    expect(screen.getByText("▶ 3 min")).toBeInTheDocument();
  });

  it("reduced motion turns every animation off", () => {
    render(<ClockPill clock={view({ running: true, phase: "strongPulse", pulseKey: 6 })} interactive />);
    const css = styleText();
    const blocks = css.split("@media (prefers-reduced-motion: reduce)").slice(1);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.some((b) => /animation: ?none/.test(b))).toBe(true);
  });
});
