import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BlockableButton from "../BlockableButton";

describe("BlockableButton", () => {
  it("renders no help mark when there is no reason", () => {
    const { container } = render(<BlockableButton>Expulsar</BlockableButton>);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-disabled");
  });

  it("renders the help mark hidden from assistive tech only when blocked", () => {
    const { container } = render(
      <BlockableButton blockedReason="Motivo">Expulsar</BlockableButton>,
    );
    const marks = container.querySelectorAll("img");
    expect(marks).toHaveLength(2); // o "?" e o espelho que reserva o lado esquerdo
    marks.forEach((m) => expect(m).toHaveAttribute("aria-hidden", "true"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "true");
  });

  it("skips the left mirror when the label is start-aligned", () => {
    const { container } = render(
      <BlockableButton blockedReason="Motivo" labelAlign="start">Excluir</BlockableButton>,
    );
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });
});
