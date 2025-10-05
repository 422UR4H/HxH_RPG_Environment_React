import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { campaignService } from "../services/campaignService";
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
import ExpandButton from "../components/ions/ExpandButton";

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<CampaignMaster | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandDescription, setExpandDescription] = useState<boolean>(false);
  const [shouldShowExpandButton, setShouldShowExpandButton] =
    useState<boolean>(false);

  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const isMaster = campaign?.masterUuid === user?.uuid;
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

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

  // verify if the text exceeds 5 lines
  useEffect(() => {
    if (campaign && descriptionRef.current) {
      const element = descriptionRef.current;

      // temporarily remove max-height to measure actual height
      const originalMaxHeight = element.style.maxHeight;
      element.style.maxHeight = "none";

      const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
      const maxHeight = lineHeight * 5; // 5 lines
      const actualHeight = element.scrollHeight; // actual height of content

      // restore original max-height
      element.style.maxHeight = originalMaxHeight;

      // only show the button if the content exceeds 5 lines
      setShouldShowExpandButton(actualHeight > maxHeight);
    }
  }, [campaign, expandDescription]);

  let sortedSheets: (CharacterPrivateSummary & { isPending?: boolean })[] = [];
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
  const toggleExpandDescription = () => {
    setExpandDescription(!expandDescription);
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
      <PageHeader to="/campaigns" backgroundColor="#08491f" />
      <PageBody>
        <SidebarContainer ref={sidebarRef}>
          <SidebarTitle>PERSONAGENS</SidebarTitle>
          <CharactersList>
            {sortedSheets.map((character) => (
              <CharacterSidebarItem
                key={character.uuid}
                character={character}
                isMaster={!!isMaster}
                onClick={() => navigate(`/character-sheets/${character.uuid}`)}
              />
            ))}

            {isMaster && (
              <AdaptiveActionButton
                label="Criar NPC"
                type="character"
                onClick={handleCreateNpc}
                containerRef={sidebarRef}
                contentChangeSignal={expandDescription}
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
                const [date, _] = campaign.storyCurrentAt.split("T");
                const [year, month, day] = date.split("-");
                return `${day}/${month}/${year}`;
              })()}
            </CampaignDate>
          </CampaignHeader>

          <CampaignBriefDescription>
            {campaign.briefInitialDescription}
          </CampaignBriefDescription>

          <CampaignFullDescription
            $expanded={expandDescription}
            $showButton={shouldShowExpandButton}
          >
            <p ref={descriptionRef}>{campaign.description}</p>

            {shouldShowExpandButton && (
              <ExpandButtonContainer>
                <ExpandButton
                  isExpanded={expandDescription}
                  setIsExpanded={toggleExpandDescription}
                />
              </ExpandButtonContainer>
            )}
          </CampaignFullDescription>

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
                  navigate(`/campaigns/${campaign.uuid}/matches/${match.uuid}`)
                }
              />
            ))}

            {isMaster && (
              <AdaptiveActionButton
                label="Criar Partida"
                type="match"
                onClick={handleCreateMatch}
                containerRef={mainContentRef}
                contentChangeSignal={expandDescription}
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

const CampaignFullDescription = styled.div<{
  $expanded: boolean;
  $showButton: boolean;
}>`
  font-family: "Roboto", sans-serif;
  font-weight: 300;
  font-size: 18px;
  background-color: #493823;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  position: relative;
  display: flex;
  flex-direction: column;

  p {
    line-height: 1.6;
    max-height: ${({ $expanded }) => ($expanded ? "none" : "calc(1.6em * 5)")};
    overflow: hidden;
    position: relative;

    /* Shadow effect when not expanded */
    ${({ $expanded, $showButton }) =>
      !$expanded &&
      $showButton &&
      `
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 50px;
        box-shadow: inset 0 -40px 50px 0 rgba(73, 56, 35, 0.9);
        pointer-events: none;
      }
    `}
  }
`;

const ExpandButtonContainer = styled.div`
  position: absolute;
  left: 50%;
  bottom: -22px;
  transform: translateX(-50%);
  width: 54px;
`;

const MatchesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  padding-bottom: 112px;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  min-height: 100dvh;
  font-size: 24px;
  color: white;
`;

const ErrorContainer = styled.div`
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  margin: 30px;
  font-size: 18px;
`;
