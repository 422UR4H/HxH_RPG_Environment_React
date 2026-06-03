// src/test/fixtures/campaign.ts
import type { CampaignMaster } from "../../types/campaign";
import type { CampaignSummary } from "../../types/campaigns";
import type { CharacterPrivateSummary } from "../../types/characterSheet";

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

export const campaignWithNpcs = (
  npcs: CharacterPrivateSummary[],
  players: CharacterPrivateSummary[] = [],
): CampaignMaster => ({
  ...campaignFixture,
  characterSheets: [...npcs, ...players],
});
