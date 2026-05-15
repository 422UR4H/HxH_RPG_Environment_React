import { httpClient } from "./httpClient";
import type { CampaignMaster } from "../types/campaign";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";
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
      .then(({ data }) => objToCamelCase<CampaignMaster>(data.campaign)),

  listCampaigns: (token: string): Promise<CampaignSummary[]> =>
    httpClient
      .get<CampaignsResponse>("/campaigns", config(token))
      .then(({ data }) => objToCamelCase<CampaignsResponse>(data).campaigns ?? []),

  listPublicCampaigns: (token: string): Promise<PublicCampaignSummary[]> =>
    httpClient
      .get<PublicCampaignsResponse>("/public/campaigns", config(token))
      .then(({ data }) =>
        objToCamelCase<PublicCampaignsResponse>(data).campaigns ?? []
      ),

  createCampaign: (token: string, campaignData: object): Promise<CampaignMaster> =>
    httpClient
      .post<{ campaign: CampaignMaster }>(
        "/campaigns",
        objToSnakeCase(campaignData),
        config(token)
      )
      .then(({ data }) => objToCamelCase<CampaignMaster>(data.campaign)),
};
