import { useState, useRef, useEffect } from "react";
import { Navigate, useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { useMatchEnrollments } from "../hooks/useMatchEnrollments";
import { useMatchParticipants } from "../hooks/useMatchParticipants";
import { useAcceptEnrollment } from "../hooks/useAcceptEnrollment";
import { useRejectEnrollment } from "../hooks/useRejectEnrollment";
import { useEnrollCharacterSheet } from "../hooks/useEnrollCharacterSheet";
import { useDeleteMatch } from "../hooks/useDeleteMatch";
import { useMaps } from "../hooks/useMaps";
import { useMatchMap } from "../hooks/useMatchMap";
import { useAttachMatchMap } from "../hooks/useAttachMatchMap";
import { useDetachMatchMap } from "../hooks/useDetachMatchMap";
import PageTabNav from "../components/organisms/PageTabNav";
import MapCard from "../components/molecules/MapCard";
import MatchCharactersSidebar from "../features/match/MatchCharactersSidebar";
import BottomActions from "../components/molecules/BottomActions";
import ExpandableText from "../components/molecules/ExpandableText";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";
import ConfirmDialog from "../components/molecules/ConfirmDialog";
import DetailPageTemplate from "../components/templates/DetailPageTemplate";
import RulesSidebar from "../components/organisms/RulesSidebar";
import RuleSection from "../components/molecules/RuleSection";
import { formatDateBR, formatDateTimeBR } from "../utils/date";
import type { MatchStatus } from "./MatchPage.styles";
import {
  MatchHeader,
  MatchTitle,
  DateSection,
  StatusPill,
  DateLabel,
  DateValueWithTooltip,
  StoryDate,
  MatchBriefDescription,
  MatchFinalDescription,
  ActionsList,
  LobbyNotOpenBanner,
  ConfirmOverlay,
  StyledLobbyDialog,
  ConfirmText,
  ConfirmButtons,
  DialogCancelButton,
  DialogLobbyButton,
  MapsGrid,
  MapsEmptyText,
  MapsPlaceholder,
  MapCardWrapper,
  MapAttachRow,
  AttachedBadge,
  AttachButton,
  DetachButton,
} from "./MatchPage.styles";

function getMatchStatus(match: { gameStartAt?: string; storyEndAt?: string }): MatchStatus {
  if (!match.gameStartAt) return "scheduled";
  if (!match.storyEndAt) return "ongoing";
  return "ended";
}

export default function MatchPage() {
  const { campaignId, matchId } = useParams<{
    campaignId: string;
    matchId: string;
  }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { sheetId?: string; lobbyNotOpen?: boolean } | null;
  const lobbyNotOpen = locationState?.lobbyNotOpen === true;

  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [showLobbyConfirm, setShowLobbyConfirm] = useState(false);
  const [showEnrollConfirm, setShowEnrollConfirm] = useState(false);
  const [descriptionSignal, setDescriptionSignal] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const { data: match, isPending, isError } = useMatchDetails(token, matchId);

  const matchStarted = !!match?.gameStartAt;

  const { data: enrollments = [] } = useMatchEnrollments(
    token,
    matchId,
    !matchStarted
  );
  const { data: participants = [] } = useMatchParticipants(
    token,
    matchId,
    matchStarted
  );

  const { mutate: acceptEnrollment } = useAcceptEnrollment(token, matchId);
  const { mutate: rejectEnrollment } = useRejectEnrollment(token, matchId);
  const {
    mutate: enrollSheet,
    isPending: enrollPending,
    isSuccess: isEnrolled,
  } = useEnrollCharacterSheet(token, matchId);
  const { mutate: deleteMatch } = useDeleteMatch(token, matchId);

  const { data: matchMap } = useMatchMap(token, matchId);
  const { mutate: attachMap, isPending: isAttaching } = useAttachMatchMap(token, matchId);
  const { mutate: detachMap, isPending: isDetaching } = useDetachMatchMap(token, matchId);

  const sheetId =
    locationState?.sheetId ??
    enrollments.find((e) => e.player?.uuid === user?.uuid && e.status === "accepted")
      ?.characterSheet.uuid;

  const isMaster = !!match && match.masterUuid === user?.uuid;

  const [searchParams, setSearchParams] = useSearchParams();

  const matchEnded = !!match?.storyEndAt;

  const availableTabs =
    isMaster || matchEnded
      ? [
          { id: "events", label: "Eventos" },
          { id: "maps", label: "Mapas" },
        ]
      : [{ id: "events", label: "Eventos" }];

  const rawTab = searchParams.get("tab");
  const activeTab = availableTabs.some((t) => t.id === rawTab)
    ? rawTab!
    : "events";

  const { data: maps, isPending: mapsPending } = useMaps(
    token,
    activeTab === "maps" && isMaster ? campaignId : undefined,
  );

  useEffect(() => {
    if (!match) return;
    const tab = searchParams.get("tab");
    if (tab && !availableTabs.some((t) => t.id === tab)) {
      setSearchParams({ tab: "events" }, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match]);

  if (!token) return <Navigate to="/" replace />;

  const handleAccept = (enrollmentId: string) => {
    setActionLoading((prev) => ({ ...prev, [enrollmentId]: true }));
    acceptEnrollment(enrollmentId, {
      onSettled: () =>
        setActionLoading((prev) => ({ ...prev, [enrollmentId]: false })),
    });
  };

  const handleReject = (enrollmentId: string) => {
    setActionLoading((prev) => ({ ...prev, [enrollmentId]: true }));
    rejectEnrollment(enrollmentId, {
      onSettled: () =>
        setActionLoading((prev) => ({ ...prev, [enrollmentId]: false })),
    });
  };

  const handleEdit = () => {
    navigate(`/campaigns/${campaignId}/matches/${matchId}/edit`);
  };

  const handleDelete = () => {
    deleteMatch(undefined, { onSuccess: () => navigate(-1) });
  };

  const handleLobbyConfirm = () => {
    navigate(`/campaigns/${campaignId}/matches/${matchId}/lobby`);
  };

  const handleEnroll = () => {
    if (!sheetId || !match) return;
    enrollSheet({ sheetUuid: sheetId, matchUuid: match.uuid });
  };

  if (isPending)
    return <LoadingContainer>Carregando partida...</LoadingContainer>;
  if (isError) return <ErrorContainer>Falha ao carregar detalhes da partida.</ErrorContainer>;
  if (!match) return <ErrorContainer>Partida não encontrada</ErrorContainer>;

  const status = getMatchStatus(match);

  const statusLabels: Record<MatchStatus, string> = {
    scheduled: "AGENDADA",
    ongoing: "EM ANDAMENTO",
    ended: "ENCERRADA",
  };

  const canEnterLobby =
    !!sheetId &&
    !isMaster &&
    !match.gameStartAt &&
    enrollments.some(
      (e) => e.characterSheet.uuid === sheetId && e.status === "accepted"
    );

  const canEnroll =
    !isMaster &&
    !match.gameStartAt &&
    !!sheetId &&
    !isEnrolled &&
    !enrollments.some((e) => e.characterSheet.uuid === sheetId);

  return (
    <>
      <DetailPageTemplate
        mainRef={mainContentRef}
        leftSidebar={
          <MatchCharactersSidebar
            gameStarted={!!match.gameStartAt}
            enrollments={enrollments}
            participants={participants}
            isMaster={isMaster}
            actionLoading={actionLoading}
            onAccept={handleAccept}
            onReject={handleReject}
            onSelectCharacterSheet={(sheetUuid) =>
              navigate(`/charactersheet/${sheetUuid}`)
            }
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
            <RuleSection title="Progressão de Personagens">
              Define como os personagens evoluem durante a partida.
            </RuleSection>
            <RuleSection title="Nen & Habilidades">
              Configure as regras para uso e desenvolvimento de Nen.
            </RuleSection>
          </RulesSidebar>
        }
      >
        <MatchHeader>
          <MatchTitle>{match.title.toUpperCase()}</MatchTitle>
          <DateSection>
            <StatusPill $status={status}>{statusLabels[status]}</StatusPill>
            {status === "scheduled" ? (
              <DateLabel>
                Agendada para:{" "}
                <span>{formatDateTimeBR(match.gameScheduledAt)}</span>
              </DateLabel>
            ) : (
              <DateLabel>
                Iniciada em:{" "}
                <DateValueWithTooltip
                  title={`Agendada para: ${formatDateTimeBR(match.gameScheduledAt)}`}
                >
                  {formatDateTimeBR(match.gameStartAt!)}
                </DateValueWithTooltip>
              </DateLabel>
            )}
          </DateSection>
        </MatchHeader>

        <StoryDate>Início na história: {formatDateBR(match.storyStartAt)}</StoryDate>

        <MatchBriefDescription>
          {match.briefInitialDescription}
        </MatchBriefDescription>

        <ExpandableText onToggle={() => setDescriptionSignal((s) => !s)}>
          {match.description}
        </ExpandableText>

        {match.briefFinalDescription && (
          <MatchFinalDescription>
            {match.briefFinalDescription}
          </MatchFinalDescription>
        )}

        {match.storyEndAt && (
          <StoryDate>Fim na história: {formatDateBR(match.storyEndAt)}</StoryDate>
        )}

        {lobbyNotOpen && (
          <LobbyNotOpenBanner>
            O lobby ainda não foi aberto pelo mestre.
          </LobbyNotOpenBanner>
        )}

        <PageTabNav tabs={availableTabs} />

        {activeTab === "events" && (
          <ActionsList>
            {(isMaster && !match.gameStartAt) || canEnterLobby || canEnroll ? (
              <BottomActions
                containerRef={mainContentRef}
                contentChangeSignal={descriptionSignal}
                manage={
                  isMaster && !match.gameStartAt
                    ? {
                        isFree: true,
                        onEdit: handleEdit,
                        onDelete: handleDelete,
                        confirmMessage:
                          "Tem certeza que deseja excluir esta partida? Esta ação não pode ser desfeita.",
                      }
                    : undefined
                }
                primaryButton={
                  isMaster && !match.gameStartAt
                    ? { label: "Abrir Lobby", onClick: () => setShowLobbyConfirm(true) }
                    : canEnterLobby
                    ? {
                        label: "Entrar no Lobby",
                        onClick: () =>
                          navigate(
                            `/campaigns/${campaignId}/matches/${matchId}/lobby`
                          ),
                      }
                    : canEnroll
                    ? {
                        label: enrollPending ? "Inscrevendo..." : "Inscrever-se",
                        onClick: enrollPending ? () => {} : () => setShowEnrollConfirm(true),
                      }
                    : undefined
                }
              />
            ) : null}
          </ActionsList>
        )}

        {activeTab === "maps" && isMaster && (
          <MapsGrid>
            {mapsPending ? (
              <MapsEmptyText>Carregando mapas...</MapsEmptyText>
            ) : (maps ?? []).length === 0 ? (
              <MapsEmptyText>Nenhum mapa criado ainda.</MapsEmptyText>
            ) : (
              (maps ?? []).map((map) => {
                const isAttached = matchMap?.mapUuid === map.id;
                return (
                  <MapCardWrapper key={map.id}>
                    <MapCard
                      map={map}
                      onClick={() =>
                        navigate(`/campaigns/${campaignId}/maps/${map.id}/edit`)
                      }
                    />
                    {!matchStarted && (
                      <MapAttachRow>
                        {isAttached ? (
                          <>
                            <AttachedBadge>Anexado</AttachedBadge>
                            <DetachButton
                              onClick={() => detachMap()}
                              disabled={isDetaching}
                            >
                              {isDetaching ? "Desanexando..." : "Desanexar"}
                            </DetachButton>
                          </>
                        ) : (
                          <AttachButton
                            onClick={() => attachMap(map.id)}
                            disabled={isAttaching}
                          >
                            {isAttaching ? "Anexando..." : "Anexar"}
                          </AttachButton>
                        )}
                      </MapAttachRow>
                    )}
                  </MapCardWrapper>
                );
              })
            )}
          </MapsGrid>
        )}

        {activeTab === "maps" && !isMaster && matchEnded && (
          <MapsPlaceholder>
            Os mapas jogados nesta partida estarão disponíveis em breve.
          </MapsPlaceholder>
        )}
      </DetailPageTemplate>

      {showLobbyConfirm && (
        <ConfirmOverlay onClick={() => setShowLobbyConfirm(false)}>
          <StyledLobbyDialog onClick={(e) => e.stopPropagation()}>
            <ConfirmText>
              Tem certeza que deseja abrir o lobby desta partida? Os jogadores
              aceitos poderão entrar.
            </ConfirmText>
            <ConfirmButtons>
              <DialogCancelButton onClick={() => setShowLobbyConfirm(false)}>
                Cancelar
              </DialogCancelButton>
              <DialogLobbyButton onClick={handleLobbyConfirm}>
                Abrir Lobby
              </DialogLobbyButton>
            </ConfirmButtons>
          </StyledLobbyDialog>
        </ConfirmOverlay>
      )}

      {showEnrollConfirm && (
        <ConfirmDialog
          message="Tem certeza que deseja se inscrever nesta partida? Esta ação não pode ser desfeita."
          confirmLabel="Inscrever-se"
          onConfirm={() => {
            setShowEnrollConfirm(false);
            handleEnroll();
          }}
          onCancel={() => setShowEnrollConfirm(false)}
        />
      )}
    </>
  );
}
