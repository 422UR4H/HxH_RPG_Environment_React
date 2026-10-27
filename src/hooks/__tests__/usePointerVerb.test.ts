import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import usePointerVerb from "../usePointerVerb";

const original = window.matchMedia;

/** matchMedia falso com `pointer: fine` controlável; guarda o listener para disparar o `change`. */
function mockPointer(fine: boolean) {
  let listener: ((e: MediaQueryListEvent) => void) | undefined;
  window.matchMedia = vi.fn((query: string) => ({
    matches: query === "(pointer: fine)" ? fine : false,
    media: query,
    addEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => { listener = l; },
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  return (matches: boolean) => listener?.({ matches } as MediaQueryListEvent);
}

afterEach(() => {
  window.matchMedia = original;
});

describe("usePointerVerb", () => {
  it("returns Clique for a fine pointer", () => {
    mockPointer(true);
    const { result } = renderHook(() => usePointerVerb());
    expect(result.current).toBe("Clique");
  });

  it("returns Toque otherwise", () => {
    mockPointer(false);
    const { result } = renderHook(() => usePointerVerb());
    expect(result.current).toBe("Toque");
  });

  it("updates when the pointer changes", () => {
    const fire = mockPointer(false);
    const { result } = renderHook(() => usePointerVerb());
    expect(result.current).toBe("Toque");
    act(() => fire(true));
    expect(result.current).toBe("Clique");
  });
});
