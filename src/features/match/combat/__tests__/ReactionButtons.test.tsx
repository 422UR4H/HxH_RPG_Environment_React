import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, createEvent, fireEvent, render, screen } from "@testing-library/react";
import ReactionButtons from "../ReactionButtons";
import { REACTION_BUTTONS, REACTION_BUTTON_LABELS } from "../reactionModel";
import type { ReactionStatus } from "../reactionModel";
import { HOLD_MS } from "../../../tactical-map/hooks/useHoldGesture";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(status: ReactionStatus = "available") {
  const onQuick = vi.fn();
  const onConfigure = vi.fn();
  render(<ReactionButtons status={status} name="Gon" showName onQuick={onQuick} onConfigure={onConfigure} />);
  return { onQuick, onConfigure };
}

const button = (label: string) => screen.getByRole("button", { name: new RegExp(`^${label}`) });

describe("ReactionButtons", () => {
  it("disponível: mostra os cinco botões dentro do grupo de reagir", () => {
    setup();
    expect(screen.getByRole("group", { name: "Reagir — Gon" })).toBeInTheDocument();
    for (const b of REACTION_BUTTONS) {
      expect(button(REACTION_BUTTON_LABELS[b])).toHaveTextContent(REACTION_BUTTON_LABELS[b]);
    }
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(button("Esquivar")).toHaveAttribute("aria-label", "Esquivar — segure para configurar");
  });

  it("toque rápido envia direto", () => {
    const { onQuick, onConfigure } = setup();
    const b = button("Esquivar");
    fireEvent.pointerDown(b, { button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(b, { button: 0, clientX: 5, clientY: 5 });
    expect(onQuick).toHaveBeenCalledWith("dodge");
    expect(onConfigure).not.toHaveBeenCalled();
  });

  // Review Focus 3: segurar configura UMA vez e o soltar que vem depois não envia.
  it("segurar abre a configuração uma vez e o soltar não envia", () => {
    const { onQuick, onConfigure } = setup();
    const b = button("Esquivar");
    fireEvent.pointerDown(b, { button: 0, clientX: 5, clientY: 5 });
    act(() => { vi.advanceTimersByTime(HOLD_MS); });
    fireEvent.pointerUp(b, { button: 0, clientX: 5, clientY: 5 });
    expect(onConfigure).toHaveBeenCalledTimes(1);
    expect(onConfigure).toHaveBeenCalledWith("dodge");
    expect(onQuick).not.toHaveBeenCalled();
  });

  // Mouse não captura o ponteiro: arrastar para fora manda os moves a outro elemento.
  it("mouse: sair do botão segurando cancela o hold — nada abre, nada é enviado", () => {
    const { onQuick, onConfigure } = setup();
    const b = button("Esquivar");
    fireEvent.pointerDown(b, { button: 0, pointerType: "mouse", clientX: 5, clientY: 5 });
    fireEvent.pointerLeave(b, { pointerType: "mouse" });
    act(() => { vi.advanceTimersByTime(HOLD_MS + 50); });
    expect(onConfigure).not.toHaveBeenCalled();
    expect(onQuick).not.toHaveBeenCalled();
  });

  it("toque: pointerleave não cancela — segurar ainda abre a configuração", () => {
    const { onQuick, onConfigure } = setup();
    const b = button("Esquivar");
    fireEvent.pointerDown(b, { button: 0, pointerType: "touch", clientX: 5, clientY: 5 });
    fireEvent.pointerLeave(b, { pointerType: "touch" });
    act(() => { vi.advanceTimersByTime(HOLD_MS); });
    expect(onConfigure).toHaveBeenCalledWith("dodge");
    expect(onQuick).not.toHaveBeenCalled();
  });

  it("botão direito configura na hora, sem menu do navegador e sem enviar", () => {
    const { onQuick, onConfigure } = setup();
    const b = button("Repelir");
    fireEvent.pointerDown(b, { button: 2, clientX: 5, clientY: 5 });
    const ev = createEvent.contextMenu(b);
    fireEvent(b, ev);
    fireEvent.pointerUp(b, { button: 2, clientX: 5, clientY: 5 });
    expect(ev.defaultPrevented).toBe(true);
    expect(onConfigure).toHaveBeenCalledTimes(1);
    expect(onConfigure).toHaveBeenCalledWith("repel");
    expect(onQuick).not.toHaveBeenCalled();
  });

  // Windows entrega o contextmenu DEPOIS do pointerup (R20): o soltar do botão direito
  // não pode virar clique.
  it("botão direito na ordem do Windows (pointerup antes do contextmenu) também não envia", () => {
    const { onQuick, onConfigure } = setup();
    const b = button("Repelir");
    fireEvent.pointerDown(b, { button: 2, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(b, { button: 2, clientX: 5, clientY: 5 });
    fireEvent.contextMenu(b);
    expect(onConfigure).toHaveBeenCalledTimes(1);
    expect(onQuick).not.toHaveBeenCalled();
  });

  it("teclado: Enter envia, Shift+Enter configura", () => {
    const { onQuick, onConfigure } = setup();
    fireEvent.keyDown(button("Escapar"), { key: "Enter" });
    expect(onQuick).toHaveBeenCalledWith("escape");
    fireEvent.keyDown(button("Escapar"), { key: "Enter", shiftKey: true });
    expect(onConfigure).toHaveBeenCalledWith("escape");
    expect(onQuick).toHaveBeenCalledTimes(1);
  });

  // O leitor de tela (e o `click()` de quem automatiza) ativa o botão com um click sintético,
  // sem ponteiro nem tecla antes: `detail` 0.
  it("clique sintético (sem ponteiro, detail 0) envia", () => {
    const { onQuick, onConfigure } = setup();
    fireEvent.click(button("Repelir"), { detail: 0 });
    expect(onQuick).toHaveBeenCalledTimes(1);
    expect(onQuick).toHaveBeenCalledWith("repel");
    expect(onConfigure).not.toHaveBeenCalled();
  });

  it("clique de mouse envia uma vez só: o pointerup já enviou, o click que vem depois não", () => {
    const { onQuick } = setup();
    const b = button("Esquivar");
    fireEvent.pointerDown(b, { button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(b, { button: 0, clientX: 5, clientY: 5 });
    fireEvent.click(b, { detail: 1 });
    expect(onQuick).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["sending", "Enviando a reação…"],
    ["attached", "Reação enviada — aguardando o mestre"],
    ["opened", "O mestre deu a palavra — narre sua reação"],
  ] as const)("%s: mostra o estado e nenhum botão", (status, text) => {
    setup(status);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
