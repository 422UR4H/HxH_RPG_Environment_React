import { useQuery } from "@tanstack/react-query";
import { campaignService } from "../services/campaignService";
import type { PublicCampaignSummary } from "../types/campaigns";

export function usePublicCampaigns(token: string | null) {
  return useQuery<PublicCampaignSummary[]>({
    queryKey: ["publicCampaigns", token],
    queryFn: () => campaignService.listPublicCampaigns(token!),
    enabled: !!token,
    retry: 1,
  });
}
