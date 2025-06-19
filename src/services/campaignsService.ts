import { httpClient } from "./httpClient";
import type { CampaignMaster, CampaignPlayer } from "../types/campaign";
import { objToCamelCase } from "../utils/caseConverter";
import config from "./config";

export const campaignsService = {
  listCampaigns: (token: string) =>
    httpClient
      .get<CampaignsResponse>("/campaigns", config(token))
      .then((response) => {
        const data = objToCamelCase<CampaignsResponse>(response.data);
        const campaigns = data.campaigns || [];

        return {
          ...response,
          data: campaigns.map((campaign) =>
            objToCamelCase<CampaignSummary>(campaign)
          ),
        };
      }),
};
