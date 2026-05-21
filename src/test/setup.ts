import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { server } from "./server";

// --- MSW lifecycle -------------------------------------------------------
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

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
