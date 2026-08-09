// src/test/fixtures/map.ts
import type { Piece, TacticalMap } from "../../types/tacticalMap";
import { objToSnakeCase } from "../../utils/caseConverter";

export const mapFixture: TacticalMap = {
  id: "map-1",
  campaignId: "campaign-1",
  name: "Floresta do Norte",
  description: "Uma floresta densa ao norte do reino.",
  grid: {
    kind: "square",
    cols: 25,
    rows: 25,
    cellSize: 64,
    skewRatio: 1.0,
    rotation: 0,
    color: "#ffffff",
    opacity: 0.5,
    lineStyle: "solid",
  },
  bg: null,
  pieces: [],
  walls: [],
  decorations: [],
  items: [],
  createdAt: "2026-05-31T00:00:00.000Z",
  updatedAt: "2026-05-31T00:00:00.000Z",
};

export const pieceFixture: Piece = {
  id: "piece-1",
  characterId: "npc-1",
  coord: { slot: { kind: "square", col: 2, row: 3 }, z: 0 },
  visible: true,
};

export const mapWithPieces = (pieces: Piece[]): TacticalMap => ({
  ...mapFixture,
  pieces,
});

// ─── Wire-format (backend) counterparts ────────────────────────────────────
// Go's MapResponse (internal/app/api/map/map_response.go) serializes
// snake_case (id, campaign_id, grid.cell_size, grid.skew_ratio, grid.line_style,
// created_at, updated_at); mapsService applies objToCamelCase() on the way in.
// These run the fixtures above through objToSnakeCase() so MSW mocks reflect
// the real wire shape instead of the frontend's already-converted one.
export const mapApiFixture = objToSnakeCase<Record<string, unknown>>(mapFixture);

export const mapWithPiecesApi = (pieces: Piece[]): Record<string, unknown> =>
  objToSnakeCase<Record<string, unknown>>(mapWithPieces(pieces));
