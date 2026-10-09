import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ActionBalloon from "../ActionBalloon";

describe("ActionBalloon", () => {
  it("anuncia o texto como status", () => {
    render(<ActionBalloon lines={[{ text: "Ataca A · Espada", tone: "neutral" }]} />);
    expect(screen.getByRole("status")).toHaveTextContent("Ataca A · Espada");
  });

  it("muda de cor conforme o tom", () => {
    const { rerender } = render(<ActionBalloon lines={[{ text: "x", tone: "success" }]} />);
    const bg = () => getComputedStyle(screen.getByRole("status")).backgroundColor;
    const success = bg();
    rerender(<ActionBalloon lines={[{ text: "x", tone: "failure" }]} />);
    const failure = bg();
    rerender(<ActionBalloon lines={[{ text: "x", tone: "neutral" }]} />);
    expect(new Set([success, failure, bg()]).size).toBe(3);
  });

  it("várias linhas da mesma peça saem num balão só, empilhadas, cada uma na cor do seu tom", () => {
    render(
      <ActionBalloon
        lines={[
          { text: "−3", tone: "failure" },
          { text: "acertou 1 de 2", tone: "success" },
        ]}
      />,
    );
    const balloon = screen.getByRole("status");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    const failure = screen.getByText("−3");
    const success = screen.getByText("acertou 1 de 2");
    expect(balloon).toContainElement(failure);
    expect(balloon).toContainElement(success);
    // A ordem de leitura é a de chegada.
    expect(failure.compareDocumentPosition(success) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(getComputedStyle(failure).backgroundColor).not.toBe(getComputedStyle(success).backgroundColor);
  });
});
