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
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.pointerEnter(btn, { pointerType: "mouse" });
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("Dica curta");
    expect(btn).toHaveAttribute("aria-describedby", tip.id);
    fireEvent.pointerLeave(btn, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("foco mostra, blur esconde", () => {
    const btn = setup();
    fireEvent.focus(btn);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.blur(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("toque mostra e some sozinha depois do tempo", () => {
    const btn = setup();
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    fireEvent.click(btn);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("clique de mouse não abre a dica", () => {
    const btn = setup();
    fireEvent.pointerDown(btn, { pointerType: "mouse" });
    fireEvent.click(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("enabled=false nunca mostra", () => {
    const btn = setup(false);
    fireEvent.pointerEnter(btn, { pointerType: "mouse" });
    fireEvent.focus(btn);
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    fireEvent.click(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
