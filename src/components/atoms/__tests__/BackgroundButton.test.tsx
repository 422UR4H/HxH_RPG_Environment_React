import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BackgroundButton from "../BackgroundButton";

describe("BackgroundButton", () => {
  it("invokes onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<BackgroundButton onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("uses default aria-label when not provided", () => {
    render(<BackgroundButton onClick={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Abrir background do personagem" })
    ).toBeInTheDocument();
  });

  it("uses custom aria-label when provided", () => {
    render(<BackgroundButton onClick={vi.fn()} ariaLabel="Custom label" />);
    expect(screen.getByRole("button", { name: "Custom label" })).toBeInTheDocument();
  });
});
