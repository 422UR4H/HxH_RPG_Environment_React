import { useEffect, useState } from "react";
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
import FloatingActionButton from "../features/campaign/FloatingActionButton";
import MatchItem from "../features/campaign/MatchItem";

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<CampaignMaster | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandDescription, setExpandDescription] = useState<boolean>(false);

  // Verifica se o usuário atual é o mestre desta campanha
  const isMaster =
    user &&
    campaign?.characterSheets.some((sheet) => sheet.masterUuid === user.id);

  useEffect(() => {
    if (!token || !id) {
      navigate("/");
      return;
    }

    setIsLoading(true);

    campaignService
      .getCampaignDetails(token, id)
      .then(({ data }) => {
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

  // Função para ordenar personagens conforme solicitado
  const getSortedCharacters = () => {
    if (!campaign) return [];

    // Combinar todos os personagens
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
      // 1. Pendentes primeiro
      if (a.isPending && !b.isPending) return -1;
      if (!a.isPending && b.isPending) return 1;

      // 2. Personagens de jogador
      const aIsPlayer = !!a.playerUuid;
      const bIsPlayer = !!b.playerUuid;
      if (aIsPlayer && !bIsPlayer) return -1;
      if (!aIsPlayer && bIsPlayer) return 1;

      // 3. NPCs (sem playerUuid) - já ordenado pelo passo anterior

      // 4. Personagens mortos por último
      const aIsDead = !!a.deadAt;
      const bIsDead = !!b.deadAt;
      if (!aIsDead && bIsDead) return -1;
      if (aIsDead && !bIsDead) return 1;

      // Por padrão, ordem alfabética por nome
      return a.nickName.localeCompare(b.nickName);
    });
  };

  const handleCreateNpc = () => {
    // Implementar criação de NPC
    console.log("Criar NPC");
  };

  const handleCreateMatch = () => {
    // Implementar criação de partida
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
      {/* Barra lateral com personagens */}
      <SidebarContainer>
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
        </CharactersList>

        {isMaster && (
          <FloatingActionButton
            label="Criar NPC"
            position="sidebar"
            onClick={handleCreateNpc}
          />
        )}
      </SidebarContainer>

      {/* Conteúdo principal */}
      <MainContentContainer>
        <CampaignHeader>
          <CampaignTitle>{campaign.name}</CampaignTitle>
          <CampaignDate>
            Início:{" "}
            {new Date(campaign.storyStartAt).toLocaleDateString("pt-BR")}
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

        <MatchesSection>
          <SectionTitle>Partidas</SectionTitle>

          <MatchesList>
            {(campaign.matches || []).map((match) => (
              <MatchItem
                key={match.uuid}
                match={match}
                onClick={() => navigate(`/matches/${match.uuid}`)}
              />
            ))}
          </MatchesList>

          {isMaster && (
            <FloatingActionButton
              label="Criar Partida"
              position="main"
              onClick={handleCreateMatch}
            />
          )}
        </MatchesSection>
      </MainContentContainer>
    </CampaignContainer>
  );
}

// Styled Components para a página
const CampaignContainer = styled.div`
  display: flex;
  min-height: 100vh;
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
`;

const SidebarTitle = styled.h2`
  font-family: "Oswald", sans-serif;
  font-size: 24px;
  margin-bottom: 20px;
  color: #ffa216;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
`;

const CharactersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 70px; // Espaço para o botão flutuante
`;

const MainContentContainer = styled.div`
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  height: 100vh;
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
  color: #9f9f9f;
  font-size: 16px;
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

  p {
    font-size: 16px;
    line-height: 1.6;
    max-height: ${({ $expanded }) => ($expanded ? "none" : "100px")};
    overflow: hidden;
  }
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: #ffa216;
  cursor: pointer;
  padding: 5px 0;
  font-size: 14px;
  display: block;
  margin-top: 10px;

  &:hover {
    text-decoration: underline;
  }
`;

const SectionTitle = styled.h2`
  font-family: "Oswald", sans-serif;
  font-size: 30px;
  color: #ffa216;
  margin-bottom: 20px;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
`;

const MatchesSection = styled.section`
  margin-bottom: 70px; // Espaço para o botão flutuante
`;

const MatchesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
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
