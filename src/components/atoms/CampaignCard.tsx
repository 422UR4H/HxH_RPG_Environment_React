import styled from "styled-components";
import { Link } from "react-router-dom";
import type { CampaignSummary } from "../../types/campaigns";

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
  background-color: #493823;
  color: white;
  text-decoration: none;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;

  width: 80vw;
  max-width: 940px;
  border: 4px solid #604d31;
  border-radius: 12px;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
    /* border-color: rgb(255, 162, 22); */
    /* border-color: #ba1a3e; */
    border-color: #107135;
  }
  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 500px) {
    width: 100%;
    border-width: 4px 0 4px 0;
    border-radius: 0px;

    &:active {
      transform: scale(1);
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
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: 26px;
  color: white;
  margin-bottom: 10px;

  ${CardContainer}:hover & {
    /* color: #ba1a3e; */
    /* color: #107135; */
    /* color: #2ecc71; */
    /* color: rgb(255, 162, 22); */
  }

  @media (max-width: 500px) {
    font-size: 22px;
  }
`;

const CampaignInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const Description = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 22px;
  line-height: 1.4;
  margin-bottom: 15px;

  @media (max-width: 500px) {
    font-size: 18px;
  }
`;

const MetaInfo = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: auto;
`;

const DateInfo = styled.span`
  font-family: "Roboto", sans-serif;
  font-weight: 300;
  font-size: 16px;
  color: white;
`;

const PublicStatus = styled.span<{ $isPublic: boolean }>`
  font-family: "Roboto", sans-serif;
  font-weight: 500;
  font-size: 16px;
  color: ${({ $isPublic }) => ($isPublic ? "#2ecc71" : "#e74c3c")};
`;
