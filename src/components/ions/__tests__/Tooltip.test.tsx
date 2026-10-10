import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Tooltip from "../Tooltip";

function setup(enabled?: boolean) {
  render(
    <Tooltip label="Dica curta" enabled={enabled}>
      <button type="button">Alvo</button>
    </Tooltip>,
  );
  return screen.getByRole("button", { name: "Alvo" });
}

describe("Tooltip", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("mouse: entrar mostra, sair esconde, e o filho aponta para a dica", () => {
    const btn = setup();
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
    fireEvent.pointerEnter(btn, { pointerType: "mouse" });
    const tip = screen.getByRole("tooltip", { hidden: true });
    expect(tip).toHaveTextContent("Dica curta");
    expect(btn).toHaveAttribute("aria-describedby");
    fireEvent.pointerLeave(btn, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });

  it("a descrição já está no DOM antes de hover/foco; desligada, não há describedby", () => {
    const btn = setup();
    const desc = document.getElementById(btn.getAttribute("aria-describedby") ?? "");
    expect(desc).toHaveTextContent("Dica curta");
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });

  it("desligada: sem aria-describedby", () => {
    const btn = setup(false);
    expect(btn).not.toHaveAttribute("aria-describedby");
  });

  it("Esc esconde a dica aberta", () => {
    const btn = setup();
    fireEvent.pointerEnter(btn, { pointerType: "mouse" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });

  it("foco mostra, blur esconde", () => {
    const btn = setup();
    fireEvent.focus(btn);
    expect(screen.getByRole("tooltip", { hidden: true })).toBeInTheDocument();
    fireEvent.blur(btn);
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });

  it("toque mostra e some sozinha depois do tempo", () => {
    const btn = setup();
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    fireEvent.click(btn);
    expect(screen.getByRole("tooltip", { hidden: true })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });

  it("clique de mouse não abre a dica", () => {
    const btn = setup();
    fireEvent.pointerDown(btn, { pointerType: "mouse" });
    fireEvent.click(btn);
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });

  it("enabled=false nunca mostra", () => {
    const btn = setup(false);
    fireEvent.pointerEnter(btn, { pointerType: "mouse" });
    fireEvent.focus(btn);
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    fireEvent.click(btn);
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });
});
