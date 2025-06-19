import styled from "styled-components";
import { Link } from "react-router-dom";
import type { CampaignSummary } from "../../types/campaigns"; // TODO: fix

interface CampaignCardProps {
  campaign: CampaignSummary;
  to: string;
}

export default function CampaignCard({ campaign, to }: CampaignCardProps) {
  const startDate = new Date(campaign.storyStartAt).toLocaleDateString("pt-BR");

  return (
    <CardContainer to={to}>
      <CardContent>
        <CampaignName>{campaign.name}</CampaignName>
        <CampaignInfo>
          <Description>
            {campaign.briefInitialDescription || "Sem descrição"}
          </Description>

          {campaign.callLink && (
            <Description>
              <Link
                to={campaign.callLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {campaign.callLink}
              </Link>
            </Description>
          )}

          <MetaInfo>
            <DateInfo>Início: {startDate}</DateInfo>
            <PublicStatus $isPublic={campaign.isPublic}>
              {campaign.isPublic ? "Pública" : "Privada"}
            </PublicStatus>
          </MetaInfo>
        </CampaignInfo>
      </CardContent>
    </CardContainer>
  );
}

const CardContainer = styled(Link)`
  display: block;
  background-color: #333;
  color: white;
  text-decoration: none;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  border-width: 2px 0 2px 0;
  border-style: solid;
  border-color: #444;
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
    border-color: rgb(255, 162, 22);
  }

  @media (orientation: landscape) {
    width: 80vw;
    border-radius: 16px;

    &:hover {
      border: 2px solid rgb(255, 162, 22);
    }
  }
`;

const CardContent = styled.div`
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const CampaignName = styled.h2`
  font-family: "Oswald", sans-serif;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 10px;
  color: white;

  ${CardContainer}:hover & {
    color: rgb(255, 162, 22);
  }
`;

const CampaignInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const Description = styled.p`
  font-size: 16px;
  margin-bottom: 15px;
  line-height: 1.4;
`;

const MetaInfo = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: auto;
`;

const DateInfo = styled.span`
  font-size: 14px;
  color: #9f9f9f;
`;

const PublicStatus = styled.span<{ $isPublic: boolean }>`
  font-size: 14px;
  color: ${({ $isPublic }) => ($isPublic ? "#2ecc71" : "#e74c3c")};
`;
