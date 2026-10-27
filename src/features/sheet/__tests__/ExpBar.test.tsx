import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ExpBar from "../../../components/ions/ExpBar";

describe("ExpBar", () => {
  it("renders a progressbar element with correct aria values", () => {
    render(<ExpBar currExp={50} maxExp={100} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("is keyboard focusable", () => {
    render(<ExpBar currExp={50} maxExp={100} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("tabindex", "0");
  });

  it("does not show the bubble on initial render", () => {
    render(<ExpBar currExp={7} maxExp={30} />);
    expect(screen.queryByRole("tooltip", { hidden: true })).not.toBeInTheDocument();
  });

  it("shows the bubble on hover, rendered in body outside the card", () => {
    const { container } = render(<ExpBar currExp={7} maxExp={30} />);
    fireEvent.pointerEnter(screen.getByRole("progressbar"), { pointerType: "mouse" });
    const tip = screen.getByRole("tooltip", { hidden: true });
    expect(tip).toHaveTextContent("7/30");
    expect(container.contains(tip)).toBe(false);
    expect(tip.parentElement).toBe(document.body);
  });

  it("hides the bubble on mouse leave and shows 0/N when empty", () => {
    render(<ExpBar currExp={0} maxExp={100} />);
    const bar = screen.getByRole("progressbar");
    fireEvent.pointerEnter(bar, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("0/100");
    fireEvent.pointerLeave(bar, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip", { hidden: true })).not.toBeInTheDocument();
  });

  it("shows the bubble on keyboard focus", () => {
    render(<ExpBar currExp={7} maxExp={30} />);
    fireEvent.focus(screen.getByRole("progressbar"));
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("7/30");
  });
});
