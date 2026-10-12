import { describe, it, expect } from "vitest";
import { tableMap } from "../tableMap";
import type { GridShape, TacticalMap } from "../../../../types/tacticalMap";

const grid = (cellSize: number) => ({ kind: "square", cols: 5, rows: 5, cellSize } as unknown as GridShape);
const bg = { url: "u", x: 0, y: 0, width: 1, height: 1, rotation: 0, opacity: 1 };
const rest = { id: "m", grid: grid(40), bg: null } as unknown as TacticalMap;

describe("tableMap", () => {
  it("keeps undefined / the REST map when nothing arrived", () => {
    expect(tableMap(undefined, grid(1), bg)).toBeUndefined();
    expect(tableMap(rest, undefined, undefined)).toBe(rest);
  });
  it("prefers the board grid and bg", () => {
    const m = tableMap(rest, grid(64), bg)!;
    expect(m.grid).toEqual(grid(64));
    expect(m.bg).toEqual(bg);
  });
  it("board bg null means no background, overriding REST", () => {
    const withBg = { ...rest, bg } as TacticalMap;
    expect(tableMap(withBg, grid(64), null)!.bg).toBeNull();
  });
  it("falls back to REST grid/bg per field", () => {
    const withBg = { ...rest, bg } as TacticalMap;
    const m = tableMap(withBg, undefined, null)!;
    expect(m.grid).toEqual(grid(40));
    const m2 = tableMap(withBg, grid(64), undefined)!;
    expect(m2.bg).toEqual(bg);
  });
});
