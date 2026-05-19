import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ExpBar from "../../../components/ions/ExpBar";

describe("ExpBar", () => {
  describe("rendering", () => {
    it("renders a progressbar element with correct aria values", () => {
      render(<ExpBar currExp={50} maxExp={100} />);
      const bar = screen.getByRole("progressbar");
      expect(bar).toHaveAttribute("aria-valuenow", "50");
      expect(bar).toHaveAttribute("aria-valuemin", "0");
      expect(bar).toHaveAttribute("aria-valuemax", "100");
    });

    it("does not show tooltip on initial render", () => {
      render(<ExpBar currExp={50} maxExp={100} />);
      expect(screen.queryByText("50/100")).not.toBeInTheDocument();
    });
  });

  describe("hover — desktop", () => {
    it("shows tooltip on mouseenter when currExp > 0", () => {
      const { container } = render(<ExpBar currExp={50} maxExp={100} />);
      fireEvent.mouseEnter(container.firstChild!);
      expect(screen.getByText("50/100")).toBeInTheDocument();
    });

    it("hides tooltip on mouseleave", () => {
      const { container } = render(<ExpBar currExp={50} maxExp={100} />);
      fireEvent.mouseEnter(container.firstChild!);
      fireEvent.mouseLeave(container.firstChild!);
      expect(screen.queryByText("50/100")).not.toBeInTheDocument();
    });

    it("does NOT show tooltip on mouseenter when currExp is 0", () => {
      const { container } = render(<ExpBar currExp={0} maxExp={100} />);
      fireEvent.mouseEnter(container.firstChild!);
      expect(screen.queryByText("0/100")).not.toBeInTheDocument();
    });
  });

  describe("long press — mobile", () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it("shows tooltip after 400ms of touchstart when currExp > 0", () => {
      const { container } = render(<ExpBar currExp={30} maxExp={200} />);
      fireEvent.touchStart(container.firstChild!);
      expect(screen.queryByText("30/200")).not.toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(400); });
      expect(screen.getByText("30/200")).toBeInTheDocument();
    });

    it("does NOT show tooltip if touchend fires before 400ms", () => {
      const { container } = render(<ExpBar currExp={30} maxExp={200} />);
      fireEvent.touchStart(container.firstChild!);
      act(() => { vi.advanceTimersByTime(200); });
      fireEvent.touchEnd(container.firstChild!);
      act(() => { vi.advanceTimersByTime(400); });
      expect(screen.queryByText("30/200")).not.toBeInTheDocument();
    });

    it("does NOT show tooltip if touchmove fires before 400ms", () => {
      const { container } = render(<ExpBar currExp={30} maxExp={200} />);
      fireEvent.touchStart(container.firstChild!);
      act(() => { vi.advanceTimersByTime(200); });
      fireEvent.touchMove(container.firstChild!);
      act(() => { vi.advanceTimersByTime(400); });
      expect(screen.queryByText("30/200")).not.toBeInTheDocument();
    });

    it("does NOT show tooltip on long press when currExp is 0", () => {
      const { container } = render(<ExpBar currExp={0} maxExp={200} />);
      fireEvent.touchStart(container.firstChild!);
      act(() => { vi.advanceTimersByTime(400); });
      expect(screen.queryByText("0/200")).not.toBeInTheDocument();
    });
  });
});
