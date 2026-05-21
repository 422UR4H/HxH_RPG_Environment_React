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
