import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService } from "../services/matchService";

export function useDeleteMatch(token: string | null, matchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => matchService.deleteMatch(token!, matchId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matchDetails", token, matchId] });
      queryClient.invalidateQueries({ queryKey: ["campaignDetails"] });
    },
  });
}
