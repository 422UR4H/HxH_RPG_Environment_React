import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RegencyControls } from "../MasterControls";
import type { RoundMode } from "../combatMessages";

function setup(mode: RoundMode, queueLength: number, orderLength: number) {
  const onOpenNext = vi.fn();
  render(
    <RegencyControls
      mode={mode}
      onModeChange={vi.fn()}
      onOpenNext={onOpenNext}
      onCloseTurn={vi.fn()}
      canCloseTurn
      onNewScene={vi.fn()}
      canChangeScene
      queueLength={queueLength}
      orderLength={orderLength}
    />,
  );
  return onOpenNext;
}

describe("RegencyControls — Abrir próxima", () => {
  it("Corrida com ordem vazia vira 'Encerrar rodada', habilitado", () => {
    const onOpenNext = setup("Race", 0, 0);
    const btn = screen.getByRole("button", { name: "Encerrar rodada" });
    expect(btn).not.toHaveAttribute("aria-disabled");
    fireEvent.click(btn);
    expect(onOpenNext).toHaveBeenCalledTimes(1);
  });

  it("Livre sem fila: aria-disabled, não envia e o hover explica", () => {
    const onOpenNext = setup("Free", 0, 0);
    const btn = screen.getByRole("button", { name: "Abrir próxima" });
    expect(btn).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(btn);
    expect(onOpenNext).not.toHaveBeenCalled();
    fireEvent.pointerEnter(btn, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("A fila de ações está vazia");
  });

  it("Livre com fila: botão normal", () => {
    const onOpenNext = setup("Free", 2, 0);
    const btn = screen.getByRole("button", { name: "Abrir próxima" });
    expect(btn).not.toHaveAttribute("aria-disabled");
    fireEvent.click(btn);
    expect(onOpenNext).toHaveBeenCalledTimes(1);
    fireEvent.pointerEnter(btn, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });
});
