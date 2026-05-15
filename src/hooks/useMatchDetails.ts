import { useQuery } from "@tanstack/react-query";
import { matchService } from "../services/matchService";
import type { Match } from "../types/match";

export function useMatchDetails(token: string | null, matchId?: string) {
  return useQuery<Match>({
    queryKey: ["matchDetails", token, matchId],
    queryFn: () => matchService.getMatchDetails(token!, matchId!),
    enabled: !!token && !!matchId,
    retry: 1,
  });
}
