import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddNpcPicker, RegencyControls } from "../MasterControls";
import type { RoundMode } from "../combatMessages";

function setup(mode: RoundMode, queueLength: number, orderLength: number, roundTurns?: number) {
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
      roundTurns={roundTurns}
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

  it("Corrida sem nenhum turno na rodada: 'Encerrar rodada' travado, e o hover diz por quê", () => {
    const onOpenNext = setup("Race", 0, 0, 0);
    const btn = screen.getByRole("button", { name: "Encerrar rodada" });
    expect(btn).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(btn);
    expect(onOpenNext).not.toHaveBeenCalled();
    fireEvent.pointerEnter(btn, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Nenhum turno aconteceu nesta rodada ainda");
  });

  it("Corrida com turno na rodada: encerra", () => {
    const onOpenNext = setup("Race", 0, 0, 2);
    fireEvent.click(screen.getByRole("button", { name: "Encerrar rodada" }));
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

describe("AddNpcPicker", () => {
  const candidates = [{ id: "n1", name: "Goblin" }, { id: "n2", name: "Orc" }];

  it("shows the site select with the prompt and a disabled Adicionar button", () => {
    render(<AddNpcPicker candidates={candidates} onAdd={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Adicionar à partida" })).toHaveTextContent(
      "Escolha um NPC da campanha",
    );
    expect(screen.getByRole("button", { name: "Adicionar" })).toBeDisabled();
  });

  it("adds the chosen NPC and returns to the prompt", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddNpcPicker candidates={candidates} onAdd={onAdd} />);
    await user.click(screen.getByRole("combobox", { name: "Adicionar à partida" }));
    await user.click(await screen.findByRole("option", { name: "Orc" }));
    expect(screen.getByRole("combobox", { name: "Adicionar à partida" })).toHaveTextContent("Orc");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(onAdd).toHaveBeenCalledWith("n2");
    expect(screen.getByRole("combobox", { name: "Adicionar à partida" })).toHaveTextContent(
      "Escolha um NPC da campanha",
    );
    expect(screen.getByRole("button", { name: "Adicionar" })).toBeDisabled();
  });
});
