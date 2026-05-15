import { useCampaigns } from "../hooks/useCampaigns";
import { useNavigate } from "react-router-dom";
import type { CampaignSummary } from "../types/campaigns";
import worldMap from "../assets/images/worldmap.png";
import CampaignCard from "../components/atoms/CampaignCard";
import PlusIcon from "../components/ions/PlusIcon";
import useToken from "../hooks/useToken";
import styled from "styled-components";
import PageHeader from "../components/atoms/PageHeader";
import PageTitle from "../components/ions/PageTitle";

function CampaignsPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const { data: campaigns = [], isPending, isError } = useCampaigns(token);

  if (isPending) {
    return <LoadingContainer>Carregando campanhas...</LoadingContainer>;
  }

  if (isError) {
    return (
      <ErrorContainer>
        Falha ao carregar campanhas. Tente novamente mais tarde.
      </ErrorContainer>
    );
  }

  return (
    <StyledCampaignsPage>
      <PageHeader to="/home" backgroundColor="#08491f" />
      <PageBody>
        <PageTitle>LISTA DE CAMPANHAS</PageTitle>

        {campaigns.length === 0 ? (
          <EmptyState>
            <EmptyMessage>Você ainda não possui campanhas.</EmptyMessage>
          </EmptyState>
        ) : (
          <>
            {campaigns.map((campaign: CampaignSummary) => (
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
      </PageBody>
    </StyledCampaignsPage>
  );
}

export default CampaignsPage;

const StyledCampaignsPage = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background-image: url(${worldMap});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
`;

const PageBody = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  padding: 30px;
  width: 100vw;

  @media (max-width: 500px) {
    padding: 30px 0;
  }
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
  font-family: "Roboto", sans-serif;
  font-weight: 600;
  color: white;
  font-size: 28px;
  margin-bottom: 20px;
`;

const CreateButton = styled.button`
  font-family: "Roboto", sans-serif;
  font-size: 26px;
  font-weight: 600;
  color: white;
  background-color: #107135;
  height: 100px;
  width: 80vw;
  max-width: 940px;
  border-radius: 12px;
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
    filter: brightness(1.1);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
    border: 4px solid white;
  }
  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 500px) {
    font-size: 22px;
    width: 100%;
    border-radius: 0px;

    &:hover {
      border-width: 4px 0px 4px 0px;
    }
    &:active {
      transform: scale(1);
    }
  }
`;
