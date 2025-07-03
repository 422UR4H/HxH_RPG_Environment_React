import { httpClient } from "./httpClient";
import type { CampaignMaster } from "../types/campaign";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";
import config from "./config";
import type { CampaignsResponse } from "../types/campaigns";

export const campaignService = {
  getCampaignDetails: (token: string, id: string) =>
    httpClient
      .get<{ campaign: CampaignMaster }>(`/campaigns/${id}`, config(token))
      .then((response) => {
        const campaignData = response.data.campaign || {};
        return {
          ...response,
          data: objToCamelCase<CampaignMaster>(campaignData),
        };
      }),

  listCampaigns: (token: string) =>
    httpClient
      .get<CampaignsResponse>("/campaigns", config(token))
      .then((response) => {
        const data = objToCamelCase<CampaignsResponse>(response.data);
        return {
          ...response,
          data: data.campaigns || [],
        };
      }),

  createCampaign: (token: string, campaignData: any) =>
    httpClient
      .post<{ campaign: CampaignMaster }>(
        "/campaigns",
        objToSnakeCase(campaignData),
        config(token)
      )
      .then((response) => {
        const campaignData = response.data.campaign || {};
        return {
          ...response,
          data: objToCamelCase<CampaignMaster>(campaignData),
        };
      }),
};
