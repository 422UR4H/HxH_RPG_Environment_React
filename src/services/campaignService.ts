import { httpClient } from "./httpClient";
import type { CampaignMaster, CampaignEditResult } from "../types/campaign";
import config from "./config";
import type {
  CampaignsResponse,
  PublicCampaignsResponse,
  CampaignSummary,
  PublicCampaignSummary,
} from "../types/campaigns";

export const campaignService = {
  getCampaignDetails: (token: string, id: string): Promise<CampaignMaster> =>
    httpClient
      .get<{ campaign: CampaignMaster }>(`/campaigns/${id}`, config(token))
      .then(({ data }) => data.campaign),

  listCampaigns: (token: string): Promise<CampaignSummary[]> =>
    httpClient
      .get<CampaignsResponse>("/campaigns", config(token))
      .then(({ data }) => data.campaigns ?? []),

  listPublicCampaigns: (token: string): Promise<PublicCampaignSummary[]> =>
    httpClient
      .get<PublicCampaignsResponse>("/public/campaigns", config(token))
      .then(({ data }) => data.campaigns ?? []),

  createCampaign: (token: string, campaignData: object): Promise<CampaignMaster> =>
    httpClient
      .post<{ campaign: CampaignMaster }>("/campaigns", campaignData, config(token))
      .then(({ data }) => data.campaign),

  deleteCampaign: (token: string, id: string): Promise<void> =>
    httpClient
      .delete(`/campaigns/${id}`, config(token))
      .then(() => undefined),

  updateCampaign: (token: string, id: string, data: object): Promise<CampaignEditResult> =>
    httpClient
      .patch<{ campaign: CampaignEditResult }>(`/campaigns/${id}`, data, config(token))
      .then(({ data }) => data.campaign),
};
