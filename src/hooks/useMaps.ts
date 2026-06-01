import { useQuery } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";
import type { TacticalMap } from "../types/tacticalMap";

export function useMaps(token: string | null, campaignId: string | undefined) {
  return useQuery<TacticalMap[]>({
    queryKey: ["maps", campaignId, token],
    queryFn: () => mapsService.listMaps(token!, campaignId!),
    enabled: !!token && !!campaignId,
    retry: 1,
  });
}
