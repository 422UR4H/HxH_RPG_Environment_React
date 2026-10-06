import { describe, it, expect } from "vitest";
import { act, render, screen } from "@testing-library/react";
import PieceAnchoredLayer from "../PieceAnchoredLayer";
import { createViewportStore } from "../viewportStore";
import { pieceScreenAnchor, pieceScreenRadius } from "../../../tactical-map/utils/screenAnchor";
import type { GridShape, Piece } from "../../../../types/tacticalMap";

const grid: GridShape = {
  kind: "square", cols: 10, rows: 10, cellSize: 50, skewRatio: 1, rotation: 0,
  color: "grid", opacity: 1, lineStyle: "solid",
};
const piece: Piece = { id: "p1", characterId: "c1", coord: { slot: { kind: "square", col: 1, row: 1 }, z: 0 }, visible: true };
const pieces = new Map([["c1", piece]]);
const items = [{ key: "r-c1", characterId: "c1", placement: "below" as const, node: <button>Esquivar</button> }];

function renderLayer(store = createViewportStore(), over: Partial<Parameters<typeof PieceAnchoredLayer>[0]> = {}) {
  render(<PieceAnchoredLayer viewport={store} grid={grid} pieces={pieces} items={items} width={800} height={600} {...over} />);
  return store;
}

describe("PieceAnchoredLayer", () => {
  it("sem enquadramento do mapa ainda, não desenha nada", () => {
    renderLayer();
    expect(screen.queryByRole("button", { name: "Esquivar" })).not.toBeInTheDocument();
  });

  it("ancora o item no centro da casa da peça, encostado na borda de baixo, e segue o pan/zoom", () => {
    const store = renderLayer();
    const t1 = { x: 10, y: 20, scale: 1 };
    act(() => store.set(t1));
    const item = () => screen.getByRole("button", { name: "Esquivar" }).parentElement as HTMLElement;
    const a1 = pieceScreenAnchor(piece.coord.slot, grid, t1);
    expect(item().style.left).toBe(`${a1.x}px`);
    expect(item().style.top).toBe(`${a1.y + pieceScreenRadius(grid, t1)}px`);

    const t2 = { x: -5, y: 40, scale: 2 };
    act(() => store.set(t2));
    const a2 = pieceScreenAnchor(piece.coord.slot, grid, t2);
    expect(item().style.left).toBe(`${a2.x}px`);
    expect(item().style.top).toBe(`${a2.y + pieceScreenRadius(grid, t2)}px`);
  });

  it("personagem sem peça visível não desenha", () => {
    const store = createViewportStore();
    store.set({ x: 0, y: 0, scale: 1 });
    renderLayer(store, { pieces: new Map() });
    expect(screen.queryByRole("button", { name: "Esquivar" })).not.toBeInTheDocument();
  });

  it("sem grade, não desenha", () => {
    const store = createViewportStore();
    store.set({ x: 0, y: 0, scale: 1 });
    renderLayer(store, { grid: undefined });
    expect(screen.queryByRole("button", { name: "Esquivar" })).not.toBeInTheDocument();
  });
});
