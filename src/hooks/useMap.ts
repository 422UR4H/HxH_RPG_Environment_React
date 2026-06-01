import { useQuery } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";
import type { TacticalMap } from "../types/tacticalMap";

export function useMap(token: string | null, mapId: string | undefined) {
  return useQuery<TacticalMap>({
    queryKey: ["map", mapId, token],
    queryFn: () => mapsService.getMap(token!, mapId!),
    enabled: !!token && !!mapId,
    retry: 1,
  });
}
