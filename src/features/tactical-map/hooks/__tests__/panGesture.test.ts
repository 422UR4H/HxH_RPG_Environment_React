import { describe, it, expect } from "vitest";
import { createPanTracker } from "../panGesture";

describe("createPanTracker", () => {
  it("um ponteiro: down → arm → move devolve a câmera inicial + delta", () => {
    const t = createPanTracker();
    t.down(1, { x: 100, y: 100 });
    expect(t.arm(1, { x: 10, y: 20 })).toBe(true);
    expect(t.isPanning()).toBe(true);
    expect(t.move(1, { x: 130, y: 90 })).toEqual({ x: 40, y: 10 });
  });

  it("move de outro pointerId não mexe na câmera", () => {
    const t = createPanTracker();
    t.down(1, { x: 0, y: 0 });
    t.arm(1, { x: 0, y: 0 });
    expect(t.move(2, { x: 50, y: 50 })).toBeNull();
  });

  it("segundo down durante o pan encerra o pan: nenhum dedo move a câmera", () => {
    const t = createPanTracker();
    t.down(1, { x: 0, y: 0 });
    t.arm(1, { x: 0, y: 0 });
    t.down(2, { x: 80, y: 80 });
    expect(t.isPanning()).toBe(false);
    expect(t.move(1, { x: 10, y: 10 })).toBeNull();
    expect(t.move(2, { x: 90, y: 90 })).toBeNull();
  });

  it("segundo down antes do arm: arm devolve false", () => {
    const t = createPanTracker();
    t.down(1, { x: 0, y: 0 });
    t.down(2, { x: 80, y: 80 });
    expect(t.arm(1, { x: 0, y: 0 })).toBe(false);
    expect(t.isPanning()).toBe(false);
  });

  it("ponteiro que soltou antes do arm: arm devolve false", () => {
    const t = createPanTracker();
    t.down(1, { x: 0, y: 0 });
    t.up(1, { x: 0, y: 0 });
    expect(t.arm(1, { x: 0, y: 0 })).toBe(false);
  });

  it("fim da pinça com um dedo: o próximo move parte da câmera do up e da última posição do dedo", () => {
    const t = createPanTracker();
    t.down(1, { x: 0, y: 0 });
    t.arm(1, { x: 0, y: 0 });
    t.down(2, { x: 100, y: 100 });
    t.move(1, { x: 20, y: 30 });
    t.move(2, { x: 120, y: 130 });
    t.up(1, { x: 55, y: 66 });
    expect(t.isPanning()).toBe(true);
    expect(t.move(2, { x: 125, y: 128 })).toEqual({ x: 60, y: 64 });
  });

  it("depois de soltar tudo, um gesto novo de um dedo funciona", () => {
    const t = createPanTracker();
    t.down(1, { x: 0, y: 0 });
    t.arm(1, { x: 0, y: 0 });
    t.down(2, { x: 50, y: 50 });
    t.up(1, { x: 5, y: 5 });
    t.up(2, { x: 5, y: 5 });
    expect(t.isPanning()).toBe(false);
    t.down(3, { x: 200, y: 200 });
    expect(t.arm(3, { x: 7, y: 8 })).toBe(true);
    expect(t.move(3, { x: 210, y: 195 })).toEqual({ x: 17, y: 3 });
  });
});
