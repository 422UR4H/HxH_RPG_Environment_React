import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ActionBalloon from "../ActionBalloon";

describe("ActionBalloon", () => {
  it("anuncia o texto como status", () => {
    render(<ActionBalloon text="Ataca A · Espada" tone="neutral" />);
    expect(screen.getByRole("status")).toHaveTextContent("Ataca A · Espada");
  });
  it("muda de cor conforme o tom", () => {
    const { rerender } = render(<ActionBalloon text="x" tone="success" />);
    const bg = () => getComputedStyle(screen.getByRole("status")).backgroundColor;
    const success = bg();
    rerender(<ActionBalloon text="x" tone="failure" />);
    const failure = bg();
    rerender(<ActionBalloon text="x" tone="neutral" />);
    expect(new Set([success, failure, bg()]).size).toBe(3);
  });
});
