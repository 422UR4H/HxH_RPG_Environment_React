import { useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useCampaignDetails } from "../hooks/useCampaignDetails";
import { useSubmitCharacterSheet } from "../hooks/useSubmitCharacterSheet";
import type { CharacterPrivateSummary } from "../types/campaign";
import styled from "styled-components";
import CharacterSidebarItem from "../components/molecules/CharacterSidebarItem";
import MatchItem from "../features/campaign/MatchItem";
import AdaptiveActionButton from "../components/molecules/AdaptiveActionButton";
import { getSortedCharacters } from "../features/campaign/utils/characterUtils";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";
import ExpandableText from "../components/molecules/ExpandableText";
import ConfirmDialog from "../components/molecules/ConfirmDialog";
import DetailPageTemplate from "../components/templates/DetailPageTemplate";
import CharactersSidebar from "../components/organisms/CharactersSidebar";
import RulesSidebar from "../components/organisms/RulesSidebar";
import RuleSection from "../components/molecules/RuleSection";
import { isApiError } from "../services/httpClient";

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const sheetId = (location.state as { sheetId?: string; sheetNick?: string } | null)?.sheetId;
  const sheetNick = (location.state as { sheetId?: string; sheetNick?: string } | null)?.sheetNick;

  const [descriptionSignal, setDescriptionSignal] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [nickConflictError, setNickConflictError] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const { data: campaign, isPending, isError } = useCampaignDetails(token, id);
  const {
    mutate: submitSheet,
    isPending: submitPending,
    isSuccess: submitted,
    isError: submitFailed,
    error: submitError,
  } = useSubmitCharacterSheet(token, id);

  const isMaster = campaign?.masterUuid === user?.uuid;

  const playerSheetId = campaign?.characterSheets.find(
    (s) => s.playerUuid === user?.uuid
  )?.uuid;

  const handleSubmitSheet = () => {
    if (!sheetId || !campaign) return;
    submitSheet({ sheetUuid: sheetId, campaignUuid: campaign.uuid });
  };

  const handleRequestSubmit = () => {
    if (sheetNick && campaign) {
      const nickTaken = campaign.characterSheets.some(
        (s) => s.nickName === sheetNick
      );
      if (nickTaken) {
        setNickConflictError(true);
        return;
      }
    }
    setNickConflictError(false);
    setShowSubmitConfirm(true);
  };

  let sortedSheets: (CharacterPrivateSummary & { isPending?: boolean })[] = [];
  if (campaign) {
    const ownPending = !isMaster && campaign.myPendingSheet ? [campaign.myPendingSheet] : [];
    const pendingSheets = isMaster ? campaign.pendingSheets : ownPending;
    sortedSheets = getSortedCharacters(campaign.characterSheets, pendingSheets);
  }

  const handleCreateNpc = () => {
    navigate(`/campaigns/${id}/npcs/new`);
  };
  const handleCreateMatch = () => {
    navigate(`/campaigns/${id}/matches/new`);
  };

  if (isPending) {
    return <LoadingContainer>Carregando campanha...</LoadingContainer>;
  }
  if (isError) {
    return <ErrorContainer>Falha ao carregar detalhes da campanha.</ErrorContainer>;
  }
  if (!campaign) {
    return <ErrorContainer>Campanha não encontrada</ErrorContainer>;
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
          <RulesSidebar>
            <RuleSection title="Configurações Gerais">
              As regras da campanha serão configuradas aqui.
            </RuleSection>
            <RuleSection title="Sistema de Combate">
              Configure o sistema de combate da sua campanha.
            </RuleSection>
            <RuleSection title="Progressão de Personagens">
              Define como os personagens evoluem durante a campanha.
            </RuleSection>
            <RuleSection title="Nen & Habilidades">
              Configure as regras para uso e desenvolvimento de Nen.
            </RuleSection>
          </RulesSidebar>
        }
      >
        <CampaignHeader>
          <CampaignTitle>{campaign.name.toUpperCase()}</CampaignTitle>
          <CampaignDate>
            Data Atual:{" "}
            {(() => {
              if (!campaign.storyCurrentAt) return "Data não disponível";
              const [date] = campaign.storyCurrentAt.split("T");
              const [year, month, day] = date.split("-");
              return `${day}/${month}/${year}`;
            })()}
          </CampaignDate>
        </CampaignHeader>

        <CampaignBriefDescription>
          {campaign.briefInitialDescription}
        </CampaignBriefDescription>

        <ExpandableText onToggle={() => setDescriptionSignal((s) => !s)}>
          {campaign.description}
        </ExpandableText>

        <CampaignDate>
          Início:{" "}
          {(() => {
            const [year, month, day] = campaign.storyStartAt.split("-");
            return `${day}/${month}/${year}`;
          })()}
        </CampaignDate>

        <MatchesList>
          {(campaign.matches || []).map((match) => (
            <MatchItem
              key={match.uuid}
              match={match}
              onClick={() =>
                navigate(`/campaigns/${campaign.uuid}/matches/${match.uuid}`, {
                  state: { sheetId: playerSheetId },
                })
              }
            />
          ))}

          {isMaster && (
            <AdaptiveActionButton
              label="Criar Partida"
              type="match"
              onClick={handleCreateMatch}
              containerRef={mainContentRef}
              contentChangeSignal={descriptionSignal}
            />
          )}

          {!isMaster && !submitted && sheetId && (
            <>
              <AdaptiveActionButton
                label={submitPending ? "Submetendo..." : "Submeter Ficha"}
                type="match"
                onClick={submitPending ? () => {} : handleRequestSubmit}
                containerRef={mainContentRef}
                contentChangeSignal={descriptionSignal}
              />
              {nickConflictError && (
                <NickConflictMessage>
                  Já existe um personagem com o nick &quot;{sheetNick}&quot; nesta campanha. Escolha outro nick antes de submeter.
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
          )}
        </MatchesList>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 40px;
  margin-bottom: 20px;
`;

const CampaignTitle = styled.h1`
  font-family: "Roboto", sans-serif;
  font-size: 42px;
  font-weight: 900;
  color: white;
`;

const CampaignDate = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  text-align: right;
  color: white;
  font-size: 18px;
  line-height: 1.5;
`;

const CampaignBriefDescription = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 26px;
  line-height: 1.5;
  margin-bottom: 20px;
  color: white;
  font-style: italic;
`;

const MatchesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  padding-bottom: 112px;
`;

const NickConflictMessage = styled.p`
  font-family: "Roboto", sans-serif;
  font-size: max(2.6cqi, 12px);
  line-height: 1.2;
  color: #ff1c1c;
  background: rgba(0, 0, 0, 0.44);
  border-left: 3px solid #ff1c1c;
  padding: 10px 14px;
  border-radius: 0 8px 8px 0;
  white-space: pre-line;

  @media (max-width: 609px) {
    margin: 12px 20px 0;
  }
`;
