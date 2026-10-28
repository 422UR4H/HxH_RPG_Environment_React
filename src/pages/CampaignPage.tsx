import { useRef, useState } from "react";
import { Navigate, useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useCampaignDetails } from "../hooks/useCampaignDetails";
import { useSubmitCharacterSheet } from "../hooks/useSubmitCharacterSheet";
import { useDeleteCampaign } from "../hooks/useDeleteCampaign";
import type { CharacterPrivateSummary } from "../types/campaign";
import styled from "styled-components";
import { HeaderBox, headerDate, headerRow, headerTitle } from "../styles/pageHeader";
import { colors } from "../styles/tokens";
import CharacterSidebarItem from "../components/molecules/CharacterSidebarItem";
import MatchItem from "../features/campaign/MatchItem";
import AdaptiveActionButton from "../components/molecules/AdaptiveActionButton";
import BottomActions from "../components/molecules/BottomActions";
import { getSortedCharacters } from "../features/campaign/utils/characterUtils";
import { PageLoading, PageError, PageNotFound } from "../components/templates/PageState";
import { ActionsList as BaseActionsList } from "../components/atoms/ActionsList";
import ExpandableText from "../components/molecules/ExpandableText";
import ConfirmDialog from "../components/molecules/ConfirmDialog";
import DetailPageTemplate from "../components/templates/DetailPageTemplate";
import CharactersSidebar from "../components/organisms/CharactersSidebar";
import PlusIcon from "../components/ions/PlusIcon";
import UpcomingRulesSidebar from "../components/organisms/UpcomingRulesSidebar";
import { isApiError } from "../services/httpClient";
import { useMaps } from "../hooks/useMaps";
import PageTabNav from "../components/organisms/PageTabNav";
import MapCard from "../components/molecules/MapCard";
import { formatDateBR } from "../utils/date";

