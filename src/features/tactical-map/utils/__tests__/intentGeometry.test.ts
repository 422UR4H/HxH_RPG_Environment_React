import { describe, it, expect } from "vitest";
import { arrowBetween, intentGeometry, tokenRadius } from "../intentGeometry";
import type { GridShape, SlotCoord } from "../../../../types/tacticalMap";

const grid: GridShape = {
  kind: "square", cols: 10, rows: 10, cellSize: 64, skewRatio: 1, rotation: 0,
  color: "#fff", opacity: 1, lineStyle: "solid",
};
const sq = (col: number, row: number): SlotCoord => ({ kind: "square", col, row });

describe("arrowBetween", () => {
  it("starts and ends at the token rims", () => {
    const a = arrowBetween({ x: 0, y: 0 }, { x: 100, y: 0 }, 10, 20)!;
    expect(a.from).toEqual({ x: 10, y: 0 });
    expect(a.to).toEqual({ x: 80, y: 0 });
    // the head points back toward the origin
    expect(a.head[0].x).toBeLessThan(80);
    expect(a.head[1].x).toBeLessThan(80);
  });

  it("gives up when the tokens overlap", () => {
    expect(arrowBetween({ x: 0, y: 0 }, { x: 20, y: 0 }, 10, 10)).toBeUndefined();
  });
});

describe("intentGeometry", () => {
  it("draws nothing without a preview or ghosts", () => {
    expect(intentGeometry(undefined, [], grid)).toEqual({ attacks: [], ghosts: [] });
  });

  it("highlights the destination slot and links it to the actor", () => {
    const s = intentGeometry({ from: sq(2, 4), to: sq(5, 4), auto: false, targets: [] }, [], grid);
    expect(s.destination?.center).toEqual({ x: 5 * 64 + 32, y: 4 * 64 + 32 });
    expect(s.destination?.corners).toHaveLength(4);
    expect(s.destination?.arrow?.from.x).toBeCloseTo(2 * 64 + 32 + tokenRadius(grid));
    expect(s.destination?.arrow?.to.x).toBeCloseTo(5 * 64 + 32 - tokenRadius(grid));
    expect(s.attacks).toEqual([]);
  });

  it("strikes from the destination when moving and attacking", () => {
    const s = intentGeometry({ from: sq(2, 4), to: sq(7, 4), auto: true, targets: [sq(8, 4), sq(8, 6)] }, [], grid);
    expect(s.destination?.auto).toBe(true);
    expect(s.attacks).toHaveLength(2);
    expect(s.attacks[0].from.x).toBeGreaterThan(7 * 64 + 32); // leaves the destination rim
  });

  it("strikes from the actor when only attacking", () => {
    const s = intentGeometry({ from: sq(2, 4), auto: false, targets: [sq(6, 4)] }, [], grid);
    expect(s.destination).toBeUndefined();
    expect(s.attacks).toHaveLength(1);
    expect(s.attacks[0].from.x).toBeGreaterThan(2 * 64 + 32);
    expect(s.attacks[0].from.x).toBeLessThan(3 * 64);
  });

  it("draws a declared move as a ghost with its arrow", () => {
    const s = intentGeometry(undefined, [{ from: [1, 1, 0], to: [4, 1, 0] }], grid);
    expect(s.ghosts).toHaveLength(1);
    expect(s.ghosts[0].center).toEqual({ x: 4 * 64 + 32, y: 64 + 32 });
    expect(s.ghosts[0].arrow).toBeDefined();
  });

  it("a ghost without origin has no arrow", () => {
    const s = intentGeometry(undefined, [{ to: [4, 1, 0] }], grid);
    expect(s.ghosts[0].arrow).toBeUndefined();
  });
});
