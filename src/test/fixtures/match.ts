// src/test/fixtures/match.ts
import type { Match } from "../../types/match";
import { objToSnakeCase } from "../../utils/caseConverter";

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
// Go's MatchResponse (internal/app/api/match/create_match.go) serializes
// snake_case; matchService applies objToCamelCase() on the way in. These run
// the fixtures above through objToSnakeCase() so MSW mocks reflect the real
// wire shape instead of the frontend's already-converted one.
export const matchApiFixture = objToSnakeCase<Record<string, unknown>>(matchFixture);

export const matchAsMasterApi = (userUuid: string): Record<string, unknown> =>
  objToSnakeCase<Record<string, unknown>>(matchAsMaster(userUuid));

export const matchOngoingApi = (): Record<string, unknown> =>
  objToSnakeCase<Record<string, unknown>>(matchOngoing());

export const matchEndedApi = (): Record<string, unknown> =>
  objToSnakeCase<Record<string, unknown>>(matchEnded());
