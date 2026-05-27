import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignService } from "../services/campaignService";

export function useDeleteCampaign(token: string | null, campaignId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => campaignService.deleteCampaign(token!, campaignId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", token] });
    },
  });
}
