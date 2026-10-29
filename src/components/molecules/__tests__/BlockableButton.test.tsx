import { render, screen } from "@testing-library/react";
import styled from "styled-components";
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

describe("BlockableButton gap", () => {
  const Gapped = styled(BlockableButton)`
    display: flex;
    gap: 10px;
  `;

  // O jsdom não propaga `gap` por herança, então o teste confere a cadeia de regras:
  // botão (gap do consumidor) -> Inner (gap: inherit) -> Label (gap: inherit).
  const rulesFor = (el: Element) => {
    const css = Array.from(document.querySelectorAll("style")).map((s) => s.textContent).join("");
    return el.className.split(" ").flatMap((c) => css.match(new RegExp(`\\.${c}\\s*\\{[^}]*\\}`, "g")) ?? []).join("");
  };

  it.each([[undefined], ["Motivo"]])("keeps the consumer gap reaching the label children (reason: %s)", (reason) => {
    render(<Gapped blockedReason={reason}><span>icon</span>Texto</Gapped>);
    const label = screen.getByText("icon").parentElement as HTMLElement;
    const inner = label.parentElement as HTMLElement;
    expect(rulesFor(screen.getByRole("button"))).toMatch(/gap:\s*10px/);
    expect(rulesFor(inner)).toMatch(/gap:\s*inherit/);
    expect(rulesFor(label)).toMatch(/gap:\s*inherit/);
  });
});
