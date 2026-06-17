import { describe, it, expect } from "vitest";
import { cellKey, parseExploredDelta, mergeExplored, cellCornersLocal } from "../fog";
import type { GridShape } from "../../../../types/tacticalMap";

const squareGrid: GridShape = {
  kind: "square", cols: 10, rows: 10, cellSize: 64,
  skewRatio: 1, rotation: 0, color: "#fff", opacity: 0.5, lineStyle: "solid",
};

describe("fog utils", () => {
  it("cellKey is stable and parseable", () => {
    expect(cellKey(2, -3)).toBe("2,-3");
  });

  it("parseExploredDelta maps [[a,b]] to keys", () => {
    expect(parseExploredDelta([[1, 2], [3, 4]])).toEqual(["1,2", "3,4"]);
  });

  it("mergeExplored unions delta into a set without mutating input", () => {
    const base = new Set<string>(["0,0"]);
    const merged = mergeExplored(base, [[0, 0], [1, 0]]);
    expect(merged.has("0,0")).toBe(true);
    expect(merged.has("1,0")).toBe(true);
    expect(merged.size).toBe(2);
    expect(base.size).toBe(1); // original untouched
  });

  it("cellCornersLocal returns 4 corners for a square cell", () => {
    const corners = cellCornersLocal(1, 1, squareGrid);
    expect(corners).toHaveLength(4);
    // Cell (1,1) spans local x in [64,128], y in [64,128].
    expect(corners[0]).toEqual([64, 64]);
    expect(corners[2]).toEqual([128, 128]);
  });

  it("cellCornersLocal returns 6 corners for a hex cell", () => {
    const hexGrid: GridShape = { ...squareGrid, kind: "hex" };
    const corners = cellCornersLocal(0, 0, hexGrid);
    expect(corners).toHaveLength(6);
  });
});
