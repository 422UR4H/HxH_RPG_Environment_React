import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { server } from "./server";

// --- ResizeObserver mock -----------------------------------------------------
// jsdom não implementa ResizeObserver. O mock abaixo retorna dimensões zero,
// o que faz TacticalMapStage não renderizar (condição width > 0 && height > 0).
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// --- window.matchMedia mock --------------------------------------------------
// jsdom não implementa matchMedia. O mock abaixo sempre retorna matches: false,
// colocando o layout no estado "desktop" (sem colapso de sidebars) nos testes.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// --- MSW lifecycle -------------------------------------------------------
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// --- @pixi/react mock --------------------------------------------------------
vi.mock("@pixi/react", async () => {
  const React = await import("react");
  type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

  const make = (tag: string) =>
    React.forwardRef<HTMLDivElement, AnyProps>((props, ref) =>
      React.createElement("div", { "data-pixi": tag, ref }, props.children as React.ReactNode),
    );

  return {
    Application: make("application"),
    extend: () => {},
    pixiContainer: make("container"),
    pixiGraphics: make("graphics"),
    pixiSprite: make("sprite"),
    pixiText: make("text"),
    useApplication: () => ({ app: null }),
    useTick: () => {},
  };
});

// --- localStorage mock ---------------------------------------------------
// Os contexts (TokenContext, UserContext) hidratam de localStorage no mount.
// Cada teste começa com um localStorage limpo e populado pelo helper render().
// Reset entre testes garante isolamento.

class LocalStorageMock implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(key) ?? null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, value); }
}

beforeEach(() => {
  const storage = new LocalStorageMock();
  Object.defineProperty(window, "localStorage", {
    value: storage,
    writable: true,
    configurable: true,
  });
});
