import { describe, it, expect } from "vitest";
import { computeCoverFit, deriveGridFromImage, fitGridToImage } from "../bgFit";
import { gridLocalBounds } from "../coords";
import type { GridShape } from "../../../../types/tacticalMap";

const grid = (cols: number, rows: number, cellSize: number): GridShape => ({
  kind: "square",
  cols,
  rows,
  cellSize,
  skewRatio: 1,
  rotation: 0,
  color: "#4a90a4",
  opacity: 0.6,
  lineStyle: "solid",
});

describe("computeCoverFit", () => {
  it("scales a wider-than-grid image to cover vertically", () => {
    // Grid: 800×600. Image: 1600×900 (16:9). Scale to cover height (600):
    // scaleY = 600/900 = 0.667; scaleX = 800/1600 = 0.5. max = 0.667.
    // width = 1600*0.667 ≈ 1067, height = 900*0.667 = 600.
    // x = (800 - 1067)/2 ≈ -133, y = 0.
    const result = computeCoverFit(1600, 900, grid(20, 15, 40));
    expect(result.height).toBeCloseTo(600, 0);
    expect(result.width).toBeGreaterThan(800);
    expect(result.y).toBeCloseTo(0, 0);
    expect(result.x).toBeLessThan(0); // overflows left
    expect(result.rotation).toBe(0);
    expect(result.opacity).toBe(1);
  });

  it("scales a taller-than-grid image to cover horizontally", () => {
    // Grid: 800×600. Image: 900×1600 (portrait). scaleX=800/900=0.889; scaleY=600/1600=0.375. max=0.889.
    // width=800, height=1600*0.889≈1422. x=0, y=(600-1422)/2≈-411.
    const result = computeCoverFit(900, 1600, grid(20, 15, 40));
    expect(result.width).toBeCloseTo(800, 0);
    expect(result.height).toBeGreaterThan(600);
    expect(result.x).toBeCloseTo(0, 0);
    expect(result.y).toBeLessThan(0);
  });

  it("exact aspect ratio — no overflow, no underflow", () => {
    // Grid: 800×600. Image: 800×600. Scale=1.
    const result = computeCoverFit(800, 600, grid(20, 15, 40));
    expect(result.width).toBeCloseTo(800, 0);
    expect(result.height).toBeCloseTo(600, 0);
    expect(result.x).toBeCloseTo(0, 0);
    expect(result.y).toBeCloseTo(0, 0);
  });
});

describe("deriveGridFromImage", () => {
  it("calculates cellSize and rows from naturalWidth, cols", () => {
    // naturalWidth=800, cols=20 → cellSize=40; naturalHeight=600, rows=floor(600/40)=15.
    const result = deriveGridFromImage(800, 600, grid(20, 10, 50));
    expect(result.cellSize).toBe(40);
    expect(result.rows).toBe(15);
    expect(result.cols).toBe(20); // unchanged
    expect(result.kind).toBe("square"); // unchanged
  });

  it("floors rows when image height is not a multiple", () => {
    // naturalWidth=800, cols=20 → cellSize=40; naturalHeight=650 → rows=floor(650/40)=16.
    const result = deriveGridFromImage(800, 650, grid(20, 10, 50));
    expect(result.rows).toBe(16);
  });
});

const hexGrid = (cols: number, rows: number, cellSize: number): GridShape => ({
  kind: "hex",
  cols,
  rows,
  cellSize,
  skewRatio: 1,
  rotation: 0,
  color: "#4a90a4",
  opacity: 0.6,
  lineStyle: "solid" as const,
});

describe("fitGridToImage", () => {
  it("square: adjusts only cellSize when it fits under the cap, keeping cols/rows", () => {
    // cols=10, rows=10. max(1200/10, 800/10) = 120 ≤ 256 → cellSize 120.
    const result = fitGridToImage(1200, 800, grid(10, 10, 60));
    expect(result.cellSize).toBe(120);
    expect(result.cols).toBe(10); // unchanged
    expect(result.rows).toBe(10); // unchanged
  });

  it("square: caps cellSize at 256 and GROWS cols/rows to cover the image", () => {
    // ideal = 1000 > 256 → cellSize 256, grow cols/rows to cover 10000px.
    // ceil(10000/256) = 40 each.
    const result = fitGridToImage(10000, 10000, grid(10, 10, 40));
    expect(result.cellSize).toBe(256);
    expect(result.cols).toBe(40);
    expect(result.rows).toBe(40);
    // grid now actually covers the image
    const b = gridLocalBounds(result);
    expect(b.maxX - b.minX).toBeGreaterThanOrEqual(10000);
    expect(b.maxY - b.minY).toBeGreaterThanOrEqual(10000);
  });

  it("square: clamps cellSize to min 8 (tiny image), keeping cols/rows", () => {
    // max(10/5, 10/5) = 2 → below min → 8.
    const result = fitGridToImage(10, 10, grid(5, 5, 50));
    expect(result.cellSize).toBe(8);
    expect(result.cols).toBe(5);
    expect(result.rows).toBe(5);
  });

  it("square: preserves all other grid fields (incl. rotation/skew for isometric)", () => {
    const g: GridShape = { ...grid(10, 10, 60), rotation: 45, skewRatio: 0.5 };
    const result = fitGridToImage(1200, 800, g);
    expect(result.kind).toBe("square");
    expect(result.color).toBe(g.color);
    expect(result.opacity).toBe(g.opacity);
    expect(result.skewRatio).toBe(0.5);   // isometric preserved
    expect(result.rotation).toBe(45);     // isometric preserved
  });

  it("hex: fits cellSize from the real hex bounds when under the cap", () => {
    // unit bounds (cellSize=1, 5×5): width≈9.526, height=8.
    // ideal = max(1000/9.526, 900/8) = max(104.97, 112.5) = 112.5 → round 113.
    const result = fitGridToImage(1000, 900, hexGrid(5, 5, 40));
    expect(result.cellSize).toBe(113);
    expect(result.cols).toBe(5);
    expect(result.rows).toBe(5);
  });

  it("hex: caps and grows cols/rows so the grid covers the image", () => {
    const result = fitGridToImage(4000, 4000, hexGrid(3, 3, 40));
    expect(result.cellSize).toBe(256);
    expect(result.cols).toBeGreaterThan(3);
    expect(result.rows).toBeGreaterThan(3);
    const b = gridLocalBounds(result);
    expect(b.maxX - b.minX).toBeGreaterThanOrEqual(4000);
    expect(b.maxY - b.minY).toBeGreaterThanOrEqual(4000);
  });
});

describe("computeCoverFit — hex covers the full grid bounds", () => {
  it("hex: image covers the hex grid's real extent (wider than cols*cellSize)", () => {
    const g = hexGrid(5, 5, 40);
    const b = gridLocalBounds(g);
    const result = computeCoverFit(1000, 1000, g);
    // bg must span at least the grid's bounds in both axes
    expect(result.x).toBeLessThanOrEqual(b.minX + 0.01);
    expect(result.y).toBeLessThanOrEqual(b.minY + 0.01);
    expect(result.x + result.width).toBeGreaterThanOrEqual(b.maxX - 0.01);
    expect(result.y + result.height).toBeGreaterThanOrEqual(b.maxY - 0.01);
  });
});
