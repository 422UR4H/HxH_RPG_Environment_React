import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";

export function useAttachMatchMap(token: string | null, matchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mapId: string) =>
      mapsService.attachMatchMap(token!, matchId!, mapId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["match-map", matchId] });
    },
  });
}
