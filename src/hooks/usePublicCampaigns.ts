import { useQuery } from "@tanstack/react-query";
import { campaignService } from "../services/campaignService";
import type { PublicCampaignSummary } from "../types/campaigns";

export function usePublicCampaigns(token: string | null) {
  return useQuery<PublicCampaignSummary[]>({
    queryKey: ["publicCampaigns", token],
    queryFn: async () => {
      if (!token) throw new Error("Token inválido");
      const { data } = await campaignService.listPublicCampaigns(token);
      return data;
    },
    enabled: !!token,
    retry: 1,
  });
}
