import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { colors, fonts } from "../styles/tokens";

export default function EditMapPage() {
  const { campaignId } = useParams<{ campaignId: string; mapId: string }>();
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <PageTitle>Editor de Mapa</PageTitle>
      <Message>O editor de mapas será implementado na Fase 2.</Message>
      <BackButton onClick={() => navigate(`/campaigns/${campaignId}`)}>
        Voltar para a campanha
      </BackButton>
    </PageWrapper>
  );
}

const PageWrapper = styled.div`
  max-width: 600px;
  margin: 60px auto;
  padding: 0 24px;
`;

const PageTitle = styled.h1`
  font-family: ${fonts.sans};
  font-size: 32px;
  font-weight: 900;
  color: ${colors.textPrimary};
  margin-bottom: 24px;
`;

const Message = styled.p`
  font-family: ${fonts.sans};
  font-size: 18px;
  color: ${colors.textMuted};
  margin-bottom: 32px;
`;

const BackButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 16px;
  font-weight: 600;
  color: ${colors.textPrimary};
  background: transparent;
  border: 1px solid ${colors.textPrimary};
  border-radius: 6px;
  padding: 12px 24px;
  cursor: pointer;

  &:hover {
    filter: brightness(1.1);
  }
`;
