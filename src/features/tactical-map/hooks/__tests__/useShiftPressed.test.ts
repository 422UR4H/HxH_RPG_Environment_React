import { describe, it, expect, vi } from "vitest";
import { renderHook, fireEvent } from "@testing-library/react";
import { useShiftPressed } from "../useShiftPressed";

describe("useShiftPressed", () => {
  it("starts false", () => {
    const { result } = renderHook(() => useShiftPressed());
    expect(result.current).toBe(false);
  });

  it("goes true while Shift is held and back to false when released", () => {
    const { result } = renderHook(() => useShiftPressed());
    fireEvent.keyDown(window, { key: "Shift" });
    expect(result.current).toBe(true);
    fireEvent.keyUp(window, { key: "Shift" });
    expect(result.current).toBe(false);
  });

  it("ignores other keys", () => {
    const { result } = renderHook(() => useShiftPressed());
    fireEvent.keyDown(window, { key: "Control" });
    expect(result.current).toBe(false);
    fireEvent.keyDown(window, { key: "Shift" });
    fireEvent.keyUp(window, { key: "Control" });
    expect(result.current).toBe(true);
  });

  it("removes the exact keydown/keyup listeners it added on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useShiftPressed());

    // Capture the exact handler references. An `expect.any(Function)` match on
    // removeEventListener would still pass for a handler re-created inside the
    // cleanup, which never actually unregisters the original listener.
    const downHandler = addSpy.mock.calls.find(([type]) => type === "keydown")?.[1];
    const upHandler = addSpy.mock.calls.find(([type]) => type === "keyup")?.[1];
    expect(downHandler).toBeDefined();
    expect(upHandler).toBeDefined();

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("keydown", downHandler);
    expect(removeSpy).toHaveBeenCalledWith("keyup", upHandler);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
