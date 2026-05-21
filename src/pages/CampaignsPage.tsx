import { useCampaigns } from "../hooks/useCampaigns";
import { useNavigate } from "react-router-dom";
import type { CampaignSummary } from "../types/campaigns";
import worldMap from "../assets/images/worldmap.png";
import CampaignCard from "../components/atoms/CampaignCard";
import useToken from "../hooks/useToken";
import PageTitle from "../components/ions/PageTitle";
import ListPageTemplate from "../components/templates/ListPageTemplate";
import EmptyState from "../components/molecules/EmptyState";
import CreateButton from "../components/atoms/CreateButton";

function CampaignsPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const { data: campaigns = [], isPending, isError } = useCampaigns(token);

  return (
    <ListPageTemplate
      bgImage={worldMap}
      isPending={isPending}
      isError={isError}
      loadingLabel="Carregando campanhas..."
      errorLabel="Falha ao carregar campanhas. Tente novamente mais tarde."
    >
      <PageTitle>LISTA DE CAMPANHAS</PageTitle>

      {campaigns.length === 0 ? (
        <EmptyState>Você ainda não possui campanhas.</EmptyState>
      ) : (
        campaigns.map((campaign: CampaignSummary) => (
          <CampaignCard
            key={campaign.uuid}
            campaign={campaign}
            to={`/campaigns/${campaign.uuid}`}
          />
        ))
      )}

      <CreateButton
        variant="green"
        label="Criar Nova Campanha"
        onClick={() => navigate("/campaigns/new")}
      />
    </ListPageTemplate>
  );
}

export default CampaignsPage;
