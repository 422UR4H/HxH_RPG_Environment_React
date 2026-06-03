import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createEditorStore } from "../../store/editorStore";
import { useEditorHistory } from "../useEditorHistory";
import { mapFixture } from "../../../../test/fixtures/map";

describe("useEditorHistory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("canUndo é false quando não há histórico", () => {
    const store = createEditorStore(mapFixture);
    const { result } = renderHook(() => useEditorHistory(store));
    expect(result.current.canUndo).toBe(false);
  });

  it("canUndo é true após uma mudança + debounce", () => {
    const store = createEditorStore(mapFixture);
    const { result } = renderHook(() => useEditorHistory(store));
    act(() => {
      store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
      vi.advanceTimersByTime(400);
    });
    expect(result.current.canUndo).toBe(true);
  });

  it("undo restaura estado e marca isDirty", () => {
    const store = createEditorStore(mapFixture);
    const { result } = renderHook(() => useEditorHistory(store));
    act(() => {
      store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
      vi.advanceTimersByTime(400);
    });
    act(() => {
      result.current.undo();
    });
    expect(store.getState().map.grid.cols).toBe(mapFixture.grid.cols);
    expect(store.getState().isDirty).toBe(true);
  });

  it("canRedo é true após undo", () => {
    const store = createEditorStore(mapFixture);
    const { result } = renderHook(() => useEditorHistory(store));
    act(() => {
      store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
      vi.advanceTimersByTime(400);
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
  });

  it("redo reaplicar e marca isDirty", () => {
    const store = createEditorStore(mapFixture);
    const { result } = renderHook(() => useEditorHistory(store));
    act(() => {
      store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
      vi.advanceTimersByTime(400);
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });
    expect(store.getState().map.grid.cols).toBe(10);
    expect(store.getState().isDirty).toBe(true);
  });
});
