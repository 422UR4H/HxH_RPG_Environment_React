import { describe, it, expect } from "vitest";
import { slotToWorld, worldToSlot } from "../coords";
import type { GridShape } from "../../../../types/tacticalMap";
import { hexToPixel } from "../hex";

const squareGrid = (cellSize = 40): GridShape => ({
  kind: "square",
  cols: 10,
  rows: 10,
  cellSize,
  skewRatio: 1,
  rotation: 0,
  color: "#000",
  opacity: 1,
  lineStyle: "solid",
});

describe("coords — square (no skew, no rotation)", () => {
  it("slotToWorld returns the center of the slot", () => {
    const g = squareGrid(40);
    expect(slotToWorld({ kind: "square", col: 0, row: 0 }, g)).toEqual({ x: 20, y: 20 });
    expect(slotToWorld({ kind: "square", col: 1, row: 0 }, g)).toEqual({ x: 60, y: 20 });
    expect(slotToWorld({ kind: "square", col: 0, row: 2 }, g)).toEqual({ x: 20, y: 100 });
  });

  it("worldToSlot snaps a world point to its slot", () => {
    const g = squareGrid(40);
    expect(worldToSlot({ x: 20, y: 20 }, g)).toEqual({ kind: "square", col: 0, row: 0 });
    expect(worldToSlot({ x: 39.9, y: 0.1 }, g)).toEqual({ kind: "square", col: 0, row: 0 });
    expect(worldToSlot({ x: 40, y: 40 }, g)).toEqual({ kind: "square", col: 1, row: 1 });
    expect(worldToSlot({ x: 199, y: 79 }, g)).toEqual({ kind: "square", col: 4, row: 1 });
  });

  it("slotToWorld and worldToSlot are inverses on slot centers", () => {
    const g = squareGrid(50);
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 5; row++) {
        const world = slotToWorld({ kind: "square", col, row }, g);
        expect(worldToSlot(world, g)).toEqual({ kind: "square", col, row });
      }
    }
  });
});

const hexGrid = (cellSize = 10): GridShape => ({
  kind: "hex",
  cols: 10,
  rows: 10,
  cellSize,
  skewRatio: 1,
  rotation: 0,
  color: "#000",
  opacity: 1,
  lineStyle: "solid",
});

describe("coords — hex (no skew, no rotation)", () => {
  it("slotToWorld(hex 0,0) is the origin", () => {
    const g = hexGrid(10);
    expect(slotToWorld({ kind: "hex", q: 0, r: 0 }, g)).toEqual({ x: 0, y: 0 });
  });

  it("slotToWorld(hex q,r) matches hexToPixel with grid.cellSize as size", () => {
    const g = hexGrid(12);
    const samples = [
      { q: 1, r: 0 }, { q: 0, r: 1 }, { q: 2, r: -1 }, { q: -1, r: 2 },
    ];
    for (const s of samples) {
      expect(slotToWorld({ kind: "hex", ...s }, g)).toEqual(hexToPixel(s, 12));
    }
  });

  it("worldToSlot inverts slotToWorld on hex centers", () => {
    const g = hexGrid(15);
    for (let q = -3; q <= 3; q++) {
      for (let r = -3; r <= 3; r++) {
        const world = slotToWorld({ kind: "hex", q, r }, g);
        expect(worldToSlot(world, g)).toEqual({ kind: "hex", q, r });
      }
    }
  });
});

describe("coords — skew + rotation", () => {
  it("default skew=1, rotation=0 leaves results unchanged", () => {
    // já coberto nos testes anteriores; aqui só re-afirmamos um caso
    const g = squareGrid(40);
    expect(slotToWorld({ kind: "square", col: 1, row: 1 }, g)).toEqual({ x: 60, y: 60 });
  });

  it("skewRatio < 1 squashes y relative to grid center (pivot)", () => {
    // Grid 10x10 cellSize=40 → pivot=(200,200).
    // Slot (1,1) baseline=(60,60). dy=(60-200)*0.5=-70 → world.y=-70+200=130.
    const g: GridShape = { ...squareGrid(40), skewRatio: 0.5 };
    expect(slotToWorld({ kind: "square", col: 1, row: 1 }, g)).toEqual({ x: 60, y: 130 });
  });

  it("rotation rotates around the grid center (pivot), not the origin", () => {
    // Grid 10x10 cellSize=40 → pivot=(200,200).
    // Slot (0,0) baseline=(20,20). dx=-180, dy=-180. rot90°→(180,-180). world=(380,20).
    const g: GridShape = { ...squareGrid(40), rotation: 90 };
    const p = slotToWorld({ kind: "square", col: 0, row: 0 }, g);
    expect(p.x).toBeCloseTo(380, 6);
    expect(p.y).toBeCloseTo(20, 6);
  });

  it("worldToSlot reverses skew + rotation for square", () => {
    const g: GridShape = { ...squareGrid(40), skewRatio: 0.5, rotation: 30 };
    const slot = { kind: "square" as const, col: 2, row: 3 };
    const world = slotToWorld(slot, g);
    expect(worldToSlot(world, g)).toEqual(slot);
  });

  it("worldToSlot reverses skew + rotation for hex", () => {
    const g: GridShape = { ...hexGrid(20), skewRatio: 0.7, rotation: -45 };
    const slot = { kind: "hex" as const, q: 2, r: -1 };
    const world = slotToWorld(slot, g);
    expect(worldToSlot(world, g)).toEqual(slot);
  });
});
