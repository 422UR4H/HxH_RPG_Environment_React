import useDocumentTitle from "../hooks/useDocumentTitle";
import { Navigate, useParams } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { PageLoading, PageError, PageNotFound } from "../components/templates/PageState";
import { isApiError } from "../services/httpClient";
import GamePlayerPage from "./GamePlayerPage";
import GameMasterPage from "./GameMasterPage";

/**
 * A rota (Tarefas 12/13, spec §3.4): lê o papel uma vez e monta a página certa. Daí para
 * baixo nenhum componente recebe `isMaster` (I2) — as exceções declaradas são
 * `TacticalMapStage.fogDisabled` e `MatchCharactersSidebar` (R25). (O `WallActionSheet` de R23
 * saiu: a parede é alvo do compositor — `docs/dev/match/combate-parede-alvo.md`.)
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
  const { data: match, isPending, isError, error, refetch } = useMatchDetails(token, matchId);
  const { user } = useUser();

  const matchBack = {
    label: "Voltar para a campanha",
    to: `/campaigns/${campaignId}`,
  };

  useDocumentTitle("Mesa", match?.title);

  // Erro antes do carregando (ordem dos guards em src/pages/CLAUDE.md): query com erro nunca fica em "Carregando…".
  if (isError) {
    return isApiError(error, 404) ? (
      <PageNotFound title="Partida não encontrada" back={matchBack} />
    ) : (
      <PageError
        title="Não foi possível carregar a partida"
        onRetry={() => void refetch()}
        back={matchBack}
      />
    );
  }
  // Sem match/user não há como decidir o papel.
  if (isPending || !user) return <PageLoading label="Carregando partida…" />;
  if (!match) return <PageNotFound title="Partida não encontrada" back={matchBack} />;

  const isMaster = match.masterUuid === user.uuid;
  return isMaster
    ? <GameMasterPage token={token} campaignId={campaignId} matchId={matchId} />
    : <GamePlayerPage token={token} campaignId={campaignId} matchId={matchId} />;
}
