import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { campaignService } from "../services/campaignService";
import { characterSheetsService } from "../services/characterSheetsService";
import type {
  CampaignMaster,
  CharacterPrivateSummary,
} from "../types/campaign";
import worldMap from "../assets/images/worldmap.png";
import styled from "styled-components";
import CharacterSidebarItem from "../features/campaign/CharacterSidebarItem";
import MatchItem from "../features/campaign/MatchItem";
import AdaptiveActionButton from "../features/campaign/AdaptativeActionButton";
import { getSortedCharacters } from "../features/campaign/utils/characterUtils";
import PageHeader from "../components/atoms/PageHeader";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";
import ExpandableText from "../components/molecules/ExpandableText";

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string; sheetId?: string } | null;
  const backTo = locationState?.from ?? "/campaigns";
  const sheetId = locationState?.sheetId;

  const [campaign, setCampaign] = useState<CampaignMaster | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [descriptionSignal, setDescriptionSignal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isMaster = campaign?.masterUuid === user?.uuid;
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const playerSheetId = campaign?.characterSheets.find(
    (s) => s.playerUuid === user?.uuid
  )?.uuid;

  const handleSubmitSheet = async () => {
    if (!token || !sheetId || !campaign) return;
    setSubmitLoading(true);
    try {
      await characterSheetsService.submitCharacterSheet(token, sheetId, campaign.uuid);
      setSubmitted(true);
    } catch {
      // re-enables on error
    } finally {
      setSubmitLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !id) {
      navigate("/");
      return;
    }
    setIsLoading(true);

    campaignService
      .getCampaignDetails(token, id)
      .then(({ data }) => {
        // TODO: remove console
        console.log("Campaign Details:", data);
        setCampaign(data);
        setError(null);
      })
      .catch((error) => {
        console.error("Error fetching campaign details:", error);
        setError("Falha ao carregar detalhes da campanha.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, id, navigate]);

  let sortedSheets: (CharacterPrivateSummary & { isPending?: boolean })[] = [];
  console.log("Campaign Data:", campaign);
  if (campaign) {
    const pendingSheets = isMaster ? campaign.pendingSheets : [];
    sortedSheets = getSortedCharacters(campaign.characterSheets, pendingSheets);
  }

  const handleCreateNpc = () => {
    console.log("Criar NPC");
  };
  const handleCreateMatch = () => {
    navigate(`/campaigns/${id}/matches/new`);
  };
  if (isLoading) {
    return <LoadingContainer>Carregando campanha...</LoadingContainer>;
  }
  if (error) {
    return <ErrorContainer>{error}</ErrorContainer>;
  }
  if (!campaign) {
    return <ErrorContainer>Campanha não encontrada</ErrorContainer>;
  }

  return (
    <CampaignContainer>
      <PageHeader to={backTo} backgroundColor="#08491f" />
      <PageBody>
        <SidebarContainer ref={sidebarRef}>
          <SidebarTitle>PERSONAGENS</SidebarTitle>
          <CharactersList>
            {sortedSheets.map((character) => (
              <CharacterSidebarItem
                key={character.uuid}
                character={character}
                isMaster={!!isMaster}
                onClick={() => navigate(`/charactersheet/${character.uuid}`)}
              />
            ))}

            {isMaster && (
              <AdaptiveActionButton
                label="Criar NPC"
                type="character"
                onClick={handleCreateNpc}
                containerRef={sidebarRef}
                contentChangeSignal={descriptionSignal}
              />
            )}
          </CharactersList>
        </SidebarContainer>

        <MainContentContainer ref={mainContentRef}>
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
              <AdaptiveActionButton
                label={submitLoading ? "Submetendo..." : "Submeter Ficha"}
                type="match"
                onClick={submitLoading ? () => {} : handleSubmitSheet}
                containerRef={mainContentRef}
                contentChangeSignal={descriptionSignal}
              />
            )}
          </MatchesList>
        </MainContentContainer>
      </PageBody>
    </CampaignContainer>
  );
}

const CampaignContainer = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
`;

const PageBody = styled.main`
  display: flex;
  color: white;
  min-height: 0;
  overflow: hidden;
`;

const SidebarContainer = styled.div`
  width: 300px;
  background-color: #2d2215;
  padding: 20px;
  position: relative;
  overflow-y: auto;
  flex-shrink: 0;
`;

const SidebarTitle = styled.h2`
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: 32px;
  text-align: center;
  color: white;

  margin-bottom: 20px;
  border-bottom: 1px solid #696969;
  padding-bottom: 10px;
`;

const CharactersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  padding-bottom: 103px;
`;

const MainContentContainer = styled.div`
  flex: 1;
  padding: 30px 30px 20px 30px;
  overflow-y: auto;

  /* world map */
  background-image: url(${worldMap});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed; /* fixes the background during scrolling */
`;

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
