import { describe, it, expect } from "vitest";
import { stackOffsets } from "../stacking";
import type { Piece } from "../../../../types/tacticalMap";

const piece = (id: string, col: number, row: number): Piece => ({
  id,
  characterId: `c-${id}`,
  coord: { slot: { kind: "square", col, row }, z: 0 },
  visible: true,
});

describe("stackOffsets", () => {
  it("não desloca peça sozinha no slot", () => {
    const out = stackOffsets([piece("a", 1, 1), piece("b", 2, 2)]);
    expect(out.get("a")).toEqual({ dx: 0, dy: 0, count: 1, index: 0 });
  });

  it("empilha em cascata e conta os ocupantes", () => {
    const out = stackOffsets([piece("a", 1, 1), piece("b", 1, 1), piece("c", 1, 1)]);
    expect(out.get("a")?.count).toBe(3);
    expect(out.get("b")?.index).toBe(1);
    expect(out.get("c")?.dx).toBeGreaterThan(out.get("b")!.dx);
  });

  it("põe a peça em foco por último, no topo", () => {
    const out = stackOffsets([piece("a", 1, 1), piece("b", 1, 1)], "a");
    expect(out.get("a")?.index).toBe(1);
    expect(out.get("b")?.index).toBe(0);
  });
});
