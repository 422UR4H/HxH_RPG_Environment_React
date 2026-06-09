import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditorHistory } from "../useEditorHistory";
import { createEditorStore } from "../../store/editorStore";
import { mapFixture } from "../../../../test/fixtures/map";

const bg = { url: "blob:x", x: 0, y: 0, width: 800, height: 600, rotation: 0, opacity: 1 };

describe("useEditorHistory — gesture-scoped history", () => {
  it("one continuous drag = exactly one undo step (and redo reapplies)", () => {
    const store = createEditorStore({ ...mapFixture, bg });
    const { result } = renderHook(() => useEditorHistory(store));
    expect(store.temporal.getState().pastStates).toHaveLength(0);

    act(() => result.current.beginGesture());
    // simulate several pointermove writes during the drag — paused, not recorded
    act(() => store.getState().setBg({ ...bg, x: 50, y: 10 }));
    act(() => store.getState().setBg({ ...bg, x: 120, y: 40 }));
    expect(store.temporal.getState().pastStates).toHaveLength(0);
    act(() => result.current.endGesture());

    // exactly one step for the whole gesture
    expect(store.temporal.getState().pastStates).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);
    expect(store.getState().map.bg).toMatchObject({ x: 120, y: 40 });

    act(() => result.current.undo());
    expect(store.getState().map.bg).toMatchObject({ x: 0, y: 0 }); // pre-drag, in one undo

    act(() => result.current.redo());
    expect(store.getState().map.bg).toMatchObject({ x: 120, y: 40 });
  });

  it("a gesture with no net change adds no undo step and resumes tracking", () => {
    const store = createEditorStore({ ...mapFixture, bg });
    const { result } = renderHook(() => useEditorHistory(store));

    act(() => result.current.beginGesture());
    act(() => result.current.endGesture());

    expect(store.temporal.getState().pastStates).toHaveLength(0);
    expect(store.temporal.getState().isTracking).toBe(true);
  });
});
