import { describe, it, expect } from "vitest";
import { pieceScreenAnchor, pieceScreenRadius } from "../screenAnchor";
import { slotToWorld } from "../coords";
import type { GridShape } from "../../../../types/tacticalMap";

const squareGrid: GridShape = {
  kind: "square",
  cols: 10,
  rows: 10,
  cellSize: 50,
  skewRatio: 1,
  rotation: 0,
  color: "#000",
  opacity: 1,
  lineStyle: "solid",
};

describe("screenAnchor", () => {
  it("leva o centro da casa para a tela: mundo × escala + deslocamento do viewport", () => {
    const slot = { kind: "square" as const, col: 2, row: 3 };
    const world = slotToWorld(slot, squareGrid);
    const t = { x: 10, y: 20, scale: 2 };
    expect(pieceScreenAnchor(slot, squareGrid, t)).toEqual({ x: world.x * 2 + 10, y: world.y * 2 + 20 });
    expect(pieceScreenAnchor(slot, squareGrid, t)).toEqual({ x: 260, y: 370 });
  });

  it("o raio na tela é o inraio da casa escalado", () => {
    expect(pieceScreenRadius(squareGrid, { x: 10, y: 20, scale: 2 })).toBe(50);
  });
});
