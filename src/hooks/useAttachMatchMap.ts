import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";

export type AttachMatchMapVars = {
  mapId: string;
  /** B16: a partida começa com o tabuleiro em que esta outra terminou. */
  inheritBoardFromMatchUuid?: string;
};

export function useAttachMatchMap(token: string | null, matchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mapId, inheritBoardFromMatchUuid }: AttachMatchMapVars) =>
      mapsService.attachMatchMap(token!, matchId!, mapId, inheritBoardFromMatchUuid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["match-map", matchId] });
    },
  });
}
