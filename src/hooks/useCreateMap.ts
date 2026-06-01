import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";
import type { GridShape } from "../types/tacticalMap";

export function useCreateMap(
  token: string | null,
  campaignId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; grid: GridShape }) =>
      mapsService.createMap(token!, campaignId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["maps", campaignId, token],
      });
    },
  });
}
