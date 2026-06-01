import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";

export function useDeleteMap(
  token: string | null,
  campaignId: string | undefined,
  mapId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => mapsService.deleteMap(token!, mapId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maps", campaignId, token] });
    },
  });
}
