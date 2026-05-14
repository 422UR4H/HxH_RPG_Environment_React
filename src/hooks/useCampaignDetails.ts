import { useQuery } from "@tanstack/react-query";
import { campaignService } from "../services/campaignService";
import type { CampaignMaster } from "../types/campaign";

export function useCampaignDetails(token: string | null, id?: string) {
  return useQuery<CampaignMaster>({
    queryKey: ["campaignDetails", token, id],
    queryFn: () => campaignService.getCampaignDetails(token!, id!),
    enabled: !!token && !!id,
    retry: 1,
  });
}
