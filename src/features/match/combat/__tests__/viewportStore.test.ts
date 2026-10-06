import { describe, it, expect, vi } from "vitest";
import { createViewportStore } from "../viewportStore";

describe("createViewportStore", () => {
  it("nasce sem enquadramento", () => {
    expect(createViewportStore().getSnapshot()).toBeNull();
  });

  it("set guarda o valor e avisa quem assina", () => {
    const store = createViewportStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ x: 10, y: 20, scale: 1.5 });
    expect(store.getSnapshot()).toEqual({ x: 10, y: 20, scale: 1.5 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("o mesmo valor não avisa de novo nem troca o snapshot", () => {
    const store = createViewportStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ x: 10, y: 20, scale: 1.5 });
    const first = store.getSnapshot();
    store.set({ x: 10, y: 20, scale: 1.5 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe(first);
  });

  it("quem cancela a assinatura não é mais avisado", () => {
    const store = createViewportStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.set({ x: 1, y: 2, scale: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("set é estável e funciona solto do objeto (vai direto como callback do mapa)", () => {
    const store = createViewportStore();
    const { set } = store;
    set({ x: 3, y: 4, scale: 2 });
    expect(store.getSnapshot()).toEqual({ x: 3, y: 4, scale: 2 });
  });
});
