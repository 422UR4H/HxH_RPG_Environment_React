import { describe, it, expect } from "vitest";
import { createEditorStore } from "../editorStore";
import { mapFixture } from "../../../../test/fixtures/map";

describe("editorStore", () => {
  it("setName atualiza map.name e marca isDirty", () => {
    const store = createEditorStore(mapFixture);
    store.getState().setName("Novo Nome");
    expect(store.getState().map.name).toBe("Novo Nome");
    expect(store.getState().isDirty).toBe(true);
  });

  it("setDescription atualiza map.description e marca isDirty", () => {
    const store = createEditorStore(mapFixture);
    store.getState().setDescription("Nova desc");
    expect(store.getState().map.description).toBe("Nova desc");
    expect(store.getState().isDirty).toBe(true);
  });

  it("markClean reseta isDirty", () => {
    const store = createEditorStore(mapFixture);
    store.getState().setName("x");
    expect(store.getState().isDirty).toBe(true);
    store.getState().markClean();
    expect(store.getState().isDirty).toBe(false);
  });

  it("setBg(null) removes the background", () => {
    const store = createEditorStore({
      ...mapFixture,
      bg: { url: "https://x.com/img.webp", x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
    });
    store.getState().setBg(null);
    expect(store.getState().map.bg).toBeNull();
    expect(store.getState().isDirty).toBe(true);
  });
});
