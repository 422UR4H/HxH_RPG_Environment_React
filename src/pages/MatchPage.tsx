import { useState, useRef } from "react";
import { Navigate, useParams, useNavigate, useLocation } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { useMatchEnrollments } from "../hooks/useMatchEnrollments";
import { useMatchParticipants } from "../hooks/useMatchParticipants";
import { useAcceptEnrollment } from "../hooks/useAcceptEnrollment";
import { useRejectEnrollment } from "../hooks/useRejectEnrollment";
import { useEnrollCharacterSheet } from "../hooks/useEnrollCharacterSheet";
import type { CharacterPrivateSummary } from "../types/characterSheet";
import styled from "styled-components";
import EnrollmentSidebarItem from "../features/match/EnrollmentSidebarItem";
import CharacterSidebarItem from "../components/molecules/CharacterSidebarItem";
import AdaptiveActionButton from "../components/molecules/AdaptiveActionButton";
import ExpandableText from "../components/molecules/ExpandableText";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";
import ConfirmDialog from "../components/molecules/ConfirmDialog";
import DetailPageTemplate from "../components/templates/DetailPageTemplate";
import CharactersSidebar from "../components/organisms/CharactersSidebar";
import RulesSidebar from "../components/organisms/RulesSidebar";
import RuleSection from "../components/molecules/RuleSection";

type MatchStatus = "scheduled" | "ongoing" | "ended";

function getMatchStatus(match: { gameStartAt?: string; storyEndAt?: string }): MatchStatus {
  if (!match.gameStartAt) return "scheduled";
  if (!match.storyEndAt) return "ongoing";
  return "ended";
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(iso: string): string {
  const [datePart, timePart] = iso.split("T");
  const [year, month, day] = datePart.split("-");
  const time = timePart?.substring(0, 5);
  return `${day}/${month}/${year}${time ? ` às ${time}` : ""}`;
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
  const locationState = location.state as { sheetId?: string } | null;
  const sheetId = locationState?.sheetId;

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

  if (!token) return <Navigate to="/" replace />;

  const isMaster = !!match && match.masterUuid === user?.uuid;

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
          !match.gameStartAt ? (
            <CharactersSidebar
              items={enrollments}
              renderItem={(enrollment) => (
                <EnrollmentSidebarItem
                  key={enrollment.uuid}
                  enrollment={enrollment}
                  isMaster={isMaster}
                  isLoading={!!actionLoading[enrollment.uuid]}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onClick={() =>
                    navigate(`/charactersheet/${enrollment.characterSheet.uuid}`)
                  }
                />
              )}
            />
          ) : (
            <CharactersSidebar
              items={participants}
              renderItem={(participant) => {
                const priv = participant.characterSheet.private;
                if (!priv) {
                  return (
                    <BasicParticipantItem key={participant.uuid}>
                      <span>{participant.characterSheet.nickName}</span>
                      {participant.leftAt && <LeftBadge>Saiu</LeftBadge>}
                    </BasicParticipantItem>
                  );
                }
                const character = {
                  ...participant.characterSheet,
                  ...priv,
                  isPending: false,
                } as CharacterPrivateSummary & { isPending?: boolean };
                return (
                  <CharacterSidebarItem
                    key={participant.uuid}
                    character={character}
                    isMaster={isMaster}
                    hasLeft={!!participant.leftAt}
                    onClick={() =>
                      navigate(`/charactersheet/${participant.characterSheet.uuid}`)
                    }
                  />
                );
              }}
            />
          )
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
                <span>{formatDateTime(match.gameScheduledAt)}</span>
              </DateLabel>
            ) : (
              <DateLabel>
                Iniciada em:{" "}
                <DateValueWithTooltip
                  title={`Agendada para: ${formatDateTime(match.gameScheduledAt)}`}
                >
                  {formatDateTime(match.gameStartAt!)}
                </DateValueWithTooltip>
              </DateLabel>
            )}
          </DateSection>
        </MatchHeader>

        <StoryDate>Início na história: {formatDate(match.storyStartAt)}</StoryDate>

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
          <StoryDate>Fim na história: {formatDate(match.storyEndAt)}</StoryDate>
        )}

        <ActionsList>
          {isMaster && !match.gameStartAt && (
            <AdaptiveActionButton
              label="Abrir Lobby"
              type="match"
              onClick={() => setShowLobbyConfirm(true)}
              containerRef={mainContentRef}
              contentChangeSignal={descriptionSignal}
            />
          )}

          {canEnroll && (
            <AdaptiveActionButton
              label={enrollPending ? "Inscrevendo..." : "Inscrever-se"}
              type="match"
              onClick={enrollPending ? () => {} : () => setShowEnrollConfirm(true)}
              containerRef={mainContentRef}
              contentChangeSignal={descriptionSignal}
            />
          )}
        </ActionsList>
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

const BasicParticipantItem = styled.div`
  background-color: #333;
  border-radius: 8px;
  padding: 15px;
  border-left: 4px solid #ffa216;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: "Oswald", sans-serif;
  font-size: 18px;
  font-weight: bold;
  color: white;
`;

const LeftBadge = styled.span`
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: bold;
  background-color: #555;
  color: #ccc;
`;

const MatchHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 40px;
  margin-bottom: 20px;
`;

const MatchTitle = styled.h1`
  font-family: "Roboto", sans-serif;
  font-size: 42px;
  font-weight: 900;
  color: white;
`;

const DateSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
`;

const StatusPill = styled.span<{ $status: MatchStatus }>`
  font-family: "Roboto", sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 4px 12px;
  border-radius: 20px;
  background-color: ${({ $status }) =>
    $status === "scheduled"
      ? "#b8860b"
      : $status === "ongoing"
      ? "#27ae60"
      : "#7d3030"};
  color: white;
`;

const DateLabel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 18px;
  color: white;
  text-align: right;
`;

const DateValueWithTooltip = styled.span`
  text-decoration: underline dotted;
  cursor: help;
`;

const StoryDate = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 18px;
  color: white;
  margin-bottom: 20px;
`;

const MatchBriefDescription = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 26px;
  line-height: 1.5;
  margin-bottom: 20px;
  color: white;
  font-style: italic;
`;

const MatchFinalDescription = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 18px;
  line-height: 1.5;
  font-style: italic;
  color: #e0e0e0;
  border-top: 1px solid #555;
  padding-top: 15px;
  margin-bottom: 20px;
`;

const ActionsList = styled.div`
  position: relative;
  padding-bottom: 112px;
`;

const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const StyledLobbyDialog = styled.div`
  background-color: #2d2215;
  border-radius: 12px;
  padding: 30px;
  max-width: 480px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ConfirmText = styled.p`
  font-family: "Roboto", sans-serif;
  font-size: 20px;
  color: white;
  line-height: 1.5;
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const BaseDialogButton = styled.button`
  font-family: "Roboto", sans-serif;
  font-size: 18px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;

const DialogCancelButton = styled(BaseDialogButton)`
  background-color: transparent;
  border: 1px solid white;
  color: white;
`;

const DialogLobbyButton = styled(BaseDialogButton)`
  background-color: #107135;
  border: none;
  color: white;
`;
