import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ReactionConfigDialog from "../ReactionConfigDialog";
import type { ReactionButton } from "../reactionModel";

function setup(initial: ReactionButton = "dodge", extra: { defaultWeapon?: string } = {}) {
  const onSend = vi.fn();
  const onCancel = vi.fn();
  render(
    <ReactionConfigDialog
      name="Gon"
      initial={initial}
      weapons={["Sword", "ShortBow"]}
      onSend={onSend}
      onCancel={onCancel}
      {...extra}
    />,
  );
  return { onSend, onCancel };
}

const radio = (label: string) => screen.getByRole("radio", { name: label });
const evasion = () => screen.getByRole("checkbox", { name: /Evasão/ });

describe("ReactionConfigDialog", () => {
  it("abre com o botão segurado já escolhido", () => {
    setup("escapeGuard");
    expect(screen.getByRole("dialog", { name: "Reagir — Gon" })).toBeInTheDocument();
    expect(radio("Escape defensivo")).toBeChecked();
    expect(radio("Esquivar")).not.toBeChecked();
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

  it("a arma só aparece em Repelir, com o padrão do rascunho e a opção Desarmado", () => {
    const { onSend } = setup("dodge", { defaultWeapon: "ShortBow" });
    expect(screen.queryByRole("combobox", { name: "Arma" })).not.toBeInTheDocument();
    fireEvent.click(radio("Repelir"));
    const select = screen.getByRole("combobox", { name: "Arma" });
    expect(select).toHaveValue("ShortBow");
    expect(screen.getByRole("option", { name: "Short Bow" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Desarmado" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSend).toHaveBeenLastCalledWith({ kind: "repel", weapon: "ShortBow" });

    fireEvent.change(select, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSend).toHaveBeenLastCalledWith({ kind: "repel", weapon: undefined });
  });

  it("o custo da fuga fechada cita só a barra de movimento", () => {
    setup("escape");
    fireEvent.click(evasion());
    const cost = screen.getByText(/^Cobra:/);
    expect(cost).toHaveTextContent("Cobra: movimento — consome a ação que você tinha na fila, com Desvantagem");
    expect(cost).not.toHaveTextContent("ação +");
  });

  it("tipo que não consome nada diz que não cobra", () => {
    setup("dodge");
    expect(screen.getByText("Não cobra nada")).toBeInTheDocument();
    fireEvent.click(radio("Escapar"));
    expect(screen.getByText(/^Cobra:/)).toHaveTextContent("Cobra: ação + movimento");
  });

  it("Cancelar não envia", () => {
    const { onSend, onCancel } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
  });
});
