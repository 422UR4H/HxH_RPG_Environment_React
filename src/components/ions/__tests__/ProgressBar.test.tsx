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

  it("clips the fill at the value", () => {
    render(<ProgressBar current={10} max={20} color="red" />);
    expect(screen.getByTestId("progress-fill")).toHaveStyle({ clipPath: "inset(0 50% 0 0)" });
  });

  it("uses a gradient with deepColor and a flat color without it", () => {
    // O jsdom descarta gradientes com calc(); confere a regra gerada pelo styled-components.
    const cssOf = (el: HTMLElement) =>
      Array.from(document.querySelectorAll("style"))
        .map((st) => st.textContent ?? "")
        .join("")
        .split("}")
        .find((rule) => el.className.split(" ").some((c) => c && rule.includes(`.${c}{`) && rule.includes("clip-path"))) ?? "";
    const { rerender } = render(<ProgressBar current={10} max={20} color="red" deepColor="darkred" />);
    expect(cssOf(screen.getByTestId("progress-fill"))).toContain("linear-gradient(to right, red");
    rerender(<ProgressBar current={10} max={20} color="red" />);
    const flat = cssOf(screen.getByTestId("progress-fill"));
    expect(flat).not.toContain("linear-gradient");
    expect(flat).toContain("background:red");
  });
});
