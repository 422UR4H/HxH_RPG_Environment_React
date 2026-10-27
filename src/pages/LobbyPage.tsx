import { useState, useRef, useCallback, useMemo } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import Badge from "../components/ions/Badge";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { useMatchEnrollments } from "../hooks/useMatchEnrollments";
import { useLobbyWs } from "../hooks/useLobbyWs";
import { useMatchMap } from "../hooks/useMatchMap";
import { useMap } from "../hooks/useMap";
import TacticalMapPlacer from "../features/tactical-map/TacticalMapPlacer";
import { tableMap } from "../features/match/combat/tableMap";
import { BoardWaitNotice } from "../features/match/combat/BoardWaitNotice";
import { PageLoading, PageError, PageNotFound } from "../components/templates/PageState";
import { isApiError } from "../services/httpClient";
import { ActionsList } from "../components/atoms/ActionsList";
import ConfirmDialog from "../components/molecules/ConfirmDialog";
import DetailPageTemplate from "../components/templates/DetailPageTemplate";
import CharactersSidebar from "../components/organisms/CharactersSidebar";
import UpcomingRulesSidebar from "../components/organisms/UpcomingRulesSidebar";
import LobbyConnectionSidebarItem from "../features/match/LobbyConnectionSidebarItem";
import { colors, alpha } from "../styles/tokens";
import { GAME_SERVER_WAKING, GAME_SERVER_UNREACHABLE } from "../services/serverWake";
import type { WsStatus, LobbyFullState } from "../hooks/useLobbyWs";
import type { BgImage, GridShape, Piece, SlotCoord, WallSegment } from "../types/tacticalMap";

const ERROR_STATUSES: WsStatus[] = [
  "unreachable",
  "lobby_not_open",
  "kicked",
  "lobby_closed",
  "replaced",
];

