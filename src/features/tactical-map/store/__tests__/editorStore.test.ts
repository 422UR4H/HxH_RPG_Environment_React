import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEditorStore } from "../editorStore";
import { mapFixture, pieceFixture } from "../../../../test/fixtures/map";
import type { Piece, WallSegment } from "../../../../types/tacticalMap";

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

// ─── Piece action tests ─────────────────────────────────────────────────────

describe("editorStore — piece actions", () => {
  it("removePiece limpa a seleção quando a peça removida é a selecionada", () => {
    const store = createEditorStore({ ...mapFixture, pieces: [pieceFixture] });
    store.getState().setSelection({ kind: "piece", id: pieceFixture.id });
    store.getState().removePiece(pieceFixture.id);
    expect(store.getState().map.pieces).toHaveLength(0);
    expect(store.getState().selection).toBeNull();
  });

  it("removePiece não mexe na seleção quando remove outra peça", () => {
    const other: Piece = { ...pieceFixture, id: "piece-2" };
    const store = createEditorStore({ ...mapFixture, pieces: [pieceFixture, other] });
    store.getState().setSelection({ kind: "piece", id: pieceFixture.id });
    store.getState().removePiece(other.id);
    expect(store.getState().map.pieces).toHaveLength(1);
    expect(store.getState().selection).toEqual({ kind: "piece", id: pieceFixture.id });
  });
});

// ─── Wall action tests ──────────────────────────────────────────────────────

const mockWall = (): WallSegment => ({
  id: "w1", p1: [0, 0], p2: [64, 0],
  wallType: "wall", material: "stone",
  move: true, sense: "full", direction: "both",
  open: false, locked: false, hp: 100, maxHp: 100, resistance: 5, destroyed: false,
});

describe("editorStore — wall actions", () => {
  it("mergeWalls appends and marks dirty", () => {
    const store = createEditorStore(mapFixture);
    store.getState().mergeWalls([mockWall()]);
    expect(store.getState().map.walls).toHaveLength(1);
    expect(store.getState().map.walls[0].id).toBe("w1");
    expect(store.getState().isDirty).toBe(true);
  });

  it("updateWallSegment patches by id", () => {
    const store = createEditorStore(mapFixture);
    store.getState().mergeWalls([mockWall()]);
    store.getState().updateWallSegment("w1", { locked: true, hp: 50 });
    const w = store.getState().map.walls[0];
    expect(w.locked).toBe(true);
    expect(w.hp).toBe(50);
  });

  it("removeWallSegment removes by id", () => {
    const store = createEditorStore(mapFixture);
    store.getState().mergeWalls([mockWall()]);
    store.getState().removeWallSegment("w1");
    expect(store.getState().map.walls).toHaveLength(0);
    expect(store.getState().isDirty).toBe(true);
  });

  it("setSelection supports kind=wall", () => {
    const store = createEditorStore(mapFixture);
    store.getState().setSelection({ kind: "wall", id: "w1" });
    expect(store.getState().selection).toEqual({ kind: "wall", id: "w1" });
  });

  it("removeWallSegment limpa a seleção quando a parede removida é a selecionada", () => {
    const store = createEditorStore(mapFixture);
    store.getState().mergeWalls([mockWall()]);
    store.getState().setSelection({ kind: "wall", id: "w1" });
    store.getState().removeWallSegment("w1");
    expect(store.getState().selection).toBeNull();
  });

  it("removeWallSegment não mexe na seleção quando remove outra parede", () => {
    const store = createEditorStore(mapFixture);
    const other: WallSegment = { ...mockWall(), id: "w2" };
    store.getState().mergeWalls([mockWall(), other]);
    store.getState().setSelection({ kind: "wall", id: "w1" });
    store.getState().removeWallSegment("w2");
    expect(store.getState().selection).toEqual({ kind: "wall", id: "w1" });
  });
});

// ─── Wall tool UI state (activeWallType/activeMaterial/wallsDrawMode) ──────

describe("editorStore — wall tool UI state", () => {
  it("enterWallsDrawMode seta activeWallType e entra em draw", () => {
    const store = createEditorStore(mapFixture);
    store.getState().enterWallsDrawMode("door");
    expect(store.getState().activeWallType).toBe("door");
    expect(store.getState().wallsDrawMode).toBe("draw");
  });

  it("exitWallsDrawMode volta para browse sem mexer em activeWallType", () => {
    const store = createEditorStore(mapFixture);
    store.getState().enterWallsDrawMode("door");
    store.getState().exitWallsDrawMode();
    expect(store.getState().wallsDrawMode).toBe("browse");
    expect(store.getState().activeWallType).toBe("door");
  });

  it("setActiveTool para fora de 'walls' força wallsDrawMode de volta a browse", () => {
    const store = createEditorStore(mapFixture);
    store.getState().enterWallsDrawMode("wall");
    expect(store.getState().wallsDrawMode).toBe("draw");
    store.getState().setActiveTool("grid");
    expect(store.getState().wallsDrawMode).toBe("browse");
  });

  it("setActiveTool('walls') não força draw mode", () => {
    const store = createEditorStore(mapFixture);
    expect(store.getState().wallsDrawMode).toBe("browse");
    store.getState().setActiveTool("walls");
    expect(store.getState().wallsDrawMode).toBe("browse");
  });

  it("mudanças em wall tool UI state não criam passo de undo (protege o partialize)", () => {
    vi.useFakeTimers();
    const store = createEditorStore(mapFixture);
    store.getState().enterWallsDrawMode("door");
    store.getState().setActiveMaterial("wood");
    store.getState().exitWallsDrawMode();
    vi.advanceTimersByTime(400);
    expect(store.temporal.getState().pastStates).toHaveLength(0);
    vi.useRealTimers();
  });
});
