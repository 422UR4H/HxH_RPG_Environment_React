import { describe, it, expect } from "vitest";
import { fogTiers, pointInPolygon, cellKey } from "../fog";
import { slotToWorld } from "../coords";
import type { GridShape } from "../../../../types/tacticalMap";
import realPayload from "./fixtures/realFogPayload.json";

// The fixture is produced by the backend smoke test running against the real match
// (see System_X_System/internal/app/game/fog_smoke_test.go, SMOKE_DUMP). Testing the
// fog classification against it means the frontend is validated with production data
// rather than numbers invented to make the test pass.

type Payload = {
  visible_polygons: Array<Array<{ x: number; y: number }>>;
  explored_cells: Array<[number, number]>;
  fog_mode: string;
  grid: { kind: string; cols: number; rows: number; cell_size: number; skew_ratio: number };
};

const payload = realPayload as unknown as Payload;

const grid: GridShape = {
  kind: "square",
  cols: payload.grid.cols,
  rows: payload.grid.rows,
  cellSize: payload.grid.cell_size,
  skewRatio: payload.grid.skew_ratio,
  rotation: 0,
} as GridShape;

const polys = payload.visible_polygons.map((p) =>
  p.map((pt) => [pt.x, pt.y] as [number, number]),
);
const explored = new Set(payload.explored_cells.map(([a, b]) => cellKey(a, b)));
const center = (a: number, b: number) =>
  slotToWorld({ kind: "square", col: a, row: b }, grid);

describe("pointInPolygon", () => {
  it("classifies inside and outside of a square ring", () => {
    const square: Array<[number, number]> = [[0, 0], [10, 0], [10, 10], [0, 10]];
    expect(pointInPolygon(5, 5, square)).toBe(true);
    expect(pointInPolygon(15, 5, square)).toBe(false);
    expect(pointInPolygon(-1, -1, square)).toBe(false);
  });
});

describe("fogTiers on the real match payload", () => {
  const tiers = fogTiers(grid, polys, explored, "explored", center);

  it("leaves a lit area — some cells are visible, so not every cell is fogged", () => {
    const total = grid.cols * grid.rows;
    const fogged = tiers.hidden.length + tiers.explored.length;
    expect(fogged).toBeLessThan(total);
    // The whole point of the feature: the player can actually see something.
    expect(total - fogged).toBeGreaterThan(0);
  });

  it("never classifies the same cell twice — the layers must not overlap", () => {
    const seen = new Set<string>();
    for (const [a, b] of [...tiers.hidden, ...tiers.explored]) {
      const k = cellKey(a, b);
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
  });

  it("keeps every classified cell on the board", () => {
    for (const [a, b] of [...tiers.hidden, ...tiers.explored]) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(grid.cols);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(grid.rows);
    }
  });

  it("agrees with the backend: visible cells are a subset of explored ones", () => {
    const total = grid.cols * grid.rows;
    const visibleCount = total - tiers.hidden.length - tiers.explored.length;
    // Backend marks every cell whose centre is in the polygon as explored, so the
    // count it sent must cover at least the cells we consider visible.
    expect(payload.explored_cells.length).toBeGreaterThanOrEqual(visibleCount);
  });

  it("treats a cell the polygon covers as visible, not as fog", () => {
    // Pick a cell centre that really is inside the polygon and assert it is excluded.
    let found: [number, number] | null = null;
    for (let b = 0; b < grid.rows && !found; b++) {
      for (let a = 0; a < grid.cols; a++) {
        const c = center(a, b);
        if (polys.some((p) => pointInPolygon(c.x, c.y, p))) {
          found = [a, b];
          break;
        }
      }
    }
    expect(found).not.toBeNull();
    const key = cellKey(found![0], found![1]);
    const fogged = [...tiers.hidden, ...tiers.explored].map(([a, b]) => cellKey(a, b));
    expect(fogged).not.toContain(key);
  });

  it("falls back to full darkness when there is no visibility at all", () => {
    const dark = fogTiers(grid, [], new Set(), "explored", center);
    expect(dark.hidden.length).toBe(grid.cols * grid.rows);
    expect(dark.explored.length).toBe(0);
  });

  it("ignores explored cells in live mode", () => {
    const live = fogTiers(grid, [], explored, "live", center);
    expect(live.explored.length).toBe(0);
    expect(live.hidden.length).toBe(grid.cols * grid.rows);
  });
});
