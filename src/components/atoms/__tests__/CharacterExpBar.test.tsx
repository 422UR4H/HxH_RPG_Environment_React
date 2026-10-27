import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CharacterExpBar from "../CharacterExpBar";

describe("CharacterExpBar", () => {
  it("shows the labels beside the bar by default", () => {
    render(<CharacterExpBar currExp={10} maxExp={30} level={2} />);
    expect(screen.getByText("Lv 2")).toBeInTheDocument();
    expect(screen.getByText("10 / 30")).toBeInTheDocument();
  });

  it("hides the labels and shows them in the bubble on hover when labelsInTooltip is set", () => {
    render(<CharacterExpBar currExp={10} maxExp={30} level={2} labelsInTooltip />);
    expect(screen.queryByText("Lv 2")).not.toBeInTheDocument();
    expect(screen.queryByText("10 / 30")).not.toBeInTheDocument();
    const wrapper = screen.getByRole("progressbar").parentElement as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText("Lv 2 · 10 / 30")).toBeInTheDocument();
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByText("Lv 2 · 10 / 30")).not.toBeInTheDocument();
  });

  it("omits the level from the bubble label when there is none", () => {
    render(<CharacterExpBar currExp={10} maxExp={30} labelsInTooltip />);
    fireEvent.mouseEnter(screen.getByRole("progressbar").parentElement as HTMLElement);
    expect(screen.getByText("10 / 30")).toBeInTheDocument();
  });

  it("shows no bubble when there is no level and no max exp", () => {
    render(<CharacterExpBar currExp={0} maxExp={0} labelsInTooltip />);
    fireEvent.mouseEnter(screen.getByRole("progressbar").parentElement as HTMLElement);
    expect(screen.queryByText("0 / 0")).toBeNull();
    expect(screen.queryByText(/Lv/)).toBeNull();
  });
});
