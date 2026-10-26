import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ReactionConfigDialog from "../ReactionConfigDialog";
import type { ReactionButton } from "../reactionModel";
import { colors } from "../../../../styles/tokens";

function setup(initial: ReactionButton = "dodge", extra: { defaultWeapon?: string } = {}) {
  const onSend = vi.fn();
  const onCancel = vi.fn();
  render(
    <ReactionConfigDialog
      name="Gon"
      initial={initial}
      weapons={["Fist", "Sword", "ShortBow"]}
      onSend={onSend}
      onCancel={onCancel}
      {...extra}
    />,
  );
  return { onSend, onCancel };
}

const radio = (label: string) => screen.getByRole("radio", { name: label });
const evasion = () => screen.getByRole("button", { name: /Evasão/ });
const weapon = (label: string) =>
  within(screen.getByRole("radiogroup", { name: "Arma" })).getByRole("radio", { name: label });
const weaponNames = () =>
  within(screen.getByRole("radiogroup", { name: "Arma" })).getAllByRole("radio").map((o) => o.textContent);

describe("ReactionConfigDialog", () => {
  it("abre com o botão segurado já escolhido", () => {
    setup("escapeGuard");
    expect(screen.getByRole("dialog", { name: "Reagir — Gon" })).toBeInTheDocument();
    expect(radio("Escape defensivo")).toHaveAttribute("aria-checked", "true");
    expect(radio("Esquivar")).toHaveAttribute("aria-checked", "false");
  });

  it("Evasão só se liga em Esquivar e Escapar", () => {
    setup("dodge");
    expect(evasion()).toBeEnabled();
    for (const label of ["Não fazer nada", "Escape defensivo", "Repelir"]) {
      fireEvent.click(radio(label));
      expect(evasion()).toBeDisabled();
    }
    fireEvent.click(radio("Escapar"));
    expect(evasion()).toBeEnabled();
  });

  it("Esquivar + Evasão envia a esquiva fechada", () => {
    const { onSend } = setup("dodge");
    fireEvent.click(evasion());
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSend).toHaveBeenCalledWith({ kind: "closedDodge" });
  });

  it("Escapar + Evasão vira fuga fechada: o botão arma a escolha da casa", () => {
    const { onSend } = setup("escape");
    fireEvent.click(evasion());
    fireEvent.click(screen.getByRole("button", { name: "Escolher a casa" }));
    expect(onSend).toHaveBeenCalledWith({ kind: "closedEscape" });
  });

  it("a Evasão não vaza para um tipo que não a aceita", () => {
    const { onSend } = setup("dodge");
    fireEvent.click(evasion());
    fireEvent.click(radio("Não fazer nada"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSend).toHaveBeenCalledWith({ kind: "nothing" });
  });

  it("a arma só aparece em Repelir, com o padrão do rascunho", () => {
    const { onSend } = setup("dodge", { defaultWeapon: "ShortBow" });
    expect(screen.queryByRole("radiogroup", { name: "Arma" })).not.toBeInTheDocument();
    fireEvent.click(radio("Repelir"));
    expect(weapon("Short Bow")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSend).toHaveBeenLastCalledWith({ kind: "repel", weapon: "ShortBow" });
  });

  it("Fist e Desarmado são uma opção só; sem arma padrão vem a primeira arma real", () => {
    const { onSend } = setup("repel");
    expect(weaponNames()).toEqual(["Desarmado", "Sword", "Short Bow"]);
    expect(weapon("Sword")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(weapon("Desarmado"));
    fireEvent.click(weapon("Sword"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSend).toHaveBeenLastCalledWith({ kind: "repel", weapon: "Sword" });
  });

  it("rascunho explícito em Desarmado vence o padrão", () => {
    setup("repel", { defaultWeapon: "Fist" });
    expect(weapon("Desarmado")).toHaveAttribute("aria-checked", "true");
  });

  it("catálogo só com Desarmado fica em Desarmado", () => {
    render(<ReactionConfigDialog name="Gon" initial="repel" weapons={["Fist"]} onSend={vi.fn()} onCancel={vi.fn()} />);
    expect(weapon("Desarmado")).toHaveAttribute("aria-checked", "true");
  });

  it("o custo da fuga fechada cita só a barra de movimento", () => {
    setup("escape");
    fireEvent.click(evasion());
    const cost = screen.getByText(/^Custo:/);
    expect(cost).toHaveTextContent(
      "Custo: barra de movimento. Se você tinha uma ação na fila nessa barra, ela é consumida e a reação rola com Desvantagem — menos se fugir para a mesma casa do movimento da fila.",
    );
    expect(cost).not.toHaveTextContent("ação +");
  });

  it("tipo que não consome nada diz que não cobra", () => {
    setup("dodge");
    expect(screen.getByText("Não cobra nada")).toBeInTheDocument();
    fireEvent.click(radio("Escapar"));
    expect(screen.getByText(/^Custo:/)).toHaveTextContent("Custo: barras de ação e movimento");
  });

  it("choices are buttons, with the selected one in the text color", () => {
    // O token é "white"; o computado vem em rgb — normaliza pelo próprio jsdom.
    const probe = document.body.appendChild(document.createElement("div"));
    probe.style.color = colors.textPrimary;
    const textPrimary = getComputedStyle(probe).color;
    probe.remove();
    setup("repel");
    expect(document.querySelector('input[type="radio"], input[type="checkbox"], select')).toBeNull();
    expect(getComputedStyle(radio("Repelir")).color).toBe(textPrimary);
  });

  it("Cancelar não envia", () => {
    const { onSend, onCancel } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
  });
});
