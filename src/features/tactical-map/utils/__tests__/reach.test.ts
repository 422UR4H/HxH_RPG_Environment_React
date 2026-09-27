import { describe, it, expect } from "vitest";
import { approachSlot, neighborSlots, slotDistance } from "../reach";
import { isSameSlot } from "../coords";
import type { GridShape, SlotCoord } from "../../../../types/tacticalMap";

const grid = (kind: "square" | "hex", cols = 10, rows = 10): GridShape => ({
  kind,
  cols,
  rows,
  cellSize: 40,
  skewRatio: 1,
  rotation: 0,
  color: "#000",
  opacity: 1,
  lineStyle: "solid",
});
const sq = (col: number, row: number): SlotCoord => ({ kind: "square", col, row });
const hx = (q: number, r: number): SlotCoord => ({ kind: "hex", q, r });
const allFree = () => true;

describe("slotDistance", () => {
  it("counts a square diagonal as one step", () => {
    expect(slotDistance(sq(2, 2), sq(3, 3))).toBe(1);
    expect(slotDistance(sq(2, 2), sq(6, 3))).toBe(4);
    expect(slotDistance(sq(2, 2), sq(2, 2))).toBe(0);
  });

  it("uses axial distance on hex", () => {
    expect(slotDistance(hx(0, 0), hx(1, -1))).toBe(1);
    expect(slotDistance(hx(0, 0), hx(2, 1))).toBe(3);
  });

  it("never treats slots of different kinds as close", () => {
    expect(slotDistance(sq(0, 0), hx(0, 0))).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("neighborSlots", () => {
  it("returns the 8 around a square slot", () => {
    const n = neighborSlots(sq(3, 3));
    expect(n).toHaveLength(8);
    expect(n.every((s) => slotDistance(s, sq(3, 3)) === 1)).toBe(true);
  });

  it("returns the 6 around a hex slot", () => {
    const n = neighborSlots(hx(3, 3));
    expect(n).toHaveLength(6);
    expect(n.every((s) => slotDistance(s, hx(3, 3)) === 1)).toBe(true);
  });
});

describe("approachSlot", () => {
  it("needs no step when the target is already adjacent", () => {
    expect(approachSlot({ actor: sq(2, 2), target: sq(3, 3), grid: grid("square"), isFree: allFree }))
      .toEqual({ kind: "in_reach" });
    expect(approachSlot({ actor: sq(2, 2), target: sq(2, 2), grid: grid("square"), isFree: allFree }))
      .toEqual({ kind: "in_reach" });
  });

  it("stops on the target's side facing the actor", () => {
    const r = approachSlot({ actor: sq(2, 4), target: sq(8, 4), grid: grid("square"), isFree: allFree });
    expect(r).toEqual({ kind: "approach", slot: sq(7, 4) });
  });

  it("skips occupied neighbors", () => {
    const occupied = [sq(7, 4)];
    const r = approachSlot({
      actor: sq(2, 4),
      target: sq(8, 4),
      grid: grid("square"),
      isFree: (s) => !occupied.some((o) => isSameSlot(o, s)),
    });
    expect(r.kind).toBe("approach");
    if (r.kind !== "approach") return;
    // (7,3) and (7,5) tie on steps and distance — either is a fair stop, never (7,4).
    expect([sq(7, 3), sq(7, 5)]).toContainEqual(r.slot);
  });

  it("stays inside the map", () => {
    const r = approachSlot({ actor: sq(5, 5), target: sq(0, 0), grid: grid("square"), isFree: allFree });
    expect(r).toEqual({ kind: "approach", slot: sq(1, 1) });
  });

  it("reports no room when every neighbor is taken", () => {
    const r = approachSlot({ actor: sq(0, 5), target: sq(8, 5), grid: grid("square"), isFree: () => false });
    expect(r).toEqual({ kind: "no_room" });
  });

  it("works on hex grids", () => {
    const r = approachSlot({ actor: hx(0, 2), target: hx(4, 2), grid: grid("hex"), isFree: allFree });
    expect(r).toEqual({ kind: "approach", slot: hx(3, 2) });
  });
});
