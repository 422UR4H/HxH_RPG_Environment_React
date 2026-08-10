// src/test/fixtures/map.ts
import type { Piece, TacticalMap } from "../../types/tacticalMap";

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
// Go's MapResponse (internal/app/api/map/map_response.go) now serializes
// camelCase all the way down (Fase 8), matching the frontend's TacticalMap
// type field-for-field — so the "Api" fixture is just the frontend fixture
// itself, no conversion needed.
export const mapApiFixture: Record<string, unknown> = mapFixture;

export const mapWithPiecesApi = (pieces: Piece[]): Record<string, unknown> =>
  mapWithPieces(pieces);
