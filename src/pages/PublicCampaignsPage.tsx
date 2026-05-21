import { Navigate, useLocation } from "react-router-dom";
import useToken from "../hooks/useToken";
import { usePublicCampaigns } from "../hooks/usePublicCampaigns";
import CampaignCard from "../components/atoms/CampaignCard";
import PageTitle from "../components/ions/PageTitle";
import ListPageTemplate from "../components/templates/ListPageTemplate";
import EmptyState from "../components/molecules/EmptyState";
import worldMap from "../assets/images/worldmap.png";

function PublicCampaignsPage() {
  const { token } = useToken();
  const location = useLocation();
  const sheetId = (location.state as { sheetId?: string; sheetNick?: string } | null)?.sheetId;
  const sheetNick = (location.state as { sheetId?: string; sheetNick?: string } | null)?.sheetNick;

  const { data: campaigns, isLoading, error } = usePublicCampaigns(token);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return (
    <ListPageTemplate
      bgImage={worldMap}
      isPending={isLoading}
      isError={!!error}
      loadingLabel="Carregando campanhas..."
      errorLabel="Falha ao carregar campanhas. Tente novamente mais tarde."
    >
      <PageTitle>CAMPANHAS PÚBLICAS</PageTitle>

      {(campaigns ?? []).length === 0 ? (
        <EmptyState>Nenhuma campanha pública disponível.</EmptyState>
      ) : (
        (campaigns ?? []).map((campaign) => (
          <CampaignCard
            key={campaign.uuid}
            campaign={campaign}
            to={`/campaigns/${campaign.uuid}`}
            nextGameScheduledAt={campaign.nextGameScheduledAt}
            state={sheetId ? { sheetId, sheetNick } : undefined}
          />
        ))
      )}
    </ListPageTemplate>
  );
}

export default PublicCampaignsPage;
