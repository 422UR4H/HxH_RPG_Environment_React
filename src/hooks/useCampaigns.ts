import { useQuery } from "@tanstack/react-query";
import { campaignService } from "../services/campaignService";
import type { CampaignSummary } from "../types/campaigns";

export function useCampaigns(token: string | null) {
  return useQuery<CampaignSummary[]>({
    queryKey: ["campaigns", token],
    queryFn: () => campaignService.listCampaigns(token!),
    enabled: !!token,
    retry: 1,
  });
}
