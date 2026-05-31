import { useState, useRef } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { useMatchEnrollments } from "../hooks/useMatchEnrollments";
import { useLobbyWs } from "../hooks/useLobbyWs";
import {
  LoadingContainer,
  ErrorContainer,
} from "../components/atoms/PageStates";
import ConfirmDialog from "../components/molecules/ConfirmDialog";
import DetailPageTemplate from "../components/templates/DetailPageTemplate";
import CharactersSidebar from "../components/organisms/CharactersSidebar";
import RulesSidebar from "../components/organisms/RulesSidebar";
import RuleSection from "../components/molecules/RuleSection";
import LobbyConnectionSidebarItem from "../features/match/LobbyConnectionSidebarItem";
import { colors, fonts } from "../styles/tokens";
import type { WsStatus } from "../hooks/useLobbyWs";

const ERROR_STATUSES: WsStatus[] = [
  "lobby_not_open",
  "kicked",
  "lobby_closed",
  "throttled",
  "error",
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

  const { data: match, isPending, isError } = useMatchDetails(token, matchId);
  const { data: enrollments = [], isPending: enrollmentsPending } =
    useMatchEnrollments(token, matchId, true);

  const isMaster = !!(match && user && match.masterUuid === user.uuid);
  const hasAccess =
    isMaster ||
    enrollments.some(
      (e) => e.player?.uuid === user?.uuid && e.status === "accepted",
    );
  const lobbyEnabled =
    !!token && !!matchId && !isPending && !enrollmentsPending && hasAccess;

  const { status, participants, sendStartMatch, sendKick, sendCancelLobby } =
    useLobbyWs({
      matchUuid: matchId ?? "",
      token: token ?? "",
      nickname: user?.nick ?? "",
      userUuid: user?.uuid,
      enabled: lobbyEnabled,
      onMatchStarted: () =>
        navigate(`/campaigns/${campaignId}/matches/${matchId}/game`),
      onKicked: () => setIsKicked(true),
    });

  if (!token) return <Navigate to="/" replace />;
  if (isPending || enrollmentsPending)
    return <LoadingContainer>Carregando lobby...</LoadingContainer>;
  if (isError || !match)
    return <ErrorContainer>Falha ao carregar a partida.</ErrorContainer>;
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
        return "Conectando ao lobby...";
      case "disconnected":
        return "Reconectando...";
      case "lobby_not_open":
        return "O lobby ainda não foi aberto pelo mestre.";
      case "throttled":
        return "Muitas tentativas de conexão. Recarregue a página para tentar novamente.";
      case "kicked":
        return "Você foi removido do lobby pelo mestre.";
      case "lobby_closed":
        return "O lobby foi encerrado pelo mestre.";
      case "error":
        return "Erro de conexão. Verifique sua internet.";
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
          <RulesSidebar>
            <RuleSection title="Configurações Gerais">
              As regras da partida seguem as definições da campanha.
            </RuleSection>
            <RuleSection title="Sistema de Combate">
              Configure o sistema de combate da partida.
            </RuleSection>
          </RulesSidebar>
        }
      >
        <LobbyHeader>
          <LobbyTitle>{match.title.toUpperCase()}</LobbyTitle>
          <LobbyStatusPill>LOBBY ABERTO</LobbyStatusPill>
        </LobbyHeader>

        <ConnectedCounter>
          {connectedCount}/{totalCount} conectados
        </ConnectedCounter>

        {wsStatusMessage && (
          <WsStatusBar $isError={ERROR_STATUSES.includes(status)}>
            {wsStatusMessage}
          </WsStatusBar>
        )}

        <ActionsList>
          {isMaster ? (
            <MasterActions>
              <StartButton onClick={sendStartMatch}>
                Iniciar Partida
              </StartButton>
              <CancelButton onClick={() => setShowCancelConfirm(true)}>
                Cancelar Lobby
              </CancelButton>
            </MasterActions>
          ) : (
            <WaitingMessage>
              Aguardando o mestre iniciar a partida...
            </WaitingMessage>
          )}
        </ActionsList>
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
  font-family: ${fonts.sans};
  font-size: 42px;
  font-weight: 900;
  color: ${colors.textPrimary};
  flex: 1;
  min-width: 0;
  overflow-wrap: break-word;
`;

const LobbyStatusPill = styled.span`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 4px 12px;
  border-radius: 20px;
  background-color: ${colors.statusOngoing};
  color: ${colors.textPrimary};
  flex-shrink: 0;
`;

const ConnectedCounter = styled.div`
  font-family: ${fonts.sans};
  font-size: 18px;
  color: ${colors.textMuted};
  margin-bottom: 16px;
`;

const WsStatusBar = styled.div<{ $isError: boolean }>`
  font-family: ${fonts.sans};
  font-size: 16px;
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  background-color: ${({ $isError }) =>
    $isError ? colors.errorBgSoft : colors.overlayMedium};
  color: ${({ $isError }) => ($isError ? colors.danger : colors.textMuted)};
  border: 1px solid
    ${({ $isError }) => ($isError ? colors.dangerDark : colors.borderDivider)};
`;

const ActionsList = styled.div`
  position: relative;
  padding-bottom: 112px;
`;

const MasterActions = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 20px;
`;

const BaseActionButton = styled.button`
  font-family: ${fonts.sans};
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
`;

const StartButton = styled(BaseActionButton)`
  background-color: ${colors.brandAccent};
  color: ${colors.textPrimary};
`;

const CancelButton = styled(BaseActionButton)`
  background-color: ${colors.dangerDark};
  color: ${colors.textPrimary};
`;

const WaitingMessage = styled.p`
  font-family: ${fonts.sans};
  font-size: 20px;
  color: ${colors.textMuted};
  font-style: italic;
  margin-top: 20px;
`;
