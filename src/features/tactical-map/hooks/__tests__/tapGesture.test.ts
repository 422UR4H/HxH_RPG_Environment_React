import { describe, it, expect } from "vitest";
import { createTapTracker } from "../tapGesture";

const at = (clientX: number, clientY: number, pointerId = 1, button?: number) => ({
  pointerId,
  clientX,
  clientY,
  button,
});

describe("createTapTracker", () => {
  it("down e up no mesmo ponto é toque", () => {
    const t = createTapTracker();
    t.down(at(10, 10));
    expect(t.up(at(10, 10))).toBe(true);
  });

  it("um segundo ponteiro enquanto armado (multitoque) desarma: nenhum dos dois é toque", () => {
    const t = createTapTracker();
    t.down(at(10, 10, 1));
    t.down(at(12, 10, 2));
    expect(t.up(at(12, 10, 2))).toBe(false);
  });

  it("andar 4px e soltar ainda é toque", () => {
    const t = createTapTracker();
    t.down(at(10, 10));
    t.move(at(14, 10));
    expect(t.up(at(14, 10))).toBe(true);
  });

  it("andar 10px e voltar à origem antes de soltar NÃO é toque", () => {
    const t = createTapTracker();
    t.down(at(10, 10));
    t.move(at(20, 10));
    t.move(at(10, 10));
    expect(t.up(at(10, 10))).toBe(false);
  });

  it("up sem down não é toque", () => {
    expect(createTapTracker().up(at(0, 0))).toBe(false);
  });

  it("up de outro pointerId não é toque", () => {
    const t = createTapTracker();
    t.down(at(0, 0, 1));
    expect(t.up(at(0, 0, 2))).toBe(false);
  });

  it("cancel entre down e up não é toque", () => {
    const t = createTapTracker();
    t.down(at(0, 0));
    t.cancel();
    expect(t.up(at(0, 0))).toBe(false);
  });

  it("botão direito no down não arma", () => {
    const t = createTapTracker();
    t.down(at(0, 0, 1, 2));
    expect(t.up(at(0, 0))).toBe(false);
  });

  it("dois toques seguidos funcionam (up desarma)", () => {
    const t = createTapTracker();
    t.down(at(0, 0));
    expect(t.up(at(0, 0))).toBe(true);
    expect(t.up(at(0, 0))).toBe(false);
    t.down(at(5, 5));
    expect(t.up(at(5, 5))).toBe(true);
  });
});
