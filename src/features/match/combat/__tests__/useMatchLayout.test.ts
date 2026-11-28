import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMatchLayout, queueIsSplit, type MatchLayout } from "../useMatchLayout";
import { mockScreen, type TestScreen } from "../../../../test/mockScreen";

const original = window.matchMedia;

afterEach(() => {
  window.matchMedia = original;
});

function layoutAt(s: TestScreen): MatchLayout {
  mockScreen(s);
  return renderHook(() => useMatchLayout()).result.current;
}

describe("useMatchLayout", () => {
  it("treats the jsdom default as a portrait phone", () => {
    const { result } = renderHook(() => useMatchLayout());
    expect(result.current).toEqual({
      stacked: true,
      landscape: false,
      landscapeSplit: false,
      wide: false,
      asideIsDrawer: true,
      sheetReplacesColumn: false,
    });
  });

  it("stacks a portrait phone with the Histórico as a drawer", () => {
    expect(layoutAt({ width: 390, height: 844 })).toEqual({
      stacked: true,
      landscape: false,
      landscapeSplit: false,
      wide: false,
      asideIsDrawer: true,
      sheetReplacesColumn: false,
    });
  });

  it("stacks a portrait tablet with the Histórico as a column", () => {
    const layout = layoutAt({ width: 753, height: 1205 });
    expect(layout.stacked).toBe(true);
    expect(layout.asideIsDrawer).toBe(false);
    expect(layout.sheetReplacesColumn).toBe(false);
    expect(queueIsSplit(layout)).toBe(false);
  });

  it("stacks every portrait screen up to 1279 px", () => {
    for (const s of [{ width: 600, height: 960 }, { width: 768, height: 1024 }, { width: 1024, height: 1366 }]) {
      const layout = layoutAt(s);
      expect(layout.stacked).toBe(true);
      expect(layout.asideIsDrawer).toBe(false);
    }
    expect(layoutAt({ width: 599, height: 960 }).asideIsDrawer).toBe(true);
  });

  it("uses side columns on a landscape tablet, with the split queue and the sheet in place of the column", () => {
    const layout = layoutAt({ width: 1024, height: 768 });
    expect(layout.stacked).toBe(false);
    expect(layout.landscape).toBe(false);
    expect(layout.asideIsDrawer).toBe(false);
    expect(queueIsSplit(layout)).toBe(true);
    expect(layout.sheetReplacesColumn).toBe(true);
  });

  it("uses side columns from 1280 px without the sheet in place of the column", () => {
    const layout = layoutAt({ width: 1400, height: 900 });
    expect(layout.stacked).toBe(false);
    expect(queueIsSplit(layout)).toBe(true);
    expect(layout.sheetReplacesColumn).toBe(false);
  });

  it("uses side columns on a low desktop window below 1024 px", () => {
    const layout = layoutAt({ width: 900, height: 700 });
    expect(layout.stacked).toBe(false);
    expect(layout.landscape).toBe(false);
    expect(layout.sheetReplacesColumn).toBe(true);
  });

  it("reports a landscape phone tall enough to split", () => {
    expect(layoutAt({ width: 844, height: 390 })).toEqual({
      stacked: false,
      landscape: true,
      landscapeSplit: true,
      wide: false,
      asideIsDrawer: false,
      sheetReplacesColumn: true,
    });
  });

  it("reports a short landscape phone that cannot split", () => {
    const layout = layoutAt({ width: 907, height: 303 });
    expect(layout.landscape).toBe(true);
    expect(layout.landscapeSplit).toBe(false);
    expect(queueIsSplit(layout)).toBe(false);
    expect(layout.sheetReplacesColumn).toBe(true);
  });

  it("reports widescreen from 1600 px", () => {
    expect(layoutAt({ width: 1600, height: 900 }).wide).toBe(true);
  });

  it("never reports widescreen in landscape-phone mode, and keeps the sheet in place of the column there", () => {
    const layout = layoutAt({ width: 1700, height: 500 });
    expect(layout.wide).toBe(false);
    expect(layout.landscape).toBe(true);
    expect(layout.sheetReplacesColumn).toBe(true);
  });
});

describe("queueIsSplit", () => {
  const layout = (over: Partial<MatchLayout>): MatchLayout => ({
    stacked: false,
    landscape: false,
    landscapeSplit: false,
    wide: false,
    asideIsDrawer: false,
    sheetReplacesColumn: false,
    ...over,
  });

  it("is false when stacked", () => {
    expect(queueIsSplit(layout({ stacked: true, asideIsDrawer: true }))).toBe(false);
    expect(queueIsSplit(layout({ stacked: true }))).toBe(false);
  });

  it("is false on a short landscape phone", () => {
    expect(queueIsSplit(layout({ landscape: true }))).toBe(false);
  });

  it("is true on a tall landscape phone", () => {
    expect(queueIsSplit(layout({ landscape: true, landscapeSplit: true }))).toBe(true);
  });

  it("is true with side columns on tablet, desktop and widescreen", () => {
    expect(queueIsSplit(layout({}))).toBe(true);
    expect(queueIsSplit(layout({ wide: true }))).toBe(true);
  });
});
