import { describe, it, expect } from "vitest";
import { tableMap } from "../tableMap";
import type { GridShape, TacticalMap } from "../../../../types/tacticalMap";

const grid = (cellSize: number) => ({ kind: "square", cols: 5, rows: 5, cellSize } as unknown as GridShape);
const bg = { url: "u", x: 0, y: 0, width: 1, height: 1, rotation: 0, opacity: 1 };
const restBg = { ...bg, url: "campaign.png" };
const rest = {
  id: "m", name: "Masmorra", grid: grid(40), bg: restBg,
  pieces: [{ id: "rest-piece" }], walls: [{ id: "rest-wall" }],
} as unknown as TacticalMap;

describe("tableMap", () => {
  it("sem grade do tabuleiro: undefined, com ou sem o mapa do REST", () => {
    expect(tableMap(undefined, undefined, bg)).toBeUndefined();
    expect(tableMap(undefined, undefined, undefined, "uuid")).toBeUndefined();
  });
  it("o tabuleiro chegou e o REST não: desenha, com campos neutros", () => {
    const m = tableMap(undefined, grid(1), bg)!;
    expect(m.grid).toEqual(grid(1));
    expect(m.bg).toEqual(bg);
    expect(m).toMatchObject({
      id: "", campaignId: "", name: "", pieces: [], walls: [], decorations: [], items: [],
      createdAt: "", updatedAt: "",
    });
  });
  it("sem o mapa do REST, o id é o mapUuid do mapa anexado", () => {
    expect(tableMap(undefined, grid(1), undefined, "map-uuid")!.id).toBe("map-uuid");
    expect(tableMap(undefined, grid(1), undefined, "map-uuid")!.bg).toBeNull();
  });
  it("board not arrived yet: undefined — never the campaign map's geometry", () => {
    expect(tableMap(rest, undefined, undefined)).toBeUndefined();
    expect(tableMap(rest, undefined, bg)).toBeUndefined();
  });
  it("takes the board's grid and bg, and keeps the REST map's name", () => {
    const m = tableMap(rest, grid(64), bg)!;
    expect(m.grid).toEqual(grid(64));
    expect(m.bg).toEqual(bg);
    expect(m.name).toBe("Masmorra");
  });
  it("board bg null means no background, overriding REST", () => {
    expect(tableMap(rest, grid(64), null)!.bg).toBeNull();
  });
  it("board bg absent with a grid is also no background — never the campaign's", () => {
    expect(tableMap(rest, grid(64), undefined)!.bg).toBeNull();
  });
  it("carries none of the campaign map's pieces or walls", () => {
    const m = tableMap(rest, grid(64), bg)!;
    expect(m.pieces).toEqual([]);
    expect(m.walls).toEqual([]);
  });
});
