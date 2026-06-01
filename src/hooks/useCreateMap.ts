import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";

export function useCreateMap(
  token: string | null,
  campaignId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      mapsService.createMap(token!, campaignId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["maps", campaignId, token],
      });
    },
  });
}
