import { describe, it, expect } from "vitest";
import {
  slotToWorld,
  worldToSlot,
  gridLocalBounds,
  gridHandleLocal,
  applyTransform,
  inverseTransform,
  gridFromHandleDrag,
} from "../coords";
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

describe("gridLocalBounds + gridHandleLocal", () => {
  it("square: bounds tile from the origin", () => {
    const g = squareGrid(40); // 10×10
    expect(gridLocalBounds(g)).toEqual({ minX: 0, minY: 0, maxX: 400, maxY: 400 });
    expect(gridHandleLocal("BR", g)).toEqual({ x: 400, y: 400 });
    expect(gridHandleLocal("TC", g)).toEqual({ x: 200, y: 0 });
    expect(gridHandleLocal("center", g)).toEqual({ x: 200, y: 200 });
  });

  it("hex: bounds use hex pitch, not square geometry", () => {
    // cols=3, rows=3, cellSize=10. hexW=10√3≈17.3205, hexH=15.
    // maxCx = 2*hexW + hexW/2 (odd row exists) = 43.3013; minX=-hexW/2=-8.6603.
    // maxX = 43.3013 + hexW/2 = 51.9615. minY=-10; maxY=2*15+10=40.
    const g: GridShape = { ...hexGrid(10), cols: 3, rows: 3 };
    const b = gridLocalBounds(g);
    expect(b.minX).toBeCloseTo(-8.6603, 3);
    expect(b.maxX).toBeCloseTo(51.9615, 3);
    expect(b.minY).toBeCloseTo(-10, 6);
    expect(b.maxY).toBeCloseTo(40, 6);
    // every bound scales linearly with cellSize (the resize math depends on it)
    const g2: GridShape = { ...g, cellSize: 20 };
    const b2 = gridLocalBounds(g2);
    expect(b2.maxX).toBeCloseTo(b.maxX * 2, 6);
    expect(b2.maxY).toBeCloseTo(b.maxY * 2, 6);
  });
});

describe("grid origin (offset)", () => {
  it("applyTransform shifts the whole grid by origin; inverse undoes it", () => {
    const g: GridShape = { ...squareGrid(40), originX: 100, originY: -50 };
    // local (0,0): without origin maps to world (0,0); with origin → (100,-50).
    expect(applyTransform({ x: 0, y: 0 }, g)).toEqual({ x: 100, y: -50 });
    const round = inverseTransform(applyTransform({ x: 120, y: 80 }, g), g);
    expect(round.x).toBeCloseTo(120, 6);
    expect(round.y).toBeCloseTo(80, 6);
  });
});

describe("gridFromHandleDrag — resize anchors the opposite corner", () => {
  const g = squareGrid(40); // 10×10, cellSize 40 → BR at (400,400), TL at (0,0)

  it("dragging BR keeps TL fixed (origin stays 0), grows toward BR", () => {
    // Drag BR out to (600,600): scale = 1.5 → cellSize 60.
    const out = gridFromHandleDrag("BR", g, 600, 600, false)!;
    expect(out.cellSize).toBeCloseTo(60, 6);
    expect(out.originX ?? 0).toBeCloseTo(0, 6);
    expect(out.originY ?? 0).toBeCloseTo(0, 6);
    // TL still at world (0,0); BR now at (600,600).
    expect(applyTransform(gridHandleLocal("TL", out), out)).toEqual({ x: 0, y: 0 });
    const br = applyTransform(gridHandleLocal("BR", out), out);
    expect(br.x).toBeCloseTo(600, 6);
    expect(br.y).toBeCloseTo(600, 6);
  });

  it("dragging TL keeps BR fixed and grows toward the cursor (up-left)", () => {
    // Drag TL out to (-200,-200): anchor BR=(400,400). diagonal D0=(-400,-400);
    // cursor-anchor=(-600,-600); scale = (−600·−400 ×2)/(400²×2)=1.5 → cellSize 60.
    const out = gridFromHandleDrag("TL", g, -200, -200, false)!;
    expect(out.cellSize).toBeCloseTo(60, 6);
    // BR must stay pinned at (400,400).
    const br = applyTransform(gridHandleLocal("BR", out), out);
    expect(br.x).toBeCloseTo(400, 6);
    expect(br.y).toBeCloseTo(400, 6);
    // TL moved up-left of origin: 400 - 600 = -200.
    const tl = applyTransform(gridHandleLocal("TL", out), out);
    expect(tl.x).toBeCloseTo(-200, 6);
    expect(tl.y).toBeCloseTo(-200, 6);
  });

  it("rotate handle sets rotation from the grid center", () => {
    const out = gridFromHandleDrag("rotate", g, 200, 0, false)!;
    expect(typeof out.rotation).toBe("number");
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

  it("skew is applied in SCREEN space, after rotation (isometric, not vertical-only)", () => {
    // Grid 10x10 cellSize=40 → pivot=(200,200). Slot (0,0) baseline=(20,20).
    // dx=-180, dy=-180. rotate 90° → (rx,ry)=(180,-180). THEN squash y*0.5 → -90.
    // world = (180+200, -90+200) = (380, 110).
    // (Local-space skew — the old buggy order — would give (290, 20) instead.)
    const g: GridShape = { ...squareGrid(40), rotation: 90, skewRatio: 0.5 };
    const p = slotToWorld({ kind: "square", col: 0, row: 0 }, g);
    expect(p.x).toBeCloseTo(380, 6);
    expect(p.y).toBeCloseTo(110, 6);
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
