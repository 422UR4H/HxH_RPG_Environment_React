import { useQueries } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";
import { useCampaignDetails } from "./useCampaignDetails";

/** Uma partida cujo tabuleiro esta pode continuar (B16). */
export type BoardSource = {
  matchUuid: string;
  title: string;
  startedAt: string;
};

/**
 * As partidas de onde esta pode continuar o tabuleiro, agrupadas pelo mapa em que estão —
 * a mais recente primeiro.
 *
 * O back não tem endpoint que liste as elegíveis: a lista sai das outras partidas da campanha
 * e do mapa anexado a cada uma. Só entram as que já começaram — uma partida que nunca começou
 * não gravou tabuleiro. Ter de fato um tabuleiro não dá para saber daqui; quando falta, o 422
 * do anexar diz.
 */
export function useInheritableBoards(
  token: string | null,
  campaignId: string | undefined,
  matchId: string | undefined,
  enabled: boolean,
): Record<string, BoardSource[]> {
  const { data: campaign } = useCampaignDetails(token, enabled ? campaignId : undefined);
  const candidates = enabled
    ? (campaign?.matches ?? []).filter((m) => m.uuid !== matchId && !!m.gameStartAt)
    : [];

  // Mesma chave de `useMatchMap`: divide o cache com a página da partida de origem.
  const attached = useQueries({
    queries: candidates.map((m) => ({
      queryKey: ["match-map", m.uuid, token],
      queryFn: () => mapsService.getMatchMap(token!, m.uuid),
      enabled: !!token,
      retry: 1,
    })),
  });

  const byMap: Record<string, BoardSource[]> = {};
  candidates.forEach((m, i) => {
    const mapUuid = attached[i]?.data?.mapUuid;
    if (!mapUuid) return;
    (byMap[mapUuid] ??= []).push({ matchUuid: m.uuid, title: m.title, startedAt: m.gameStartAt! });
  });
  for (const list of Object.values(byMap)) {
    list.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  }
  return byMap;
}
