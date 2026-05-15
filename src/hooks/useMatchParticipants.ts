import { useQuery } from "@tanstack/react-query";
import { matchService } from "../services/matchService";
import type { Participant } from "../types/match";

export function useMatchParticipants(
  token: string | null,
  matchId: string | undefined,
  enabled: boolean
) {
  return useQuery<Participant[]>({
    queryKey: ["matchParticipants", token, matchId],
    queryFn: () => matchService.getParticipants(token!, matchId!),
    enabled: !!token && !!matchId && enabled,
    retry: 1,
  });
}
