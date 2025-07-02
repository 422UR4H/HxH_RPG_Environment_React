import { useEffect, useState } from "react";
import { campaignService } from "../services/campaignService";
import { useNavigate } from "react-router-dom";
import type { CampaignSummary } from "../types/campaign";
import CampaignCard from "../components/atoms/CampaignCard";
import PlusIcon from "../components/ions/PlusIcon";
import useToken from "../hooks/useToken";
import styled from "styled-components";

function CampaignsPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    setIsLoading(true);

    campaignService
      .listCampaigns(token)
      .then(({ data }: { data: CampaignSummary[] }) => {
        // TODO: remove this
        console.log("Campaigns:", data);

        setCampaigns(data);
        setError(null);
      })
      .catch((error) => {
        console.error("Error fetching campaigns:", error);
        setError("Falha ao carregar campanhas. Tente novamente mais tarde.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, navigate]);

  if (isLoading) {
    return <LoadingContainer>Carregando campanhas...</LoadingContainer>;
  }

  if (error) {
    return <ErrorContainer>{error}</ErrorContainer>;
  }

  return (
    <StyledCampaignsPage>
      <PageHeader>Lista de Campanhas</PageHeader>

      {campaigns.length === 0 ? (
        <EmptyState>
          <EmptyMessage>Você ainda não possui campanhas.</EmptyMessage>
        </EmptyState>
      ) : (
        <>
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.uuid}
              campaign={campaign}
              to={`/campaigns/${campaign.uuid}`}
            />
          ))}
        </>
      )}
      <CreateButton onClick={() => navigate("/campaigns/new")}>
        <PlusIcon />
        <span>Criar Nova Campanha</span>
      </CreateButton>
    </StyledCampaignsPage>
  );
}

export default CampaignsPage;

const StyledCampaignsPage = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;

  @media (orientation: landscape) {
    align-items: center;
  }
`;

const PageHeader = styled.h1`
  color: white;
  text-align: center;
  font-family: "Oswald", sans-serif;
  font-weight: 600;
  font-size: 32px;
  margin-top: 20px;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  color: white;
  font-size: 24px;
`;

const ErrorContainer = styled.div`
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  margin: 30px;
  font-size: 18px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
`;

const EmptyMessage = styled.p`
  color: #9f9f9f;
  font-size: 20px;
  margin-bottom: 20px;
`;

const CreateButton = styled.button`
  font-family: "Roboto", sans-serif;
  font-size: 20px;
  font-weight: 500;
  color: #1d1d1d;
  background-color: #ffa216;

  height: 91px;
  padding: 15px 30px;
  border-radius: 0px;
  border: none;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;

  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
    background-color: #ff8c00;
  }

  @media (orientation: landscape) {
    width: 80vw;
    border-radius: 12px;
  }
`;
