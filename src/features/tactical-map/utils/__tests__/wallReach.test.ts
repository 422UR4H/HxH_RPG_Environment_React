import { describe, it, expect } from "vitest";
import { isPathClear, wallContactSlots } from "../wallReach";
import { approachReach, stepsToReach } from "../reach";
import type { GridShape, SlotCoord, WallSegment } from "../../../../types/tacticalMap";

const grid = (kind: "square" | "hex" = "square"): GridShape => ({
  kind, cols: 10, rows: 10, cellSize: 40, skewRatio: 1, rotation: 0,
  color: "#000", opacity: 1, lineStyle: "solid",
});
const sq = (col: number, row: number): SlotCoord => ({ kind: "square", col, row });
const key = (s: SlotCoord) => (s.kind === "square" ? `${s.col},${s.row}` : `${s.q},${s.r}`);
const keys = (slots: SlotCoord[]) => slots.map(key).sort();

function wall(p1: [number, number], p2: [number, number], over: Partial<WallSegment> = {}): WallSegment {
  return {
    id: "w", p1, p2, wallType: "door", material: "wood", move: true, sense: "full",
    direction: "both", open: false, locked: false, hp: 10, maxHp: 10, resistance: 0, destroyed: false,
    ...over,
  } as WallSegment;
}

describe("wallContactSlots", () => {
  it("a one-cell wall on a horizontal edge touches the cell above and the one below", () => {
    // Aresta entre (3,4) e (3,5): y = 5 × 40, x de 3 × 40 a 4 × 40.
    expect(keys(wallContactSlots(wall([120, 200], [160, 200]), grid()))).toEqual(["3,4", "3,5"]);
  });

  it("a two-cell vertical wall touches both columns along its length, not the corner cells", () => {
    // x = 4 × 40, y de 2 × 40 a 4 × 40: colunas 3 e 4, linhas 2 e 3.
    expect(keys(wallContactSlots(wall([160, 80], [160, 160]), grid()))).toEqual(["3,2", "3,3", "4,2", "4,3"]);
  });

  it("drops slots outside the map", () => {
    // Na borda de cima do mapa: só a fileira de dentro.
    expect(keys(wallContactSlots(wall([0, 0], [40, 0]), grid()))).toEqual(["0,0"]);
  });

  it("works on a hex grid (every slot near the segment, on both sides)", () => {
    const slots = wallContactSlots(wall([0, 0], [40, 0]), grid("hex"));
    expect(slots.length).toBeGreaterThanOrEqual(2);
    expect(slots.every((s) => s.kind === "hex")).toBe(true);
  });

  it("a zero-length wall has no reach", () => {
    expect(wallContactSlots(wall([40, 40], [40, 40]), grid())).toEqual([]);
  });
});

describe("isPathClear", () => {
  const w = wall([120, 200], [160, 200]);
  it("is blocked straight through a closed wall that blocks movement", () => {
    expect(isPathClear(sq(3, 4), sq(3, 5), [w], grid())).toBe(false);
  });
  it("is clear through an open door", () => {
    expect(isPathClear(sq(3, 4), sq(3, 5), [{ ...w, open: true }], grid())).toBe(true);
  });
  it("is clear beside the wall", () => {
    expect(isPathClear(sq(2, 4), sq(3, 4), [w], grid())).toBe(true);
  });
});

describe("approachReach with a wall's reach", () => {
  const g = grid();
  const w = wall([120, 200], [160, 200]);
  const reach = wallContactSlots(w, g);
  const allFree = () => true;
  const clear = (a: SlotCoord, b: SlotCoord) => isPathClear(a, b, [w], g);

  it("is in reach from either side of the wall", () => {
    expect(approachReach({ actor: sq(3, 4), reach, grid: g, isFree: allFree })).toEqual({ kind: "in_reach" });
    expect(approachReach({ actor: sq(3, 5), reach, grid: g, isFree: allFree })).toEqual({ kind: "in_reach" });
  });

  it("approaches the contact slot on the actor's side", () => {
    expect(approachReach({ actor: sq(3, 0), reach, grid: g, isFree: allFree, isPathClear: clear }))
      .toEqual({ kind: "approach", slot: sq(3, 4) });
    expect(approachReach({ actor: sq(3, 9), reach, grid: g, isFree: allFree, isPathClear: clear }))
      .toEqual({ kind: "approach", slot: sq(3, 5) });
  });

  it("never proposes the far side when the wall itself is in the way", () => {
    // O lado de cima está ocupado: o único livre é o de baixo, atrás da parede fechada.
    const isFree = (s: SlotCoord) => key(s) !== "3,4";
    expect(approachReach({ actor: sq(3, 2), reach, grid: g, isFree, isPathClear: clear })).toEqual({ kind: "no_room" });
  });

  it("counts steps to the wall as steps to the nearest contact slot plus one", () => {
    expect(stepsToReach(sq(3, 4), reach)).toBe(1);
    expect(stepsToReach(sq(3, 0), reach)).toBe(5);
    expect(stepsToReach(sq(3, 0), [])).toBeUndefined();
  });
});
