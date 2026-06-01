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
});
