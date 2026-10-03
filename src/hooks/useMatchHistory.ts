import { useQuery } from "@tanstack/react-query";
import { matchService } from "../services/matchService";
import type { MatchHistory } from "../types/matchHistory";

/**
 * O histórico da partida, projetado para quem pede (a chave inclui o token: o mesmo turno
 * vem diferente para cada pessoa). `fetchStartedAt` é a hora LOCAL em que o fetch começou:
 * é o que decide se um evento ao vivo já está coberto por esta resposta (ver historyRows).
 */
export function useMatchHistory(token: string | null, matchId: string | undefined) {
  return useQuery<{ history: MatchHistory; fetchStartedAt: number }>({
    queryKey: ["matchHistory", token, matchId],
    queryFn: async () => {
      const fetchStartedAt = Date.now();
      const history = await matchService.getHistory(token!, matchId!);
      return { history, fetchStartedAt };
    },
    enabled: !!token && !!matchId,
    retry: 1,
  });
}