const CAMPAIGNS_BACK = { label: "Ver campanhas", to: "/campaigns" };

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const sheetId = (
    location.state as { sheetId?: string; sheetNick?: string } | null
  )?.sheetId;
  const sheetNick = (
    location.state as { sheetId?: string; sheetNick?: string } | null
  )?.sheetNick;

  const [descriptionSignal, setDescriptionSignal] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [nickConflictError, setNickConflictError] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const {
    data: campaign,
    isPending,
    isError,
    error: loadError,
    refetch,
  } = useCampaignDetails(token, id);
  const {
    mutate: submitSheet,
    isPending: submitPending,
    isSuccess: submitted,
    isError: submitFailed,
    error: submitError,
  } = useSubmitCharacterSheet(token, id);
  const { mutate: deleteCampaign } = useDeleteCampaign(token, id);

  const isMaster = campaign?.masterUuid === user?.uuid;

  const [searchParams] = useSearchParams();

  const availableTabs = isMaster
    ? [
        { id: "matches", label: "Partidas" },
        { id: "maps", label: "Mapas" },
      ]
    : [{ id: "matches", label: "Partidas" }];

  const rawTab = searchParams.get("tab");
  const activeTab = availableTabs.some((t) => t.id === rawTab)
    ? rawTab!
    : "matches";

  const { data: maps, isPending: mapsPending } = useMaps(
    token,
    isMaster ? id : undefined,
  );

  const hasStartedMatch = (campaign?.matches ?? []).some(
    (m) => !!m.gameStartAt,
  );

  const playerSheetId = campaign?.characterSheets.find(
    (s) => s.playerUuid === user?.uuid,
  )?.uuid;

  const handleSubmitSheet = () => {
    if (!sheetId || !campaign) return;
    submitSheet({ sheetUuid: sheetId, campaignUuid: campaign.uuid });
  };

  const handleRequestSubmit = () => {
    if (sheetNick && campaign) {
      const nickTaken = campaign.characterSheets.some(
        (s) => s.nickName === sheetNick,
      );
      if (nickTaken) {
        setNickConflictError(true);
        return;
      }
    }
    setNickConflictError(false);
    setShowSubmitConfirm(true);
  };

  const handleEdit = () => navigate(`/campaigns/${id}/edit`);

  const handleDelete = () => {
    setDeleteError(null);
    deleteCampaign(undefined, {
      onSuccess: () => navigate("/campaigns"),
      onError: (error) => {
        setDeleteError(
          isApiError(error, 422)
            ? "Esta campanha possui ao menos uma partida iniciada e não pode ser deletada."
            : "Erro ao deletar campanha. Tente novamente.",
        );
      },
    });
  };

  const handleCreateNpc = () => navigate(`/campaigns/${id}/npcs/new`);
  const handleCreateMatch = () => navigate(`/campaigns/${id}/matches/new`);

  let sortedSheets: (CharacterPrivateSummary & { isPending?: boolean })[] = [];
  if (campaign) {
    const ownPending =
      !isMaster && campaign.myPendingSheet ? [campaign.myPendingSheet] : [];
    const pendingSheets = isMaster ? campaign.pendingSheets : ownPending;
    sortedSheets = getSortedCharacters(campaign.characterSheets, pendingSheets);
  }

  useDocumentTitle(campaign?.name);

  if (!token) return <Navigate to="/" replace />;
  if (isError) {
    return isApiError(loadError, 404) ? (
      <PageNotFound title="Campanha não encontrada" back={CAMPAIGNS_BACK} />
    ) : (
      <PageError
        title="Não foi possível carregar a campanha"
        onRetry={() => void refetch()}
        back={CAMPAIGNS_BACK}
      />
    );
  }
  if (isPending) return <PageLoading label="Carregando campanha…" />;
  if (!campaign) {
    return <PageNotFound title="Campanha não encontrada" back={CAMPAIGNS_BACK} />;
  }

  return (
    <>
      <DetailPageTemplate
        mainRef={mainContentRef}
        leftSidebar={
          <CharactersSidebar
            containerRef={sidebarRef}
            items={sortedSheets}
            renderItem={(character) => (
              <CharacterSidebarItem
                key={character.uuid}
                character={character}
                isMaster={!!isMaster}
                isOwn={character.playerUuid === user?.uuid}
                onClick={() =>
                  navigate(`/charactersheet/${character.uuid}`, {
                    state: { isPending: !!character.isPending, campaignId: id },
                  })
                }
              />
            )}
            footer={
              isMaster && (
                <AdaptiveActionButton
                  label="Criar NPC"
                  icon={<PlusIcon />}
                  type="character"
                  onClick={handleCreateNpc}
                  containerRef={sidebarRef}
                  contentChangeSignal={descriptionSignal}
                />
              )
            }
          />
        }
        rightSidebar={
          <UpcomingRulesSidebar scope="campaign" />
        }
      >
        <HeaderBox>
          <CampaignHeader>
            <CampaignTitle>{campaign.name.toUpperCase()}</CampaignTitle>
            <CampaignDate>
              Data Atual:{" "}
              {campaign.storyCurrentAt
                ? formatDateBR(campaign.storyCurrentAt)
                : "Data não disponível"}
            </CampaignDate>
          </CampaignHeader>
        </HeaderBox>

        <CampaignBriefDescription>
          {campaign.briefInitialDescription}
        </CampaignBriefDescription>

        <ExpandableText onToggle={() => setDescriptionSignal((s) => !s)}>
          {campaign.description}
        </ExpandableText>

        <CampaignStartDate>
          Início:{" "}
          {(() => {
            const [year, month, day] = campaign.storyStartAt.split("-");
            return `${day}/${month}/${year}`;
          })()}
        </CampaignStartDate>

        <PageTabNav tabs={availableTabs} />

        {activeTab === "matches" && (
          <>
            <MatchesList>
              {(campaign.matches ?? []).map((match) => (
                <MatchItem
                  key={match.uuid}
                  match={match}
                  onClick={() =>
                    navigate(
                      `/campaigns/${campaign.uuid}/matches/${match.uuid}`,
                      {
                        state: { sheetId: playerSheetId },
                      },
                    )
                  }
                />
              ))}
            </MatchesList>

            <ActionsList>
              {isMaster ? (
                <BottomActions
                  containerRef={mainContentRef}
                  contentChangeSignal={descriptionSignal}
                  manage={{
                    deleteBlockedReason: hasStartedMatch
                      ? "Campanha com partida iniciada não pode ser excluída: o histórico é do grupo."
                      : undefined,
                    onEdit: handleEdit,
                    onDelete: handleDelete,
                    confirmMessage:
                      "Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.",
                  }}
                  primaryButton={{
                    label: "Criar Partida",
                    icon: <PlusIcon />,
                    onClick: handleCreateMatch,
                  }}
                />
              ) : !submitted && sheetId ? (
                <>
                  <AdaptiveActionButton
                    label={submitPending ? "Submetendo…" : "Submeter Ficha"}
                    type="match"
                    onClick={submitPending ? () => {} : handleRequestSubmit}
                    containerRef={mainContentRef}
                    contentChangeSignal={descriptionSignal}
                  />
                  {nickConflictError && (
                    <NickConflictMessage>
                      Já existe um personagem com o nick &quot;{sheetNick}&quot;
                      nesta campanha. Escolha outro nick antes de submeter.
                    </NickConflictMessage>
                  )}
                  {submitFailed && !nickConflictError && (
                    <NickConflictMessage>
                      {isApiError(submitError, 409)
                        ? `Já existe um personagem com o nick "${sheetNick}" nesta campanha. Escolha outro nick antes de submeter.`
                        : "Erro ao submeter ficha. Tente novamente."}
                    </NickConflictMessage>
                  )}
                </>
              ) : null}
            </ActionsList>

            {deleteError && (
              <DeleteErrorMessage>{deleteError}</DeleteErrorMessage>
            )}
          </>
        )}

        {activeTab === "maps" && (
          <>
            <MapsGrid>
              {mapsPending ? (
                <MapsEmptyText>Carregando mapas…</MapsEmptyText>
              ) : (maps ?? []).length === 0 ? (
                <MapsEmptyText>Nenhum mapa criado ainda.</MapsEmptyText>
              ) : (
                (maps ?? []).map((map) => (
                  <MapCard
                    key={map.id}
                    map={map}
                    onClick={() =>
                      navigate(`/campaigns/${id}/maps/${map.id}/edit`)
                    }
                  />
                ))
              )}
            </MapsGrid>

            <ActionsList>
              <AdaptiveActionButton
                label="Criar Mapa"
                icon={<PlusIcon />}
                type="match"
                onClick={() => navigate(`/campaigns/${id}/maps/new`)}
                containerRef={mainContentRef}
                contentChangeSignal={descriptionSignal}
              />
            </ActionsList>
          </>
        )}
      </DetailPageTemplate>

      {showSubmitConfirm && (
        <ConfirmDialog
          message="Tem certeza que deseja submeter esta ficha para a campanha? Esta ação não pode ser desfeita."
          confirmLabel="Submeter"
          onConfirm={() => {
            setShowSubmitConfirm(false);
            handleSubmitSheet();
          }}
          onCancel={() => setShowSubmitConfirm(false)}
        />
      )}
    </>
  );
}

