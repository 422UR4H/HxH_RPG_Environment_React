import { describe, it, expect } from "vitest";
import { gridLocalBounds, isSlotInBounds, localToSlot, slotToLocal } from "../coords";
import { isPathClear, wallContactSlots } from "../wallReach";
import type { GridShape, SlotCoord, WallSegment } from "../../../../types/tacticalMap";
import golden from "./fixtures/gridGeometryGolden.json";

// Golden compartilhado com o back (mesmo arquivo, byte a byte). Mudou a
// geometria de um lado, quebra o teste do lado.

type Slot = [number, number];
type GoldenGrid = { kind: "square" | "hex"; cols: number; rows: number; cellSize: number; skewRatio: number; rotation: number };
const grids = golden.grids as Record<string, GoldenGrid>;

const gridOf = (name: string): GridShape =>
  ({ ...grids[name], color: "#000", opacity: 1, lineStyle: "solid" }) as GridShape;

const slotOf = (name: string, [a, b]: Slot): SlotCoord =>
  grids[name].kind === "square" ? { kind: "square", col: a, row: b } : { kind: "hex", q: a, r: b };

const toPair = (s: SlotCoord): Slot => (s.kind === "square" ? [s.col, s.row] : [s.q, s.r]);
// Normaliza -0 (Math.floor/arredondamento) para não falhar em toEqual.
const norm = (p: Slot): Slot => [p[0] + 0, p[1] + 0];

function wall(p1: [number, number], p2: [number, number], direction: "both" | "left" | "right" = "both"): WallSegment {
  return {
    id: "w", p1, p2, wallType: "door", material: "wood", move: true, sense: "full",
    direction, open: false, locked: false, hp: 10, maxHp: 10, resistance: 0, destroyed: false,
  } as WallSegment;
}

describe("gridGeometryGolden", () => {
  describe("slotCenters", () => {
    it.each(golden.slotCenters)("$grid $slot -> ($x, $y)", (c) => {
      const p = slotToLocal(slotOf(c.grid, c.slot as Slot), gridOf(c.grid));
      expect(p.x).toBeCloseTo(c.x, 9);
      expect(p.y).toBeCloseTo(c.y, 9);
    });
  });

  describe("localToSlot", () => {
    it.each(golden.localToSlot)("$grid ($x, $y) -> $slot", (c) => {
      const s = localToSlot({ x: c.x, y: c.y }, gridOf(c.grid));
      expect(norm(toPair(s))).toEqual(norm(c.slot as Slot));
    });
  });

  describe("bounds", () => {
    it.each(golden.bounds)("$grid", (c) => {
      const b = gridLocalBounds(gridOf(c.grid));
      expect(b.minX).toBeCloseTo(c.minX, 9);
      expect(b.minY).toBeCloseTo(c.minY, 9);
      expect(b.maxX).toBeCloseTo(c.maxX, 9);
      expect(b.maxY).toBeCloseTo(c.maxY, 9);
    });
  });

  describe("slotInGrid", () => {
    it.each(golden.slotInGrid)("$grid $slot -> $inGrid", (c) => {
      expect(isSlotInBounds(slotOf(c.grid, c.slot as Slot), gridOf(c.grid))).toBe(c.inGrid);
    });
  });

  describe("wallContactSlots", () => {
    it.each(golden.wallContactSlots)("$grid $p1 -> $p2", (c) => {
      const got = wallContactSlots(wall(c.p1 as [number, number], c.p2 as [number, number]), gridOf(c.grid))
        .map((s) => norm(toPair(s)))
        .sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      expect(got).toEqual(c.slots.map((s) => norm(s as Slot)));
    });
  });

  describe("pathBlocked", () => {
    it.each(golden.pathBlocked)("$grid $from -> $to ($wall.direction) -> blocked=$blocked", (c) => {
      const w = wall(c.wall.p1 as [number, number], c.wall.p2 as [number, number], c.wall.direction as "both" | "left");
      const clear = isPathClear(slotOf(c.grid, c.from as Slot), slotOf(c.grid, c.to as Slot), [w], gridOf(c.grid));
      expect(clear).toBe(!c.blocked);
    });
  });
});
