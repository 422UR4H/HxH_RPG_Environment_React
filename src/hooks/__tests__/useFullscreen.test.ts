import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFullscreen, exitFullscreen } from "../useFullscreen";

const originalMatchMedia = window.matchMedia;

function setDoc(prop: string, value: unknown) {
  Object.defineProperty(document, prop, { configurable: true, writable: true, value });
}

function setup({ enabled = true as boolean | null, element = null as Element | null, displayModeFullscreen = false } = {}) {
  setDoc("fullscreenEnabled", enabled ?? undefined);
  setDoc("fullscreenElement", element);
  const request = vi.fn().mockResolvedValue(undefined);
  const exit = vi.fn().mockResolvedValue(undefined);
  setDoc("exitFullscreen", exit);
  Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, writable: true, value: request });
  window.matchMedia = ((query: string) => ({
    matches: displayModeFullscreen && query === "(display-mode: fullscreen)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return { request, exit };
}

afterEach(() => {
  for (const prop of ["fullscreenEnabled", "fullscreenElement", "exitFullscreen"]) {
    delete (document as unknown as Record<string, unknown>)[prop];
  }
  delete (document.documentElement as unknown as Record<string, unknown>).requestFullscreen;
  window.matchMedia = originalMatchMedia;
});

describe("useFullscreen", () => {
  it("is unavailable when fullscreenEnabled is false or undefined", () => {
    setup({ enabled: false });
    expect(renderHook(() => useFullscreen()).result.current.available).toBe(false);
    setup({ enabled: null });
    expect(renderHook(() => useFullscreen()).result.current.available).toBe(false);
  });

  it("is available when fullscreenEnabled is true", () => {
    setup();
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.available).toBe(true);
    expect(result.current.active).toBe(false);
  });

  it("is unavailable in an installed fullscreen app that is not active through the API", () => {
    setup({ displayModeFullscreen: true });
    expect(renderHook(() => useFullscreen()).result.current.available).toBe(false);
  });

  it("stays available when the API itself entered fullscreen", () => {
    setup({ displayModeFullscreen: true, element: document.documentElement });
    expect(renderHook(() => useFullscreen()).result.current.available).toBe(true);
  });

  it("toggle requests fullscreen hiding the navigation UI when inactive", () => {
    const { request, exit } = setup();
    const { result } = renderHook(() => useFullscreen());
    act(() => result.current.toggle());
    expect(request).toHaveBeenCalledWith({ navigationUI: "hide" });
    expect(exit).not.toHaveBeenCalled();
  });

  it("toggle exits fullscreen when active", () => {
    const { request, exit } = setup({ element: document.documentElement });
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.active).toBe(true);
    act(() => result.current.toggle());
    expect(exit).toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it("updates active after a fullscreenchange event", () => {
    setup();
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.active).toBe(false);
    act(() => {
      setDoc("fullscreenElement", document.documentElement);
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    expect(result.current.active).toBe(true);
  });

  it("swallows a rejected requestFullscreen", async () => {
    const { request } = setup();
    request.mockRejectedValue(new TypeError("denied"));
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    const { result } = renderHook(() => useFullscreen());
    expect(() => act(() => result.current.toggle())).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});

describe("exitFullscreen", () => {
  it("does nothing when nothing is fullscreen", () => {
    const { exit } = setup();
    exitFullscreen();
    expect(exit).not.toHaveBeenCalled();
  });

  it("exits when something is fullscreen and swallows rejection", async () => {
    const { exit } = setup({ element: document.documentElement });
    exit.mockRejectedValue(new Error("x"));
    exitFullscreen();
    expect(exit).toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
  });
});
