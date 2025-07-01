import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { campaignService } from "../services/campaignService";
import type {
  CampaignMaster,
  CharacterPrivateSummary,
} from "../types/campaign";
import styled from "styled-components";
import CharacterSidebarItem from "../features/campaign/CharacterSidebarItem";
import MatchItem from "../features/campaign/MatchItem";
import AdaptiveActionButton from "../features/campaign/AdaptativeActionButton";

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();

  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const [campaign, setCampaign] = useState<CampaignMaster | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandDescription, setExpandDescription] = useState<boolean>(false);

  const isMaster = campaign?.masterUuid === user?.uuid;

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

  const getSortedCharacters = () => {
    if (!campaign) return [];

    const allCharacters = [
      ...(isMaster
        ? campaign.pendingSheets.map((sheet) => ({ ...sheet, isPending: true }))
        : []),
      ...campaign.characterSheets.map((sheet) => ({
        ...sheet,
        isPending: false,
      })),
    ] as (CharacterPrivateSummary & { isPending?: boolean })[];

    return allCharacters.sort((a, b) => {
      // 1. Pendents
      if (a.isPending && !b.isPending) return -1;
      if (!a.isPending && b.isPending) return 1;

      // 2. Character Players
      const aIsPlayer = !!a.playerUuid;
      const bIsPlayer = !!b.playerUuid;
      if (aIsPlayer && !bIsPlayer) return -1;
      if (!aIsPlayer && bIsPlayer) return 1;

      // 3. NPCs (without playerUuid) - already sorted by playerUuid check above

      // 4. Characters dead last
      const aIsDead = !!a.deadAt;
      const bIsDead = !!b.deadAt;
      if (!aIsDead && bIsDead) return -1;
      if (aIsDead && !bIsDead) return 1;

      // default alphabetical sorting by nickName
      return a.nickName.localeCompare(b.nickName);
    });
  };

  const handleCreateNpc = () => {
    console.log("Criar NPC");
  };

  const handleCreateMatch = () => {
    console.log("Criar Partida");
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

  const sortedCharacters = getSortedCharacters();

  return (
    <CampaignContainer>
      <SidebarContainer ref={sidebarRef}>
        <SidebarTitle>Personagens</SidebarTitle>
        <CharactersList>
          {sortedCharacters.map((character) => (
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
          <CampaignTitle>{campaign.name}</CampaignTitle>
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

        <CampaignFullDescription $expanded={expandDescription}>
          <p>{campaign.description}</p>
          <ExpandButton
            onClick={() => setExpandDescription(!expandDescription)}
          >
            {expandDescription ? "Mostrar menos" : "Mostrar mais"}
          </ExpandButton>
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
              onClick={() => navigate(`/matches/${match.uuid}`)}
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
    </CampaignContainer>
  );
}

const CampaignContainer = styled.div`
  display: flex;
  height: 100vh;
  height: 100dvh;
  color: white;
  background-color: #333;
`;

const SidebarContainer = styled.div`
  width: 300px;
  background-color: #2a2a2a;
  padding: 20px;
  position: relative;
  overflow-y: auto;
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  min-height: 100dvh;
  flex-shrink: 0;
`;

const SidebarTitle = styled.h2`
  font-family: "Oswald", sans-serif;
  font-size: 24px;
  color: #ffa216;

  margin-bottom: 20px;
  border-bottom: 1px solid #444;
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
  height: 100vh;
  height: 100dvh;
`;

const CampaignHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const CampaignTitle = styled.h1`
  font-family: "Oswald", sans-serif;
  font-size: 42px;
  color: #ffa216;
`;

const CampaignDate = styled.div`
  text-align: right;
  color: #9f9f9f;
  font-size: 16px;
  line-height: 1.5;
`;

const CampaignBriefDescription = styled.p`
  font-size: 20px;
  line-height: 1.5;
  margin-bottom: 20px;
  color: #e0e0e0;
  font-style: italic;
`;

const CampaignFullDescription = styled.div<{ $expanded: boolean }>`
  background-color: #3a3a3a;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  position: relative;
  display: flex;
  flex-direction: column;

  p {
    font-size: 16px;
    line-height: 1.6;
    max-height: ${({ $expanded }) => ($expanded ? "none" : "100px")};
    overflow: hidden;
    position: relative;

    /* Shadow effect when not expanded */
    ${({ $expanded }) =>
      !$expanded &&
      `
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 50px;
        background: linear-gradient(
          to bottom,
          rgba(58, 58, 58, 0) 0%,
          rgba(58, 58, 58, 1) 100%
        );
        pointer-events: none;
      }
    `}
  }
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: #ffa216;
  cursor: pointer;
  font-size: 14px;
  display: block;

  &:hover {
    text-decoration: underline;
  }
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
