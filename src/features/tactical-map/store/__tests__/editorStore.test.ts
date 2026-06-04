import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

  it("setBgWithGrid atualiza bg e grid juntos", () => {
    const store = createEditorStore(mapFixture);
    const bg = { url: "blob:x", x: 0, y: 0, width: 800, height: 600, rotation: 0, opacity: 1 };
    const grid = { ...mapFixture.grid, cols: 20, cellSize: 40 };
    store.getState().setBgWithGrid(bg, grid);
    expect(store.getState().map.bg).toEqual(bg);
    expect(store.getState().map.grid.cols).toBe(20);
    expect(store.getState().map.grid.cellSize).toBe(40);
    expect(store.getState().isDirty).toBe(true);
  });
});

describe("editorStore — histórico zundo", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("setGrid cria um passo no histórico após debounce", () => {
    const store = createEditorStore(mapFixture);
    store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
    expect(store.temporal.getState().pastStates).toHaveLength(0); // ainda não disparou
    vi.advanceTimersByTime(400);
    expect(store.temporal.getState().pastStates).toHaveLength(1);
  });

  it("setActiveTool NÃO cria passo no histórico (fora do partialize)", () => {
    const store = createEditorStore(mapFixture);
    store.getState().setActiveTool("bg");
    vi.advanceTimersByTime(400);
    expect(store.temporal.getState().pastStates).toHaveLength(0);
  });

  it("undo restaura map.grid ao estado anterior", () => {
    const store = createEditorStore(mapFixture);
    const originalCols = mapFixture.grid.cols;
    store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
    vi.advanceTimersByTime(400);
    store.temporal.getState().undo();
    expect(store.getState().map.grid.cols).toBe(originalCols);
  });

  it("redo reaplicar mudança desfeita", () => {
    const store = createEditorStore(mapFixture);
    store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
    vi.advanceTimersByTime(400);
    store.temporal.getState().undo();
    store.temporal.getState().redo();
    expect(store.getState().map.grid.cols).toBe(10);
  });

  it("setBgWithGrid cria UM único passo de histórico (add atômico)", () => {
    const store = createEditorStore(mapFixture);
    const bg = { url: "blob:x", x: 0, y: 0, width: 800, height: 600, rotation: 0, opacity: 1 };
    const grid = { ...mapFixture.grid, cols: 20, cellSize: 40 };
    store.getState().setBgWithGrid(bg, grid);
    vi.advanceTimersByTime(400);
    expect(store.temporal.getState().pastStates).toHaveLength(1);
  });

  it("undo de setBgWithGrid restaura bg e grid originais juntos", () => {
    const store = createEditorStore(mapFixture);
    const bg = { url: "blob:x", x: 0, y: 0, width: 800, height: 600, rotation: 0, opacity: 1 };
    const grid = { ...mapFixture.grid, cols: 20, cellSize: 40 };
    store.getState().setBgWithGrid(bg, grid);
    vi.advanceTimersByTime(400);
    store.temporal.getState().undo();
    expect(store.getState().map.bg).toBeNull();
    expect(store.getState().map.grid.cols).toBe(mapFixture.grid.cols);
    expect(store.getState().map.grid.cellSize).toBe(mapFixture.grid.cellSize);
  });

  it("markDirty marca isDirty como true", () => {
    const store = createEditorStore(mapFixture);
    store.getState().markClean();
    expect(store.getState().isDirty).toBe(false);
    store.getState().markDirty();
    expect(store.getState().isDirty).toBe(true);
  });
});
