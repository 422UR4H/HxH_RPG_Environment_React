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