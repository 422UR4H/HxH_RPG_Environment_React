import { Navigate, useParams } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { LoadingContainer } from "../components/atoms/PageStates";
import GamePlayerPage from "./GamePlayerPage";
import GameMasterPage from "./GameMasterPage";

/**
 * A rota (Tarefas 12/13, spec §3.4): lê o papel uma vez e monta a página certa. Daí para
 * baixo nenhum componente recebe `isMaster` (I2) — as exceções declaradas são
 * `WallActionSheet` (R23), `TacticalMapStage.fogDisabled` e `MatchCharactersSidebar` (R25).
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

  const isMaster = match.masterUuid === user.uuid;
  return isMaster
    ? <GameMasterPage token={token} campaignId={campaignId} matchId={matchId} />
    : <GamePlayerPage token={token} campaignId={campaignId} matchId={matchId} />;
}
