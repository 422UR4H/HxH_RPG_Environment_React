import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHoldTracker } from "../useHoldGesture";

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
