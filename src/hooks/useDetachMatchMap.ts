import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";

export function useDetachMatchMap(token: string | null, matchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => mapsService.detachMatchMap(token!, matchId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["match-map", matchId] });
    },
  });
}
