import { describe, it, expect } from "vitest";
import { createEditorStore } from "../editorStore";
import type { TacticalMap } from "../../../../types/tacticalMap";

const emptyMap = (): TacticalMap => ({
  id: "map-1",
  campaignId: "camp-1",
  name: "Test",
  grid: {
    kind: "square", cols: 5, rows: 5, cellSize: 40,
    skewRatio: 1, rotation: 0,
    color: "#000", opacity: 1, lineStyle: "solid",
  },
  bg: null,
  pieces: [],
  walls: [],
  decorations: [],
  items: [],
  createdAt: "2026-05-31T00:00:00Z",
  updatedAt: "2026-05-31T00:00:00Z",
});

describe("editorStore", () => {
  it("can be instantiated with an initial map and reports isDirty=false", () => {
    const store = createEditorStore(emptyMap());
    const s = store.getState();
    expect(s.map.id).toBe("map-1");
    expect(s.isDirty).toBe(false);
    expect(s.activeTool).toBe("grid");
    expect(s.selection).toBeNull();
  });

  it("setGrid mutates map.grid and marks isDirty=true", () => {
    const store = createEditorStore(emptyMap());
    store.getState().setGrid({
      ...store.getState().map.grid,
      cols: 20,
      rows: 20,
    });
    expect(store.getState().map.grid.cols).toBe(20);
    expect(store.getState().isDirty).toBe(true);
  });

  it("zundo middleware exposes undo() and reverts the last change", () => {
    const store = createEditorStore(emptyMap());
    store.getState().setActiveTool("pieces");
    expect(store.getState().activeTool).toBe("pieces");

    // zundo temporal API: store.temporal.getState().undo()
    store.temporal.getState().undo();
    expect(store.getState().activeTool).toBe("grid");
  });
});
