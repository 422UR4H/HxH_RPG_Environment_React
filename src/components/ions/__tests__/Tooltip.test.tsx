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
    act(() => { vi.advanceTimersByTime(6000); });
    expect(screen.getByRole("tooltip", { hidden: true })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });

  it("toque mostra e fecha ao tocar em outro lugar", () => {
    const btn = setup();
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    fireEvent.click(btn);
    expect(screen.getByRole("tooltip", { hidden: true })).toBeInTheDocument();
    fireEvent.pointerDown(document.body, { pointerType: "touch" });
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });

  it("tocar no próprio gatilho não fecha a dica pelo toque fora", () => {
    const btn = setup();
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    fireEvent.click(btn);
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    expect(screen.getByRole("tooltip", { hidden: true })).toBeInTheDocument();
  });

  it("clique de mouse não abre a dica", () => {
    const btn = setup();
    fireEvent.pointerDown(btn, { pointerType: "mouse" });
    fireEvent.click(btn);
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });

  it("segurar o toque mostra a dica e engole o clique ao soltar", () => {
    const onClick = vi.fn();
    render(
      <Tooltip label="Dica curta">
        <button type="button" onClick={onClick}>Alvo</button>
      </Tooltip>,
    );
    const btn = screen.getByRole("button", { name: "Alvo" });
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.getByRole("tooltip", { hidden: true })).toBeInTheDocument();
    fireEvent.pointerUp(btn, { pointerType: "touch" });
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
    // o toque seguinte, curto, volta a acionar
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    fireEvent.pointerUp(btn, { pointerType: "touch" });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("toque curto não é segurar: o filho é acionado", () => {
    const onClick = vi.fn();
    render(
      <Tooltip label="Dica curta">
        <button type="button" onClick={onClick}>Alvo</button>
      </Tooltip>,
    );
    const btn = screen.getByRole("button", { name: "Alvo" });
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.pointerUp(btn, { pointerType: "touch" });
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("enabled=false nunca mostra", () => {
    const btn = setup(false);
    fireEvent.pointerEnter(btn, { pointerType: "mouse" });
    fireEvent.focus(btn);
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    fireEvent.click(btn);
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });

  it("renders the bubble on the body, out of any ancestor that would clip or re-anchor it", () => {
    render(
      <div data-testid="card" style={{ overflow: "hidden", filter: "brightness(1.05)" }}>
        <Tooltip label="Motivo">
          <button type="button">Alvo</button>
        </Tooltip>
      </div>,
    );
    fireEvent.focus(screen.getByRole("button", { name: "Alvo" }));
    const tip = screen.getByRole("tooltip", { hidden: true });
    expect(tip.parentElement).toBe(document.body);
    expect(screen.getByTestId("card")).not.toContainElement(tip);
  });

  it("flips above the child when it would pass the window bottom", () => {
    const rect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ top: 700, bottom: 730, left: 100, right: 160, width: 60, height: 30, x: 100, y: 700, toJSON: () => ({}) });
    const w = vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(120);
    const h = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(52);
    const inner = vi.spyOn(window, "innerHeight", "get").mockReturnValue(768);
    try {
      const target = setup();
      fireEvent.focus(target);
      const tip = screen.getByRole("tooltip", { hidden: true });
      expect(tip.style.top).toBe(`${700 - 52 - 6}px`);
    } finally {
      rect.mockRestore();
      w.mockRestore();
      h.mockRestore();
      inner.mockRestore();
    }
  });
});
