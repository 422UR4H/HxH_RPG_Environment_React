import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CharacterExpBar from "../CharacterExpBar";

describe("CharacterExpBar", () => {
  it("shows the labels beside the bar by default", () => {
    render(<CharacterExpBar currExp={10} maxExp={30} level={2} />);
    expect(screen.getByText("Lv 2")).toBeInTheDocument();
    expect(screen.getByText("10 / 30")).toBeInTheDocument();
  });

  it("keeps Lv visible and moves only the exp numbers to the bubble when labelsInTooltip is set", () => {
    render(<CharacterExpBar currExp={10} maxExp={30} level={2} labelsInTooltip />);
    expect(screen.getByText("Lv 2")).toBeInTheDocument();
    expect(screen.queryByText("10 / 30")).not.toBeInTheDocument();
    const wrapper = screen.getByRole("progressbar").parentElement as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText("Lv 2 · 10 / 30")).toBeInTheDocument();
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByText("Lv 2 · 10 / 30")).not.toBeInTheDocument();
  });

  it("shows Lv visible with labelsInTooltip even when max exp is 0", () => {
    render(<CharacterExpBar currExp={0} maxExp={0} level={5} labelsInTooltip />);
    expect(screen.getByText("Lv 5")).toBeInTheDocument();
  });

  it("shows Lv 0 with labelsInTooltip (level 0 still counts as a level)", () => {
    render(<CharacterExpBar currExp={0} maxExp={0} level={0} labelsInTooltip />);
    expect(screen.getByText("Lv 0")).toBeInTheDocument();
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
