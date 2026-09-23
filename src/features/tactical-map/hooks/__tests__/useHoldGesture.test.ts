import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHoldTracker, createRightPressTracker } from "../useHoldGesture";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createHoldTracker", () => {
  it("dispara o hold depois do prazo e marca o clique seguinte como consumido", () => {
    const onHold = vi.fn();
    const t = createHoldTracker({ onHold });
    t.start("p1", 10, 10);
    vi.advanceTimersByTime(450);
    expect(onHold).toHaveBeenCalledWith("p1");
    expect(t.end()).toBe("hold");
  });

  it("cancela quando o ponteiro anda mais que a tolerância", () => {
    const onHold = vi.fn();
    const t = createHoldTracker({ onHold });
    t.start("p1", 10, 10);
    t.move(30, 10);
    vi.advanceTimersByTime(450);
    expect(onHold).not.toHaveBeenCalled();
    expect(t.end()).toBe("none");
  });

  it("soltar antes do prazo é clique", () => {
    const onHold = vi.fn();
    const t = createHoldTracker({ onHold });
    t.start("p1", 10, 10);
    vi.advanceTimersByTime(200);
    expect(t.end()).toBe("click");
    expect(onHold).not.toHaveBeenCalled();
  });

  // R5: botão direito precisa disparar o hold NA HORA e suprimir o clique
  // seguinte, como um hold de verdade — sem esperar o timer e sem também
  // contar como clique.
  it("fireNow dispara o hold imediatamente e o end() seguinte reporta hold sem repetir onHold", () => {
    const onHold = vi.fn();
    const t = createHoldTracker({ onHold });
    t.start("p1", 10, 10);
    t.fireNow("p1");
    expect(onHold).toHaveBeenCalledTimes(1);
    expect(onHold).toHaveBeenCalledWith("p1");
    expect(t.end()).toBe("hold");
    vi.advanceTimersByTime(450);
    expect(onHold).toHaveBeenCalledTimes(1);
  });
});

// R20: o atalho de botão direito não pode depender da ordem entre `contextmenu`
// e `pointerup` — Windows entrega contextmenu DEPOIS do pointerup; Linux/macOS,
// antes. O resolver precisa produzir exatamente um long-press e zero cliques
// nas duas ordens.
describe("createRightPressTracker", () => {
  it("ordem Linux/macOS: press → contextmenu → release — um long-press, zero cliques", () => {
    const t = createRightPressTracker();
    t.press("p1");
    expect(t.contextmenu()).toBe("p1");
    expect(t.release()).toBe("none");
  });

  it("ordem Windows: press → release → contextmenu — um long-press, zero cliques", () => {
    const t = createRightPressTracker();
    t.press("p1");
    expect(t.release()).toBe("none");
    expect(t.contextmenu()).toBe("p1");
  });

  it("depois de resolvido, um contextmenu solto (sem press) não dispara de novo — clique esquerdo seguinte não é contaminado", () => {
    const t = createRightPressTracker();
    t.press("p1");
    t.contextmenu();
    // Nenhum novo press aconteceu (o próximo pointerdown foi um clique
    // esquerdo comum, que nunca chama press/contextmenu deste tracker) —
    // um contextmenu solto e tardio não deve reviver o id antigo.
    expect(t.contextmenu()).toBeNull();
  });

  it("reset() limpa um press pendente sem contextmenu correspondente (novo pointerdown de qualquer botão)", () => {
    const t = createRightPressTracker();
    t.press("p1");
    t.reset();
    expect(t.contextmenu()).toBeNull();
  });
});
