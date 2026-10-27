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

  describe("vertical placement", () => {
    function setupAt(placement: "top" | "bottom", rect: { top: number; bottom: number }) {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        ...rect, left: 100, right: 140, width: 40, height: rect.bottom - rect.top, x: 100, y: rect.top, toJSON: () => ({}),
      } as DOMRect);
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(20);
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(50);
      render(
        <Tooltip label="Dica" placement={placement}>
          <button type="button">Alvo</button>
        </Tooltip>,
      );
      fireEvent.pointerEnter(screen.getByRole("button", { name: "Alvo" }), { pointerType: "mouse" });
      return screen.getByRole("tooltip", { hidden: true });
    }
    afterEach(() => { vi.restoreAllMocks(); });

    it("places the bubble above the child with placement top", () => {
      const tip = setupAt("top", { top: 300, bottom: 320 });
      expect(tip.style.top).toBe("274px");
    });

    it("flips to the other side when there is no room", () => {
      const tip = setupAt("top", { top: 10, bottom: 30 });
      expect(tip.style.top).toBe("36px");
    });

    it("flips bottom placement upwards when it would pass the window bottom", () => {
      const tip = setupAt("bottom", { top: window.innerHeight - 30, bottom: window.innerHeight - 10 });
      expect(tip.style.top).toBe(`${window.innerHeight - 30 - 20 - 6}px`);
    });
  });
});
