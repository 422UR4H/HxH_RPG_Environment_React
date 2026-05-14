import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService } from "../services/matchService";

export function useCreateMatch(
  token: string | null,
  campaignId: string | undefined
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => matchService.createMatch(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignDetails", token, campaignId],
      });
    },
  });
}
