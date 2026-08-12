// src/test/fixtures/match.ts
import type { Match } from "../../types/match";

export const matchFixture: Match = {
  uuid: "match-1",
  campaignUuid: "campaign-1",
  masterUuid: "master-1",
  title: "Partida de Teste",
  briefInitialDescription: "Brief partida",
  description: "Descrição partida",
  isPublic: true,
  gameScheduledAt: "2025-12-01T19:00:00Z",
  storyStartAt: "2025-12-01",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

export const matchAsMaster = (userUuid: string): Match => ({
  ...matchFixture,
  masterUuid: userUuid,
});

export const matchOngoing = (): Match => ({
  ...matchFixture,
  gameStartAt: "2025-12-01T19:05:00Z",
});

export const matchEnded = (): Match => ({
  ...matchFixture,
  gameStartAt: "2025-12-01T19:05:00Z",
  storyEndAt: "2025-12-15",
  briefFinalDescription: "Partida encerrada",
});

// ─── Wire-format (backend) counterparts ────────────────────────────────────
// Hand-built directly from MatchResponse's `json` tags
// (internal/app/api/match/create_match.go) — NOT derived from matchFixture
// above, and kept as Record<string, unknown> (not Match), so a future field
// rename on the frontend Match type can't silently drag this along and mask
// wire-format drift. Values mirror matchFixture.
export const matchApiFixture: Record<string, unknown> = {
  uuid: "match-1",
  campaignUuid: "campaign-1",
  masterUuid: "master-1",
  title: "Partida de Teste",
  briefInitialDescription: "Brief partida",
  description: "Descrição partida",
  isPublic: true,
  gameScheduledAt: "2025-12-01T19:00:00Z",
  storyStartAt: "2025-12-01",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

export const matchAsMasterApi = (userUuid: string): Record<string, unknown> => ({
  ...matchApiFixture,
  masterUuid: userUuid,
});

export const matchOngoingApi = (): Record<string, unknown> => ({
  ...matchApiFixture,
  gameStartAt: "2025-12-01T19:05:00Z",
});

export const matchEndedApi = (): Record<string, unknown> => ({
  ...matchApiFixture,
  gameStartAt: "2025-12-01T19:05:00Z",
  storyEndAt: "2025-12-15",
  briefFinalDescription: "Partida encerrada",
});