const CampaignHeader = styled.div`
  ${headerRow}
`;

const CampaignTitle = styled.h1`
  ${headerTitle}
`;

const CampaignDate = styled.div`
  ${headerDate}
  font-weight: 400;
  color: ${colors.textPrimary};
  font-size: 18px;
  line-height: 1.5;
`;

const CampaignStartDate = styled.div`
  font-weight: 400;
  text-align: right;
  color: ${colors.textPrimary};
  font-size: 18px;
  line-height: 1.5;
`;

const CampaignBriefDescription = styled.p`
  font-weight: 400;
  font-size: 26px;
  line-height: 1.5;
  margin-bottom: 20px;
  color: ${colors.textPrimary};
  font-style: italic;
`;

const MatchesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
`;

const ActionsList = styled(BaseActionsList)`
  margin-top: 24px;
`;

const InlineErrorMessage = styled.p`
  font-size: max(2.6cqi, 12px);
  line-height: 1.2;
  color: ${colors.feedbackDanger};
  background: ${colors.overlaySoft};
  border-left: 3px solid ${colors.feedbackDanger};
  padding: 10px 14px;
  border-radius: 0 8px 8px 0;
  white-space: pre-line;
`;

const NickConflictMessage = styled(InlineErrorMessage)`
  @media (max-width: 609px) {
    margin: 12px 20px 0;
  }
`;

const DeleteErrorMessage = styled(InlineErrorMessage)`
  margin-top: 8px;
`;

const MapsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

const MapsEmptyText = styled.p`
  font-size: 16px;
  color: ${colors.textMuted};
  padding: 20px 0;
`;
