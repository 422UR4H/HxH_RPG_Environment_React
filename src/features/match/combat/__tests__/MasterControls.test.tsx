import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddNpcPicker, EndMatchButton, HeaderRound, QueueHeader, TurnControls } from "../MasterControls";
import type { RoundMode } from "../combatMessages";

function setup(mode: RoundMode, queueLength: number, orderLength: number, roundTurns?: number) {
  const onOpenNext = vi.fn();
  render(
    <TurnControls
      mode={mode}
      onOpenNext={onOpenNext}
      onCloseTurn={vi.fn()}
      canCloseTurn
      queueLength={queueLength}
      orderLength={orderLength}
      roundTurns={roundTurns}
    />,
  );
  return onOpenNext;
}

describe("TurnControls — Abrir próxima", () => {
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

// Review Focus 4: travado, o botão segue focável e explica o porquê (também no toque).
describe("EndMatchButton", () => {
  it("enabled: opens the end flow", () => {
    const onClick = vi.fn();
    render(<EndMatchButton blockedReason={null} onClick={onClick} />);
    const btn = screen.getByRole("button", { name: "Encerrar partida" });
    expect(btn).not.toHaveAttribute("aria-disabled");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each([
    "Encerre o combate antes (troque de cena).",
    "Feche o turno aberto antes.",
    "Defina a hora da partida antes.",
  ])("blocked (%s): aria-disabled, no click, and the tooltip explains", (reason) => {
    const onClick = vi.fn();
    render(<EndMatchButton blockedReason={reason} onClick={onClick} />);
    const btn = screen.getByRole("button", { name: "Encerrar partida" });
    expect(btn).toHaveAttribute("aria-disabled", "true");
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    fireEvent.click(btn);
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(reason);
  });

  it("disables Fechar turno when no turn is open", () => {
    render(
      <TurnControls
        mode="Free"
        onOpenNext={vi.fn()}
        onCloseTurn={vi.fn()}
        canCloseTurn={false}
        queueLength={1}
        orderLength={0}
      />,
    );
    expect(screen.getByRole("button", { name: "Fechar turno" })).toBeDisabled();
  });
});

describe("Round placement on the landscape phone", () => {
  // O jsdom não avalia @media: lemos o CSS gerado e exigimos a regra do celular deitado.
  const css = () =>
    Array.from(document.querySelectorAll("style"))
      .map((el) => el.textContent ?? "")
      .join("\n") +
    Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules).map((r) => r.cssText))
      .join("\n");

  it("keeps the Round in the header and hides it from the queue top", () => {
    render(
      <>
        <HeaderRound mode="Free" onModeChange={vi.fn()} />
        <QueueHeader round={<span>fila-round</span>} turn={<span>turno</span>} />
      </>,
    );
    const headerBox = screen.getByText("Round").parentElement!;
    const queueRound = screen.getByText("fila-round").parentElement!;
    const rules = css();
    const landscape = "(orientation: landscape) and (max-height: 540px)";
    const rulesFor = (el: Element) =>
      Array.from(el.classList)
        .filter((c) => c.startsWith("sc-") === false)
        .map((c) => new RegExp(`@media ${landscape.replace(/[()]/g, "\\$&")}[^{]*\\{\\s*\\.${c}\\s*\\{([^}]*)\\}`).exec(rules)?.[1] ?? "");
    expect(rulesFor(headerBox).join("")).toMatch(/display:\s*flex/);
    expect(rulesFor(queueRound).join("")).toMatch(/display:\s*none/);
  });
});
