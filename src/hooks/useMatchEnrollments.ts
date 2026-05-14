import { useQuery } from "@tanstack/react-query";
import { matchService } from "../services/matchService";
import type { Enrollment } from "../types/match";

export function useMatchEnrollments(
  token: string | null,
  matchId: string | undefined,
  enabled: boolean
) {
  return useQuery<Enrollment[]>({
    queryKey: ["matchEnrollments", token, matchId],
    queryFn: () => matchService.getEnrollments(token!, matchId!),
    enabled: !!token && !!matchId && enabled,
    retry: 1,
  });
}
