import { httpClient } from "./httpClient";
import type { CampaignMaster, CampaignPlayer } from "../types/campaign";
import { objToCamelCase } from "../utils/caseConverter";
import config from "./config";

export const campaignService = {
  getCampaigns: (token: string) =>
    httpClient
      .get<CampaignMaster[]>("/campaigns", config(token))
      .then((response) => ({
        ...response,
        data: response.data.map((campaign) =>
          objToCamelCase<CampaignMaster>(campaign)
        ),
      })),

  getCampaignDetails: (token: string, id: string) =>
    httpClient
      .get<CampaignMaster>(`/campaigns/${id}`, config(token))
      .then((response) => ({
        ...response,
        data: objToCamelCase<CampaignMaster>(response.data),
      })),
};
