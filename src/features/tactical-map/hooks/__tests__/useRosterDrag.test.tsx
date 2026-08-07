import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRosterDrag } from "../useRosterDrag";
import { pendingSheetFixture } from "../../../../test/fixtures/sheet";
import type { CharacterPrivateSummary } from "../../../../types/characterSheet";

const npc: CharacterPrivateSummary = { ...pendingSheetFixture, uuid: "npc-1" };

describe("useRosterDrag", () => {
  it("initial state: nothing active", () => {
    const { result } = renderHook(() => useRosterDrag({ enableRosterDrop: true }));
    expect(result.current.placingNpcId).toBeNull();
    expect(result.current.placingNpcData).toBeNull();
    expect(result.current.isDraggingPieceToRoster).toBe(false);
    expect(result.current.draggingCanvasPieceNpc).toBeNull();
  });

  it("startPlacing(npc) sets placingNpcId and placingNpcData", () => {
    const { result } = renderHook(() => useRosterDrag({ enableRosterDrop: true }));
    act(() => result.current.startPlacing(npc));
    expect(result.current.placingNpcId).toBe(npc.uuid);
    expect(result.current.placingNpcData).toBe(npc);
  });

  it("cancelPlacing() resets placing state to null", () => {
    const { result } = renderHook(() => useRosterDrag({ enableRosterDrop: true }));
    act(() => result.current.startPlacing(npc));
    act(() => result.current.cancelPlacing());
    expect(result.current.placingNpcId).toBeNull();
    expect(result.current.placingNpcData).toBeNull();
  });

  it("startCanvasDrag(npc) sets draggingCanvasPieceNpc and marks roster as drop target", () => {
    const { result } = renderHook(() => useRosterDrag({ enableRosterDrop: true }));
    act(() => result.current.startCanvasDrag(npc));
    expect(result.current.draggingCanvasPieceNpc).toBe(npc);
    expect(result.current.isDraggingPieceToRoster).toBe(true);
  });

  it("startCanvasDrag(undefined) still flags the sidebar as a drop target even without NPC data", () => {
    const { result } = renderHook(() => useRosterDrag({ enableRosterDrop: true }));
    act(() => result.current.startCanvasDrag(undefined));
    expect(result.current.draggingCanvasPieceNpc).toBeNull();
    expect(result.current.isDraggingPieceToRoster).toBe(true);
  });

  it("endCanvasDrag() resets both canvas-drag fields", () => {
    const { result } = renderHook(() => useRosterDrag({ enableRosterDrop: true }));
    act(() => result.current.startCanvasDrag(npc));
    act(() => result.current.endCanvasDrag());
    expect(result.current.draggingCanvasPieceNpc).toBeNull();
    expect(result.current.isDraggingPieceToRoster).toBe(false);
  });

  it("enableRosterDrop: false (player mode) keeps isDraggingPieceToRoster false during a canvas drag", () => {
    const { result } = renderHook(() => useRosterDrag({ enableRosterDrop: false }));
    act(() => result.current.startCanvasDrag(npc));
    expect(result.current.draggingCanvasPieceNpc).toBe(npc);
    expect(result.current.isDraggingPieceToRoster).toBe(false);
  });

  it("removes the exact pointermove listener it added on unmount (regression guard for the Fase 1 A2 leak)", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { result, unmount } = renderHook(() => useRosterDrag({ enableRosterDrop: true }));
    act(() => result.current.startPlacing(npc));

    // Capture the exact handler reference passed to addEventListener — an
    // `expect.any(Function)` match on removeEventListener alone would still
    // pass for the Fase 1 A2 bug (an anonymous handler recreated on cleanup
    // that never actually unregisters the original listener).
    const addedCall = addSpy.mock.calls.find(([type]) => type === "pointermove");
    expect(addedCall).toBeDefined();
    const addedHandler = addedCall?.[1];

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("pointermove", addedHandler);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
