import { Navigate, useParams } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { LoadingContainer } from "../components/atoms/PageStates";
import GamePlayerPage from "./GamePlayerPage";

/**
 * A rota (Tarefa 12, spec §3.4): lê o papel uma vez e monta a página certa. Daí para baixo
 * nenhum componente recebe `isMaster` (I2) — a exceção declarada é `WallActionSheet` (R23).
 *
 * A rota não muda de caminho — continua `/campaigns/:campaignId/matches/:matchId/game`.
 */
export default function GamePage() {
  const { token } = useToken();
  const { campaignId, matchId } = useParams<{ campaignId: string; matchId: string }>();

  if (!token) return <Navigate to="/" replace />;

  return <GameRoute token={token} campaignId={campaignId} matchId={matchId} />;
}

function GameRoute({
  token,
  campaignId,
  matchId,
}: {
  token: string;
  campaignId?: string;
  matchId?: string;
}) {
  const { data: match, isPending } = useMatchDetails(token, matchId);
  const { user } = useUser();

  // Loading guard (src/pages/CLAUDE.md): sem match/user não há como decidir o papel.
  if (isPending || !match || !user) {
    return <LoadingContainer>Carregando partida...</LoadingContainer>;
  }

  // TODO(task-13): match.masterUuid === user.uuid ? <GameMasterPage .../> : <GamePlayerPage .../>
  // A Tarefa 13 cria GameMasterPage e remove este TODO — até lá os dois papéis veem a
  // tela do jogador (plano-autorizado, addendum R11).
  return <GamePlayerPage token={token} campaignId={campaignId} matchId={matchId} />;
}
