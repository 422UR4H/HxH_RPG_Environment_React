import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressBar from "../ProgressBar";

describe("ProgressBar", () => {
  it("renders a single label with current/max", () => {
    render(<ProgressBar current={7} max={20} color="red" />);
    expect(screen.getAllByText("7/20")).toHaveLength(1);
  });

  it("keeps the label at the right regardless of the fill", () => {
    const { rerender } = render(<ProgressBar current={2} max={20} color="red" />);
    const low = getComputedStyle(screen.getByText("2/20"));
    expect(low.left).toBe("auto");
    expect(low.width).not.toMatch(/%/);
    expect(low.transform).toBe("none");
    rerender(<ProgressBar current={18} max={20} color="red" />);
    const high = getComputedStyle(screen.getByText("18/20"));
    expect(high.left).toBe("auto");
    expect(high.textAlign).toBe(low.textAlign);
    expect(low.textAlign).toBe("right");
  });

  it("has no clipping layers", () => {
    const { container } = render(<ProgressBar current={7} max={20} color="red" />);
    expect(container.querySelector("[aria-hidden]")).toBeNull();
  });

  it("keeps progressbar semantics", () => {
    render(<ProgressBar current={7} max={20} min={0} color="red" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "7");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "20");
  });
});
