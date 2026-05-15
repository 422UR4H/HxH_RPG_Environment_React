import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignService } from "../services/campaignService";

export function useCreateCampaign(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => campaignService.createCampaign(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", token] });
    },
  });
}
