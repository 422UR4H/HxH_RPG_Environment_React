import { describe, it, expect } from "vitest";
import { approachReach, approachSlot, neighborSlots, neighborTowardScreen, slotDistance } from "../reach";
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

describe("approachReach tie-break", () => {
  it("breaks ties by board (LOCAL) distance, not screen distance", () => {
    // Isometric grid: in LOCAL, (2,0) is 80 away and (2,2) is 113; on screen,
    // (2,0) is ~63 and (2,2) ~57, so a WORLD tie-break would wrongly pick the diagonal.
    const iso: GridShape = { ...grid("square"), rotation: 45, skewRatio: 0.5 };
    const r = approachReach({
      actor: sq(0, 0),
      reach: [sq(2, 2), sq(2, 0)],
      grid: iso,
      isFree: allFree,
    });
    expect(r).toEqual({ kind: "approach", slot: sq(2, 0) });
  });
});

describe("neighborTowardScreen", () => {
  it("quadrado sem transform: setas andam como col/row", () => {
    const g = grid("square");
    expect(neighborTowardScreen(sq(3, 3), g, "up")).toEqual(sq(3, 2));
    expect(neighborTowardScreen(sq(3, 3), g, "down")).toEqual(sq(3, 4));
    expect(neighborTowardScreen(sq(3, 3), g, "left")).toEqual(sq(2, 3));
    expect(neighborTowardScreen(sq(3, 3), g, "right")).toEqual(sq(4, 3));
  });

  it("quadrado 45°/0,5: a seta vai para a diagonal que aponta para lá na tela", () => {
    // Passo (dc,dr) vira, na tela, (k·(dc−dr), 0,5·k·(dc+dr)) com k=cos45°.
    // ↑ (0,−1): (−1,−1) → (0,−k): cosseno 1.   ↓: (1,1) → (0,+k).
    // → (1,0):  (1,−1) → (2k, 0): cosseno 1.   ←: (−1,1) → (−2k, 0).
    const g: GridShape = { ...grid("square"), rotation: 45, skewRatio: 0.5 };
    expect(neighborTowardScreen(sq(3, 3), g, "up")).toEqual(sq(2, 2));
    expect(neighborTowardScreen(sq(3, 3), g, "down")).toEqual(sq(4, 4));
    expect(neighborTowardScreen(sq(3, 3), g, "right")).toEqual(sq(4, 2));
    expect(neighborTowardScreen(sq(3, 3), g, "left")).toEqual(sq(2, 4));
  });

  it("hex sem transform: ← vai para (q−1, r); → para (q+1, r)", () => {
    const g = grid("hex");
    expect(neighborTowardScreen(hx(3, 3), g, "left")).toEqual(hx(2, 3));
    expect(neighborTowardScreen(hx(3, 3), g, "right")).toEqual(hx(4, 3));
  });

  // ↑/↓ no hex sem transform empatam entre os dois vizinhos (±30° da vertical). O desempate
  // fica com o que mantém a coluna de offset (col = q + floor(r/2)), para a peça subir a
  // própria coluna em vez de derivar para a direita.
  it("hex: ↑ de uma linha par vai para (q+1, r−1)", () => {
    expect(neighborTowardScreen(hx(3, 2), grid("hex"), "up")).toEqual(hx(4, 1));
  });

  it("hex: ↑ de uma linha ímpar vai para (q, r−1)", () => {
    expect(neighborTowardScreen(hx(3, 3), grid("hex"), "up")).toEqual(hx(3, 2));
  });

  it("hex: ↑ duas vezes volta à mesma coluna de offset, duas linhas acima", () => {
    const g = grid("hex");
    const col = (s: SlotCoord) => (s.kind === "hex" ? s.q + Math.floor(s.r / 2) : NaN);
    for (const start of [hx(3, 3), hx(3, 2), hx(0, -1)]) {
      const once = neighborTowardScreen(start, g, "up");
      const twice = neighborTowardScreen(once, g, "up");
      expect(col(once)).toBe(col(start));
      expect(col(twice)).toBe(col(start));
      expect(twice.kind === "hex" && start.kind === "hex" && twice.r).toBe(start.kind === "hex" && start.r - 2);
    }
  });

  it("hex: ↓ também fica na coluna de offset", () => {
    const g = grid("hex");
    expect(neighborTowardScreen(hx(3, 3), g, "down")).toEqual(hx(2, 4));
    expect(neighborTowardScreen(hx(3, 2), g, "down")).toEqual(hx(3, 3));
  });
});
