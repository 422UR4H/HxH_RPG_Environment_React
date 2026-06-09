import { describe, it, expect } from "vitest";
import { computeCoverFit, deriveGridFromImage, fitGridToImage } from "../bgFit";
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
  it("square: computes cols/rows from naturalSize and cellSize (rounds nearest)", () => {
    // 1200÷60=20, 800÷60≈13.33→13
    const result = fitGridToImage(1200, 800, grid(10, 10, 60));
    expect(result.cols).toBe(20);
    expect(result.rows).toBe(13);
    expect(result.cellSize).toBe(60); // unchanged
  });

  it("square: clamps cols/rows to max 200", () => {
    const result = fitGridToImage(10000, 10000, grid(10, 10, 1));
    expect(result.cols).toBe(200);
    expect(result.rows).toBe(200);
  });

  it("square: clamps cols/rows to min 1", () => {
    const result = fitGridToImage(10, 10, grid(5, 5, 500));
    expect(result.cols).toBe(1);
    expect(result.rows).toBe(1);
  });

  it("square: preserves all other grid fields", () => {
    const g = grid(10, 10, 60);
    const result = fitGridToImage(1200, 800, g);
    expect(result.kind).toBe("square");
    expect(result.color).toBe(g.color);
    expect(result.opacity).toBe(g.opacity);
    expect(result.skewRatio).toBe(g.skewRatio);
    expect(result.rotation).toBe(g.rotation);
  });

  it("hex: computes cols/rows from hex geometry", () => {
    // hexW = 40*sqrt(3)≈69.28, hexH = 40*1.5=60
    const result = fitGridToImage(1000, 900, hexGrid(5, 5, 40));
    const hexW = 40 * Math.sqrt(3);
    const hexH = 40 * 1.5;
    expect(result.cols).toBe(Math.min(200, Math.max(1, Math.round(1000 / hexW))));
    expect(result.rows).toBe(Math.min(200, Math.max(1, Math.round(900 / hexH))));
  });
});
