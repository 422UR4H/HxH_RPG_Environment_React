import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";

export function useUpdateMap(
  token: string | null,
  campaignId: string | undefined,
  mapId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => mapsService.updateMap(token!, mapId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maps", campaignId, token] });
      queryClient.invalidateQueries({ queryKey: ["map", mapId, token] });
    },
  });
}
