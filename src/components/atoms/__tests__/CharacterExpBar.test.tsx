import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CharacterExpBar from "../CharacterExpBar";

describe("CharacterExpBar", () => {
  it("shows the labels beside the bar by default", () => {
    render(<CharacterExpBar currExp={10} maxExp={30} level={2} />);
    expect(screen.getByText("Lv 2")).toBeInTheDocument();
    expect(screen.getByText("10 / 30")).toBeInTheDocument();
  });

  it("hides the labels and shows them in the tooltip when labelsInTooltip is set", () => {
    render(<CharacterExpBar currExp={10} maxExp={30} level={2} labelsInTooltip />);
    expect(screen.queryByText("Lv 2")).not.toBeInTheDocument();
    expect(screen.queryByText("10 / 30")).not.toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("tabindex", "0");
    fireEvent.pointerEnter(bar, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Lv 2 · 10 / 30");
  });

  it("omits the level from the tooltip label when there is none", () => {
    render(<CharacterExpBar currExp={10} maxExp={30} labelsInTooltip />);
    const bar = screen.getByRole("progressbar");
    fireEvent.pointerEnter(bar, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(/^10 \/ 30$/);
  });
});
