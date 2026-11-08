// Fim da partida na mesa (mestre e jogador): todos vão para a página da partida com `replace`,
// então a /game sai do histórico e "Voltar" nunca volta para a mesa (dono, spec §5).
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { matchPagePath } from "./endMatch";

export function useMatchEndedRedirect({
  token,
  campaignId,
  matchId,
  ended,
}: {
  token: string;
  campaignId?: string;
  matchId?: string;
  ended: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ended) return;
    // A partida em cache ainda não tem `gameEndAt`: sem rebuscar, a página mostraria
    // "EM ANDAMENTO" e o botão de voltar para a mesa.
    void queryClient.invalidateQueries({ queryKey: ["matchDetails", token, matchId] });
    navigate(matchPagePath(campaignId, matchId), { replace: true, state: { endedByMaster: true } });
  }, [ended, token, campaignId, matchId, navigate, queryClient]);
}