export default function LobbyPage() {
  const { campaignId, matchId } = useParams<{
    campaignId: string;
    matchId: string;
  }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const mainContentRef = useRef<HTMLDivElement>(null);

  const [isKicked, setIsKicked] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const {
    data: match,
    isPending,
    isError,
    error: matchError,
    refetch: refetchMatch,
  } = useMatchDetails(token, matchId);
  const {
    data: enrollments = [],
    isPending: enrollmentsPending,
    isError: enrollmentsError,
    refetch: refetchEnrollments,
  } = useMatchEnrollments(token, matchId, true);

  const isMaster = !!(match && user && match.masterUuid === user.uuid);
  const hasAccess =
    isMaster ||
    enrollments.some(
      (e) => e.player?.uuid === user?.uuid && e.status === "accepted",
    );
  const lobbyEnabled =
    !!token && !!matchId && !isPending && !enrollmentsPending && hasAccess;

  const { data: matchMap } = useMatchMap(token, matchId);
  const { data: fullMap } = useMap(token, matchMap?.mapUuid);
  const attachedMapId = matchMap?.mapUuid;

  // O lobby desenha o TABULEIRO da partida, para os dois papéis: peças (do `map_full_state` e
  // das mensagens de peça), paredes, grade e fundo vêm do servidor. Do mapa da campanha (REST)
  // não vem geometria nenhuma — só o que não é desenho (o nome).
  const [lobbyPieces, setLobbyPieces] = useState<Piece[]>([]);
  const [boardWalls, setBoardWalls] = useState<WallSegment[]>([]);
  const [boardGrid, setBoardGrid] = useState<GridShape | undefined>(undefined);
  const [boardBg, setBoardBg] = useState<BgImage | undefined>(undefined);
  // `undefined` até o tabuleiro chegar — a mesma regra da mesa (`tableMap`).
  // O tabuleiro que chegou sempre desenha, mesmo que o REST do mapa tenha falhado.
  const lobbyMap = useMemo(
    () => tableMap(fullMap, boardGrid, boardBg, attachedMapId),
    [fullMap, boardGrid, boardBg, attachedMapId],
  );
  // `board_unavailable`: a sala não carregou o tabuleiro; vale até o próximo `map_full_state`.
  const [boardUnavailable, setBoardUnavailable] = useState(false);

  const handleWsPieceMoved = useCallback(
    (pieceId: string, slot: SlotCoord, characterId?: string, visible?: boolean) => {
      setLobbyPieces((prev) => {
        const exists = prev.some((p) => p.id === pieceId);
        if (exists) {
          return prev.map((p) =>
            p.id === pieceId ? { ...p, coord: { ...p.coord, slot } } : p,
          );
        }
        if (characterId) {
          return [
            ...prev,
            { id: pieceId, characterId, coord: { slot, z: 0 }, visible: visible ?? true },
          ];
        }
        return prev;
      });
    },
    [],
  );

  const handleWsPieceRemoved = useCallback((pieceId: string) => {
    setLobbyPieces((prev) => prev.filter((p) => p.id !== pieceId));
  }, []);

  // Desde B14 o servidor é dono do tabuleiro do lobby também para o mestre: o que ele manda
  // substitui o que estiver na tela.
  const handleWsFullState = useCallback(({ pieces, walls, grid, bg }: LobbyFullState) => {
    setBoardUnavailable(false);
    setBoardWalls(walls);
    setBoardGrid(grid);
    setBoardBg(bg);
    setLobbyPieces(
      pieces.map((p) => ({
        id: p.pieceId,
        characterId: p.characterId,
        coord: { slot: p.slot, z: 0 },
        visible: p.visible ?? true,
      })),
    );
  }, []);

  const { status, participants, sendStartMatch, sendKick, sendCancelLobby, sendPieceMoved, sendPieceRemoved, reconnect } =
    useLobbyWs({
      matchUuid: matchId ?? "",
      token: token ?? "",
      nickname: user?.nick ?? "",
      userUuid: user?.uuid,
      enabled: lobbyEnabled,
      onMatchStarted: () =>
        navigate(`/campaigns/${campaignId}/matches/${matchId}/game`),
      onKicked: () => setIsKicked(true),
      onPieceMoved: handleWsPieceMoved,
      onPieceRemoved: handleWsPieceRemoved,
      onFullState: handleWsFullState,
      onBoardUnavailable: () => setBoardUnavailable(true),
    });

  // All character sheet UUIDs the current player is enrolled with (accepted enrollments).
  const playerCharacterIds = useMemo(() => {
    if (isMaster) return undefined;
    return (enrollments ?? [])
      .filter((e) => e.player?.uuid === user?.uuid && e.status === "accepted")
      .map((e) => e.characterSheet?.uuid)
      .filter((id): id is string => !!id);
  }, [isMaster, enrollments, user?.uuid]);

  // Piece IDs on the board that belong to the current player (draggable by them).
  const draggablePieceIds: Set<string> | undefined = useMemo(() => {
    if (isMaster) return undefined;
    const playerCharIdSet = new Set(playerCharacterIds ?? []);
    return new Set(
      lobbyPieces.filter((p) => playerCharIdSet.has(p.characterId)).map((p) => p.id),
    );
  }, [isMaster, lobbyPieces, playerCharacterIds]);

  useDocumentTitle("Lobby", match?.title);

  if (!token) return <Navigate to="/" replace />;
  const matchBack = {
    label: "Voltar para a partida",
    to: `/campaigns/${campaignId}/matches/${matchId}`,
  };
  if (isError && isApiError(matchError, 404))
    return <PageNotFound title="Partida não encontrada" back={matchBack} />;
  if (isError || enrollmentsError)
    return (
      <PageError
        title="Não foi possível carregar o lobby"
        onRetry={() => {
          if (isError) void refetchMatch();
          if (enrollmentsError) void refetchEnrollments();
        }}
        back={matchBack}
      />
    );
  if (isPending || enrollmentsPending) return <PageLoading label="Carregando lobby…" />;
  if (!match) return <PageNotFound title="Partida não encontrada" back={matchBack} />;
  if (!hasAccess) {
    return (
      <Navigate to={`/campaigns/${campaignId}/matches/${matchId}`} replace />
    );
  }
  if (status === "lobby_not_open" && !isMaster) {
    return (
      <Navigate
        to={`/campaigns/${campaignId}/matches/${matchId}`}
        replace
        state={{ lobbyNotOpen: true }}
      />
    );
  }

  const acceptedEnrollments = enrollments.filter(
    (e) => e.status === "accepted",
  );
  const lobbyEntries = acceptedEnrollments.map((enrollment) => ({
    enrollment,
    isOnline: participants.some((p) => p.uuid === enrollment.player?.uuid),
  }));

  const connectedCount = lobbyEntries.filter((e) => e.isOnline).length;
  const totalCount = lobbyEntries.length;

  const wsStatusMessage = (() => {
    if (isKicked) return "Você foi removido do lobby pelo mestre.";
    switch (status) {
      case "connecting":
        return "Conectando ao lobby…";
      case "waking":
        return GAME_SERVER_WAKING;
      case "unreachable":
        return GAME_SERVER_UNREACHABLE;
      case "lobby_not_open":
        return "O lobby ainda não foi aberto pelo mestre.";
      case "kicked":
        return "Você foi removido do lobby pelo mestre.";
      case "lobby_closed":
        return "O lobby foi encerrado pelo mestre.";
      case "replaced":
        return "Este lobby foi aberto em outra aba ou dispositivo com a sua conta. Recarregue a página para usá-lo aqui.";
      default:
        return null;
    }
  })();

  const handleCancelConfirm = () => {
    setShowCancelConfirm(false);
    sendCancelLobby();
    navigate(-1);
  };

  return (
    <>
      <DetailPageTemplate
        mainRef={mainContentRef}
        hideBack
        leftSidebar={
          <CharactersSidebar
            title="JOGADORES"
            items={lobbyEntries}
            renderItem={({ enrollment, isOnline }) => (
              <LobbyConnectionSidebarItem
                key={enrollment.uuid}
                enrollment={enrollment}
                isOnline={isOnline}
                isMaster={isMaster}
                onKick={sendKick}
                onClick={() => {}}
              />
            )}
          />
        }
        rightSidebar={
          <UpcomingRulesSidebar scope="match" />
        }
      >
        <LobbyHeader>
          <LobbyTitle>{match.title.toUpperCase()}</LobbyTitle>
          <LobbyStatusBadge tone="ongoing">LOBBY ABERTO</LobbyStatusBadge>
        </LobbyHeader>

        <ConnectedCounter>
          {connectedCount}/{totalCount} conectados
        </ConnectedCounter>

        {wsStatusMessage && (
          <WsStatusBar $isError={ERROR_STATUSES.includes(status)}>
            <span>{wsStatusMessage}</span>
            {status === "unreachable" && !isKicked && (
              <RetryButton type="button" onClick={reconnect}>
                Tentar de novo
              </RetryButton>
            )}
          </WsStatusBar>
        )}

        <ActionsList>
          {isMaster ? (
            <MasterActions>
              <StartButton onClick={sendStartMatch} disabled={status !== "connected"}>
                Iniciar Partida
              </StartButton>
              <CancelButton
                onClick={() => setShowCancelConfirm(true)}
                disabled={status !== "connected"}
              >
                Cancelar Lobby
              </CancelButton>
            </MasterActions>
          ) : (
            <WaitingMessage>
              Aguardando o mestre iniciar a partida…
            </WaitingMessage>
          )}
        </ActionsList>

        {attachedMapId && !lobbyMap && (
          <LobbyMapWaiting>
            <BoardWaitNotice boardUnavailable={boardUnavailable} status={status} />
          </LobbyMapWaiting>
        )}
        {lobbyMap && (
          <LobbyMapSection>
            <TacticalMapPlacer
              map={{ ...lobbyMap, walls: boardWalls }}
              campaignId={campaignId!}
              pieces={lobbyPieces}
              onPiecesChange={setLobbyPieces}
              sendPieceMoved={sendPieceMoved}
              sendPieceRemoved={sendPieceRemoved}
              draggablePieceIds={draggablePieceIds}
              playerCharacterIds={playerCharacterIds}
            />
          </LobbyMapSection>
        )}
      </DetailPageTemplate>

      {showCancelConfirm && (
        <ConfirmDialog
          message="Tem certeza que deseja cancelar o lobby? Os jogadores serão removidos."
          confirmLabel="Cancelar Lobby"
          confirmVariant="danger"
          onConfirm={handleCancelConfirm}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}
    </>
  );
}

const LobbyHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 750px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const LobbyTitle = styled.h1`
  font-size: 42px;
  font-weight: 900;
  color: ${colors.textPrimary};
  flex: 1;
  min-width: 0;
  overflow-wrap: break-word;
`;


const ConnectedCounter = styled.div`
  font-size: 18px;
  color: ${colors.textMuted};
  margin-bottom: 16px;
`;

const WsStatusBar = styled.div<{ $isError: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 16px;
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  background-color: ${({ $isError }) =>
    $isError ? alpha(colors.feedbackDanger, 0.1) : colors.overlayMedium};
  color: ${({ $isError }) => ($isError ? colors.feedbackDangerText : colors.textMuted)};
  border: 1px solid
    ${({ $isError }) => ($isError ? colors.feedbackDanger : colors.borderDivider)};
`;

const RetryButton = styled.button`
  font-size: 14px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid ${colors.feedbackDanger};
  background: transparent;
  color: ${colors.feedbackDangerText};
  cursor: pointer;

  &:hover {
    filter: brightness(1.2);
  }
`;

const MasterActions = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 20px;
`;

const BaseActionButton = styled.button`
  font-size: 20px;
  font-weight: 600;
  padding: 14px 32px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
  }
  &:active {
    transform: scale(0.98);
  }
  &:disabled {
    background: ${colors.surfaceDisabled};
    color: ${colors.textDisabledOnDark};
    cursor: not-allowed;
    filter: none;
    transform: none;
  }
`;

const StartButton = styled(BaseActionButton)`
  background-color: ${colors.brandAccent};
  color: ${colors.textPrimary};
`;

const CancelButton = styled(BaseActionButton)`
  background-color: ${colors.feedbackDanger};
  color: ${colors.textPrimary};
`;

const WaitingMessage = styled.p`
  font-size: 20px;
  color: ${colors.textMuted};
  font-style: italic;
  margin-top: 20px;
`;

const LobbyMapSection = styled.div`
  width: 100%;
  height: min(60vh, 500px);
  margin-top: 16px;
  margin-bottom: 32px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${colors.borderInput};
`;

// O aviso de espera é absoluto (o mesmo da mesa): precisa de um bloco posicionado.
const LobbyMapWaiting = styled(LobbyMapSection)`
  position: relative;
`;

const LobbyStatusBadge = styled(Badge)`
  flex-shrink: 0;
`;
