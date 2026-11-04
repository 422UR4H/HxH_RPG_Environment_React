import { describe, it, expect } from "vitest";
import type { GridShape } from "../../../../types/tacticalMap";
import { cellPitch, focusFrame, FOCUS_CELLS } from "../focusFrame";

const view = { width: 576, height: 1000 };
const square = { x: 64, y: 64 };
// Mapa grande: o enquadramento do mapa inteiro fica bem mais afastado que o foco.
const bigMap = { scale: 0.3, center: { x: 2000, y: 2000 } };

function grid(kind: GridShape["kind"]): GridShape {
  return {
    kind, cols: 10, rows: 10, cellSize: 64, rotation: 0, skewRatio: 1,
    color: "grid", opacity: 1, lineStyle: "solid",
  };
}

describe("cellPitch", () => {
  it("is cellSize on both axes for a square grid", () => {
    expect(cellPitch(grid("square"))).toEqual({ x: 64, y: 64 });
  });

  it("is √3·cellSize across and 1.5·cellSize down for a pointy-top hex grid", () => {
    const p = cellPitch(grid("hex"));
    expect(p.x).toBeCloseTo(64 * Math.sqrt(3), 9);
    expect(p.y).toBe(96);
  });
});

describe("focusFrame", () => {
  it("centers on a single piece", () => {
    const { center } = focusFrame([{ x: 300, y: 500 }], square, view, bigMap);
    expect(center).toEqual({ x: 300, y: 500 });
  });

  it("fits about 9 cells across the shorter side", () => {
    expect(FOCUS_CELLS).toBe(9);
    const { scale } = focusFrame([{ x: 300, y: 500 }], square, view, bigMap);
    expect(scale).toBe(1);
  });

  it("fits 9 hex cells using the hex pitch, not cellSize", () => {
    const pitch = cellPitch(grid("hex"));
    const { scale } = focusFrame([{ x: 300, y: 500 }], pitch, view, bigMap);
    // Largura: 9 hexes de √3·64 ≈ 997.7 px no lado de 576 → ~0.577 (com cellSize seriam ~1).
    expect(scale).toBeCloseTo(576 / (FOCUS_CELLS * 64 * Math.sqrt(3)), 5);
  });

  it("never zooms out past the whole-map fit, and then centers on the map", () => {
    const { scale, center } = focusFrame(
      [{ x: 300, y: 500 }],
      square,
      view,
      { scale: 1.2, center: { x: 100, y: 150 } },
    );
    expect(scale).toBe(1.2);
    expect(center).toEqual({ x: 100, y: 150 });
  });

  it("frames the bounding box of several pieces, padded by one cell on each side", () => {
    const { center, scale } = focusFrame(
      [{ x: 0, y: 0 }, { x: 20 * 64, y: 0 }],
      square,
      view,
      { scale: 0.25, center: { x: 5000, y: 5000 } },
    );
    expect(center).toEqual({ x: 10 * 64, y: 0 });
    expect(scale).toBeCloseTo(576 / (22 * 64), 5);
  });

  it("clamps to 1.75", () => {
    const { scale } = focusFrame([{ x: 0, y: 0 }], square, { width: 2000, height: 2000 }, bigMap);
    expect(scale).toBe(1.75);
  });
});
