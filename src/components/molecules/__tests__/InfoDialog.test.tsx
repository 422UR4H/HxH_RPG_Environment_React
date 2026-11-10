import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import InfoDialog from "../InfoDialog";

describe("InfoDialog", () => {
  it("focuses the close button on mount", () => {
    render(<InfoDialog title="Aviso" message="Leia isto" onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Entendi" })).toHaveFocus();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<InfoDialog title="Aviso" message="Leia isto" onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on click outside the dialog", () => {
    const onClose = vi.fn();
    render(<InfoDialog title="Aviso" message="Leia isto" onClose={onClose} />);
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on click inside the dialog", () => {
    const onClose = vi.fn();
    render(<InfoDialog title="Aviso" message="Leia isto" onClose={onClose} />);
    fireEvent.click(screen.getByText("Leia isto"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not steal focus on re-render with a new onClose", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<InfoDialog title="Aviso" message="Leia isto" onClose={first} />);
    const button = screen.getByRole("button", { name: "Entendi" });
    button.blur();
    rerender(<InfoDialog title="Aviso" message="Leia isto" onClose={second} />);
    expect(button).not.toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});
