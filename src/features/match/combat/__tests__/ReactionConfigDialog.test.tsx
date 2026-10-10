import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ReactionConfigDialog from "../ReactionConfigDialog";
import type { ReactionButton } from "../reactionModel";
import { colors, fonts } from "../../../../styles/tokens";

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

  it("a arma só aparece em Repelir, com o padrão do rascunho", () => {
    const { onSend } = setup("dodge", { defaultWeapon: "ShortBow" });
    expect(screen.queryByRole("combobox", { name: "Arma" })).not.toBeInTheDocument();
    fireEvent.click(radio("Repelir"));
    const select = screen.getByRole("combobox", { name: "Arma" });
    expect(select).toHaveValue("ShortBow");
    expect(screen.getByRole("option", { name: "Short Bow" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSend).toHaveBeenLastCalledWith({ kind: "repel", weapon: "ShortBow" });
  });

  it("Fist e Desarmado são uma opção só; sem arma padrão vem Desarmado e envia Fist", () => {
    const { onSend } = setup("repel");
    const select = screen.getByRole("combobox", { name: "Arma" });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Desarmado", "Sword", "Short Bow"]);
    expect(select).toHaveValue("Fist");
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSend).toHaveBeenLastCalledWith({ kind: "repel", weapon: "Fist" });
  });

  it("o custo da fuga fechada cita só a barra de movimento", () => {
    setup("escape");
    fireEvent.click(evasion());
    const cost = screen.getByText(/^Custo:/);
    expect(cost).toHaveTextContent(
      "Custo: barra de movimento. Se você tinha uma ação na fila nessa barra, ela é consumida e a reação rola com Desvantagem.",
    );
    expect(cost).not.toHaveTextContent("ação +");
  });

  it("tipo que não consome nada diz que não cobra", () => {
    setup("dodge");
    expect(screen.getByText("Não cobra nada")).toBeInTheDocument();
    fireEvent.click(radio("Escapar"));
    expect(screen.getByText(/^Custo:/)).toHaveTextContent("Custo: barras de ação e movimento");
  });

  it("rótulos e a arma usam a fonte e a cor do diálogo, não o `* { font-family }` global", () => {
    // A regra do `ResetStyle` que vazava: ela vence a herança, então o rótulo precisa declarar a
    // própria fonte. (O `createGlobalStyle` não chega ao jsdom; a regra entra à mão.)
    const reset = document.head.appendChild(document.createElement("style"));
    reset.textContent = "* { font-family: 'Lato'; }";
    // O token é "white"; o computado vem em rgb — normaliza pelo próprio jsdom.
    const probe = document.body.appendChild(document.createElement("div"));
    probe.style.color = colors.textPrimary;
    const textPrimary = getComputedStyle(probe).color;
    probe.remove();
    try {
      setup("repel");
      const select = screen.getByRole("combobox", { name: "Arma" });
      const styled = [
        radio("Esquivar").closest("label"),
        evasion().closest("label"),
        select.closest("label"),
        select,
        screen.getByRole("option", { name: "Desarmado" }),
      ];
      for (const el of styled) {
        const style = getComputedStyle(el as HTMLElement);
        expect(style.fontFamily).toBe(fonts.sans);
        expect(style.color).toBe(textPrimary);
      }
    } finally {
      reset.remove();
    }
  });

  it("Cancelar não envia", () => {
    const { onSend, onCancel } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
  });
});
