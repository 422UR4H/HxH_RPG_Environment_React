import { useQuery } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";
import type { MatchMapResponse } from "../types/tacticalMap";

export function useMatchMap(token: string | null, matchId: string | undefined) {
  return useQuery<MatchMapResponse | null>({
    queryKey: ["match-map", matchId, token],
    queryFn: () => mapsService.getMatchMap(token!, matchId!),
    enabled: !!token && !!matchId,
    retry: 1,
  });
}
