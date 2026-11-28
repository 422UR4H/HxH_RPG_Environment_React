import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMatchLayout, queueIsSplit, type MatchLayout } from "../useMatchLayout";

const original = window.matchMedia;

function mockScreen({ width, height, landscape = false }: { width: number; height: number; landscape?: boolean }) {
  window.matchMedia = ((query: string) => {
    const minW = /min-width:\s*(\d+)px/.exec(query);
    const minH = /min-height:\s*(\d+)px/.exec(query);
    const maxH = /max-height:\s*(\d+)px/.exec(query);
    let matches: boolean;
    if (query.includes("orientation: landscape")) {
      matches = landscape && (!maxH || height <= Number(maxH[1]));
    } else if (minW) {
      matches = width >= Number(minW[1]);
    } else if (minH) {
      matches = height >= Number(minH[1]);
    } else {
      matches = false;
    }
    return {
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    };
  }) as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = original;
});

describe("useMatchLayout", () => {
  it("treats the jsdom default as a portrait phone", () => {
    const { result } = renderHook(() => useMatchLayout());
    expect(result.current).toEqual({
      phonePortrait: true,
      landscape: false,
      landscapeSplit: false,
      wide: false,
      asideIsDrawer: true,
      sheetReplacesColumn: false,
    });
  });

  it("reports a landscape phone tall enough to split", () => {
    mockScreen({ width: 844, height: 390, landscape: true });
    const { result } = renderHook(() => useMatchLayout());
    expect(result.current).toEqual({
      phonePortrait: false,
      landscape: true,
      landscapeSplit: true,
      wide: false,
      asideIsDrawer: false,
      sheetReplacesColumn: true,
    });
  });

  it("reports a short landscape phone that cannot split", () => {
    mockScreen({ width: 844, height: 330, landscape: true });
    const { result } = renderHook(() => useMatchLayout());
    expect(result.current.landscape).toBe(true);
    expect(result.current.landscapeSplit).toBe(false);
  });

  it("reports a portrait tablet as neither phone nor wide", () => {
    mockScreen({ width: 768, height: 1024 });
    const { result } = renderHook(() => useMatchLayout());
    expect(result.current).toEqual({
      phonePortrait: false,
      landscape: false,
      landscapeSplit: false,
      wide: false,
      asideIsDrawer: false,
      sheetReplacesColumn: true,
    });
  });

  it("reports widescreen from 1600 px", () => {
    mockScreen({ width: 1600, height: 900 });
    const { result } = renderHook(() => useMatchLayout());
    expect(result.current.wide).toBe(true);
  });

  it("never reports widescreen in landscape-phone mode", () => {
    mockScreen({ width: 1700, height: 500, landscape: true });
    const { result } = renderHook(() => useMatchLayout());
    expect(result.current.wide).toBe(false);
    expect(result.current.landscape).toBe(true);
  });

  describe("sheetReplacesColumn", () => {
    it("is true on a landscape phone, short or tall", () => {
      mockScreen({ width: 844, height: 330, landscape: true });
      expect(renderHook(() => useMatchLayout()).result.current.sheetReplacesColumn).toBe(true);
      mockScreen({ width: 844, height: 390, landscape: true });
      expect(renderHook(() => useMatchLayout()).result.current.sheetReplacesColumn).toBe(true);
    });

    it("is true between 768 and 1279 px", () => {
      mockScreen({ width: 768, height: 1024 });
      expect(renderHook(() => useMatchLayout()).result.current.sheetReplacesColumn).toBe(true);
      mockScreen({ width: 1279, height: 800 });
      expect(renderHook(() => useMatchLayout()).result.current.sheetReplacesColumn).toBe(true);
    });

    it("is false on a portrait phone", () => {
      mockScreen({ width: 390, height: 800 });
      expect(renderHook(() => useMatchLayout()).result.current.sheetReplacesColumn).toBe(false);
    });

    it("is false from 1280 px outside the landscape phone", () => {
      mockScreen({ width: 1280, height: 800 });
      expect(renderHook(() => useMatchLayout()).result.current.sheetReplacesColumn).toBe(false);
      mockScreen({ width: 1700, height: 900 });
      expect(renderHook(() => useMatchLayout()).result.current.sheetReplacesColumn).toBe(false);
    });

    it("stays true on a low window wider than 1280 px (the landscape phone wins)", () => {
      mockScreen({ width: 1700, height: 500, landscape: true });
      expect(renderHook(() => useMatchLayout()).result.current.sheetReplacesColumn).toBe(true);
    });
  });
});

describe("queueIsSplit", () => {
  const layout = (over: Partial<MatchLayout>): MatchLayout => ({
    phonePortrait: false,
    landscape: false,
    landscapeSplit: false,
    wide: false,
    asideIsDrawer: false,
    sheetReplacesColumn: false,
    ...over,
  });

  it("is false on a portrait phone", () => {
    expect(queueIsSplit(layout({ phonePortrait: true, asideIsDrawer: true }))).toBe(false);
  });

  it("is false on a short landscape phone", () => {
    expect(queueIsSplit(layout({ landscape: true }))).toBe(false);
  });

  it("is true on a tall landscape phone", () => {
    expect(queueIsSplit(layout({ landscape: true, landscapeSplit: true }))).toBe(true);
  });

  it("is true on tablet, desktop and widescreen", () => {
    expect(queueIsSplit(layout({}))).toBe(true);
    expect(queueIsSplit(layout({ wide: true }))).toBe(true);
  });
});
