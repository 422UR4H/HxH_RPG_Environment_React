import { Navigate, useLocation } from "react-router-dom";
import useToken from "../hooks/useToken";
import { usePublicCampaigns } from "../hooks/usePublicCampaigns";
import CampaignCard from "../components/atoms/CampaignCard";
import PageHeader from "../components/atoms/PageHeader";
import PageTitle from "../components/ions/PageTitle";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";
import worldMap from "../assets/images/worldmap.png";
import styled from "styled-components";

function PublicCampaignsPage() {
  const { token } = useToken();
  const location = useLocation();
  const sheetId = (location.state as { sheetId?: string } | null)?.sheetId;

  const { data: campaigns, isLoading, error } = usePublicCampaigns(token);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <LoadingContainer>Carregando campanhas...</LoadingContainer>;
  }

  if (error) {
    return (
      <ErrorContainer>
        Falha ao carregar campanhas. Tente novamente mais tarde.
      </ErrorContainer>
    );
  }

  return (
    <StyledPublicCampaignsPage>
      <PageHeader backgroundColor="#08491f" />
      <PageBody>
        <PageTitle>CAMPANHAS PÚBLICAS</PageTitle>

        {(campaigns ?? []).length === 0 ? (
          <EmptyState>
            <EmptyMessage>Nenhuma campanha pública disponível.</EmptyMessage>
          </EmptyState>
        ) : (
          <>
            {(campaigns ?? []).map((campaign) => (
              <CampaignCard
                key={campaign.uuid}
                campaign={campaign}
                to={`/campaigns/${campaign.uuid}`}
                nextGameScheduledAt={campaign.nextGameScheduledAt}
                state={sheetId ? { sheetId } : undefined}
              />
            ))}
          </>
        )}
      </PageBody>
    </StyledPublicCampaignsPage>
  );
}

export default PublicCampaignsPage;

const StyledPublicCampaignsPage = styled.div`
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
