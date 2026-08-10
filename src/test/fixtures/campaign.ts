// src/test/fixtures/campaign.ts
import type { CampaignMaster } from "../../types/campaign";
import type { CampaignSummary } from "../../types/campaigns";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import { objToSnakeCase } from "../../utils/caseConverter";

export const campaignSummaryFixture: CampaignSummary = {
  uuid: "campaign-1",
  name: "Campanha de Teste",
  briefInitialDescription: "Brief",
  isPublic: true,
  callLink: "",
  storyStartAt: "2025-01-01",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

export const campaignFixture: CampaignMaster = {
  uuid: "campaign-1",
  masterUuid: "master-1",
  name: "Campanha de Teste",
  briefInitialDescription: "Brief inicial",
  description: "Descrição completa da campanha",
  isPublic: true,
  callLink: "",
  storyStartAt: "2025-01-01",
  storyCurrentAt: "2025-06-15T12:00:00Z",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  characterSheets: [],
  pendingSheets: [],
  matches: [],
};

export const campaignAsMaster = (userUuid: string): CampaignMaster => ({
  ...campaignFixture,
  masterUuid: userUuid,
});

export const campaignWithPendingSheets = (sheets: CharacterPrivateSummary[]): CampaignMaster => ({
  ...campaignFixture,
  pendingSheets: sheets,
});

const baseSheet: Omit<CharacterPrivateSummary, "uuid" | "playerUuid" | "nickName"> = {
  fullName: "Nome Completo",
  alignment: "Neutro",
  characterClass: "Transmutador",
  birthday: "1990-01-01",
  categoryName: "Transmutação",
  level: 5,
  points: 100,
  currExp: 200,
  nextLvlBaseExp: 500,
  talentLvl: 3,
  physicalsLvl: 4,
  mentalsLvl: 4,
  spiritualsLvl: 3,
  skillsLvl: 2,
  stamina: { min: 0, current: 80, max: 100 },
  health: { min: 0, current: 90, max: 100 },
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

export const npcFixture: CharacterPrivateSummary = {
  ...baseSheet,
  uuid: "npc-1",
  playerUuid: undefined,
  nickName: "Soldado Zoldyck",
};

export const npc2Fixture: CharacterPrivateSummary = {
  ...baseSheet,
  uuid: "npc-2",
  playerUuid: undefined,
  nickName: "Guarda Kiriko",
};

export const playerSheetFixture: CharacterPrivateSummary = {
  ...baseSheet,
  uuid: "player-1",
  playerUuid: "user-player-1",
  nickName: "Gon Freecss",
};

// NpcRosterPanel só renderiza o campo de busca acima de 15 personagens, então
// testá-lo exige uma lista longa. Nomes seguem "NPC Alfa 01", "NPC Alfa 02"...
export const npcListFixture = (count: number, prefix = "NPC Alfa"): CharacterPrivateSummary[] =>
  Array.from({ length: count }, (_, i) => ({
    ...baseSheet,
    uuid: `npc-bulk-${i + 1}`,
    playerUuid: undefined,
    nickName: `${prefix} ${String(i + 1).padStart(2, "0")}`,
  }));

export const campaignWithNpcs = (
  npcs: CharacterPrivateSummary[],
  players: CharacterPrivateSummary[] = [],
): CampaignMaster => ({
  ...campaignFixture,
  characterSheets: [...npcs, ...players],
});

// ─── Wire-format (backend) counterparts ────────────────────────────────────
// The Go handlers serialize snake_case (internal/app/api/campaign/*.go);
// campaignService applies objToCamelCase() on the way in. These run the same
// fixtures through objToSnakeCase() so MSW mocks exercise that real
// conversion instead of skipping it (a body that's already camelCase makes
// objToCamelCase a no-op and hides real backend/frontend drift).
export const campaignSummaryApiFixture = objToSnakeCase<Record<string, unknown>>(campaignSummaryFixture);
export const campaignApiFixture = objToSnakeCase<Record<string, unknown>>(campaignFixture);

export const campaignAsMasterApi = (userUuid: string): Record<string, unknown> =>
  objToSnakeCase<Record<string, unknown>>(campaignAsMaster(userUuid));

export const campaignWithNpcsApi = (
  npcs: CharacterPrivateSummary[],
  players: CharacterPrivateSummary[] = [],
): Record<string, unknown> =>
  objToSnakeCase<Record<string, unknown>>(campaignWithNpcs(npcs, players));
