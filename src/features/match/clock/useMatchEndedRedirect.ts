// Fim da partida na mesa (mestre e jogador): todos vão para a página da partida com `replace`,
// então a /game sai do histórico e "Voltar" nunca volta para a mesa (dono, spec §5).
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { matchPagePath } from "./endMatch";
import type { MatchEnded } from "./clockMessages";
import type { Match } from "../../../types/match";

export function useMatchEndedRedirect({
  token,
  campaignId,
  matchId,
  ended,
  matchEnded,
}: {
  token: string;
  campaignId?: string;
  matchId?: string;
  ended: boolean;
  /** Payload do `match_ended`; ausente quando só o status/`match_already_ended` indicou o fim. */
  matchEnded?: MatchEnded | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ended) return;
    // Grava o fim no cache já: a página da partida renderiza do cache e, sem isso, mostraria
    // "EM ANDAMENTO" por 1–2 s até a rebusca. `storyAt` é lido por fatiamento, nunca por Date.
    const storyAt = matchEnded?.storyAt;
    queryClient.setQueryData<Match>(["matchDetails", token, matchId], (old) =>
      old
        ? {
            ...old,
            gameEndAt: matchEnded?.gameEndAt ?? new Date().toISOString(),
            ...(storyAt ? { storyEndAt: storyAt.slice(0, 10), storyEndTime: storyAt.slice(11, 19) } : {}),
          }
        : old,
    );
    // A partida em cache ainda não tem `gameEndAt`: sem rebuscar, a página mostraria
    // "EM ANDAMENTO" e o botão de voltar para a mesa. Só marca como velha (`refetchType:
    // "none"`): rebuscar já, com a /game montada, faria a mesa ver `gameEndAt` e trocar a
    // navegação por um <Navigate> sem o aviso. A página da partida rebusca ao montar.
    void queryClient.invalidateQueries({ queryKey: ["matchDetails", token, matchId], refetchType: "none" });
    navigate(matchPagePath(campaignId, matchId), { replace: true, state: { endedByMaster: true } });
  }, [ended, matchEnded, token, campaignId, matchId, navigate, queryClient]);
}
