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
import { useInheritableBoards } from "../hooks/useInheritableBoards";
import PageTabNav from "../components/organisms/PageTabNav";
import MatchCharactersSidebar from "../features/match/MatchCharactersSidebar";
import MatchHeaderSection from "../features/match/MatchHeaderSection";
import MatchMapsPanel from "../features/match/MatchMapsPanel";
import LobbyConfirmDialog from "../features/match/LobbyConfirmDialog";
import BottomActions from "../components/molecules/BottomActions";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";
import ConfirmDialog from "../components/molecules/ConfirmDialog";
import DetailPageTemplate from "../components/templates/DetailPageTemplate";
import RulesSidebar from "../components/organisms/RulesSidebar";
import RuleSection from "../components/molecules/RuleSection";
import type { MatchStatus } from "../types/match";
import { ActionsList } from "../components/atoms/ActionsList";
import { useQueryClient } from "@tanstack/react-query";
import { isApiError } from "../services/httpClient";
import { getApiErrorDetail } from "../utils/apiError";

const MAP_LOCKED_TEXT = "O mapa não pode ser trocado depois que a partida começou.";
const MAP_LOCKED_DETAIL = "cannot change map after match has started";

/** Recusas da herança de tabuleiro (B16), pelo `detail` — o back usa um 422 para as cinco. */
const INHERIT_REFUSALS: Record<string, string> = {
  [MAP_LOCKED_DETAIL]: MAP_LOCKED_TEXT,
  "source match has no board to inherit": "Essa partida não deixou um tabuleiro para continuar.",
  "source match's board is on a different map": "O tabuleiro dessa partida está em outro mapa.",
  "source match is not in the same campaign": "Essa partida não é desta campanha.",
  "source match cannot be the same match being attached to":
    "Uma partida não pode continuar o próprio tabuleiro.",
  "match not found": "A partida não foi encontrada.",
  "map not found": "O mapa não foi encontrado.",
};

/**
 * Sem herança, o único 422 de anexar/desanexar é o de partida iniciada (F16, garantido pelo
 * contrato): o status basta, e um `detail` reescrito no back não quebra a recusa. Com herança,
 * o 422 tem cinco motivos e só o `detail` diz qual.
 */
function mapChangeRefusal(err: unknown, inheriting: boolean): { text: string; locked: boolean } {
  if (!inheriting) {
    if (isApiError(err, 422)) return { text: MAP_LOCKED_TEXT, locked: true };
  } else {
    const detail = getApiErrorDetail(err);
    const known = detail ? INHERIT_REFUSALS[detail] : undefined;
    if (known) return { text: known, locked: detail === MAP_LOCKED_DETAIL };
    // Recusa que o front não conhece: tentar de novo daria o mesmo 422.
    if (isApiError(err, 422)) {
      return { text: "Não dá para continuar o tabuleiro dessa partida.", locked: false };
    }
  }
  return { text: "Não foi possível trocar o mapa. Tente novamente.", locked: false };
}

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
  const queryClient = useQueryClient();
  const [mapChangeError, setMapChangeError] = useState<string | null>(null);
  // A resposta do anexar não ecoa a herança: sem este aviso, herdar no mapa já anexado não
  // mudaria nada na tela.
  const [mapChangeNotice, setMapChangeNotice] = useState<string | null>(null);
  // Recusa por partida iniciada: esta tela carregou antes do início. Rebuscar a partida traz o
  // `gameStartAt`, e a troca de mapa some.
  const onMapChangeError = (err: unknown, inheriting = false) => {
    const refusal = mapChangeRefusal(err, inheriting);
    setMapChangeNotice(null);
    setMapChangeError(refusal.text);
    if (refusal.locked) {
      void queryClient.invalidateQueries({ queryKey: ["matchDetails", token, matchId] });
    }
  };
  const mapChangeCallbacks = {
    onSuccess: () => {
      setMapChangeError(null);
      setMapChangeNotice(null);
    },
    onError: (err: unknown) => onMapChangeError(err),
  };

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
  const boardSources = useInheritableBoards(
    token,
    campaignId,
    matchId,
    activeTab === "maps" && isMaster && !matchStarted,
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

  const handleInherit = (mapId: string, sourceMatchUuid: string) => {
    const source = boardSources[mapId]?.find((s) => s.matchUuid === sourceMatchUuid);
    attachMap(
      { mapId, inheritBoardFromMatchUuid: sourceMatchUuid },
      {
        onSuccess: () => {
          setMapChangeError(null);
          setMapChangeNotice(
            source ? `O tabuleiro de «${source.title}» continua nesta partida.` : null,
          );
        },
        onError: (err: unknown) => onMapChangeError(err, true),
      },
    );
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

  const canEnterLobby =
    !!sheetId &&
    !isMaster &&
    !match.gameStartAt &&
    enrollments.some(
      (e) => e.characterSheet.uuid === sheetId && e.status === "accepted"
    );

  // Só quem joga (mestre ou personagem inscrito e aceito, que é o que `participants` lista)
  // tem o que fazer na tela do jogo; quem não está na partida não deve ser convidado a ela.
  const canEnterGame =
    status === "ongoing" &&
    (isMaster || participants.some((p) => p.characterSheet.playerUuid === user?.uuid));

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
        <MatchHeaderSection
          match={match}
          status={status}
          lobbyNotOpen={lobbyNotOpen}
          onDescriptionToggle={() => setDescriptionSignal((s) => !s)}
        />

        <PageTabNav tabs={availableTabs} />

        {activeTab === "events" && (
          <ActionsList>
            {(isMaster && !match.gameStartAt) || canEnterLobby || canEnroll || canEnterGame ? (
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
                  canEnterGame
                    ? {
                        label: "Entrar na partida",
                        onClick: () => navigate(`/campaigns/${campaignId}/matches/${matchId}/game`),
                      }
                    : isMaster && !match.gameStartAt
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

        <MatchMapsPanel
          activeTab={activeTab}
          isMaster={isMaster}
          matchEnded={matchEnded}
          matchStarted={matchStarted}
          mapsPending={mapsPending}
          maps={maps}
          matchMap={matchMap}
          isAttaching={isAttaching}
          isDetaching={isDetaching}
          changeError={mapChangeError}
          changeNotice={mapChangeNotice}
          boardSources={boardSources}
          onMapClick={(mapId) =>
            navigate(`/campaigns/${campaignId}/maps/${mapId}/edit`)
          }
          onAttach={(mapId) => attachMap({ mapId }, mapChangeCallbacks)}
          onDetach={() => detachMap(undefined, mapChangeCallbacks)}
          onInherit={handleInherit}
        />
      </DetailPageTemplate>

      {showLobbyConfirm && (
        <LobbyConfirmDialog
          onCancel={() => setShowLobbyConfirm(false)}
          onConfirm={handleLobbyConfirm}
        />
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
