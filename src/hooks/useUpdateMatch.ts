import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService } from "../services/matchService";

export function useUpdateMatch(token: string | null, matchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => matchService.updateMatch(token!, matchId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["matchDetails", token, matchId],
      });
    },
  });
}
