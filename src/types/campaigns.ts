export interface CampaignSummary {
  uuid: string;
  name: string;
  briefInitialDescription: string;
  isPublic: boolean;
  callLink: string;
  storyStartAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignsResponse {
  campaigns: CampaignSummary[];
}

export interface PublicCampaignSummary extends CampaignSummary {
  nextGameScheduledAt: string | null;
}

export interface PublicCampaignsResponse {
  campaigns: PublicCampaignSummary[];
}