import { describe, it, expect } from "vitest";
import { fogTiers, cellKey } from "../fog";
import type { GridShape } from "../../../../types/tacticalMap";
import realPayload from "./fixtures/realFogPayload.json";

// A fixture is produced by the backend smoke test running against the real match
// (System_X_System/internal/app/game/fog_smoke_test.go, SMOKE_DUMP). Testing against
// it means the frontend is validated with production data rather than numbers invented
// to make the test pass.

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

const explored = new Set(payload.explored_cells.map(([a, b]) => cellKey(a, b)));

describe("fogTiers", () => {
  it("covers every cell of the board exactly once", () => {
    const tiers = fogTiers(grid, explored, "explored");
    const seen = new Set<string>();
    for (const [a, b] of [...tiers.hidden, ...tiers.explored]) {
      const k = cellKey(a, b);
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
    expect(seen.size).toBe(grid.cols * grid.rows);
  });

  it("keeps every classified cell on the board", () => {
    const tiers = fogTiers(grid, explored, "explored");
    for (const [a, b] of [...tiers.hidden, ...tiers.explored]) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(grid.cols);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(grid.rows);
    }
  });

  it("marks the explored cells the backend sent as remembered", () => {
    const tiers = fogTiers(grid, explored, "explored");
    const remembered = new Set(tiers.explored.map(([a, b]) => cellKey(a, b)));
    for (const key of explored) {
      expect(remembered.has(key)).toBe(true);
    }
  });

  it("ignores explored cells in live mode — everything unseen is unknown", () => {
    const live = fogTiers(grid, explored, "live");
    expect(live.explored.length).toBe(0);
    expect(live.hidden.length).toBe(grid.cols * grid.rows);
  });

  it("falls back to full darkness when nothing was ever explored", () => {
    const dark = fogTiers(grid, new Set(), "explored");
    expect(dark.hidden.length).toBe(grid.cols * grid.rows);
    expect(dark.explored.length).toBe(0);
  });
});
