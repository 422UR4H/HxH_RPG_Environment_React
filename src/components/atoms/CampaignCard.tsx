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
  background-color: #333;
  color: white;
  text-decoration: none;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  border-width: 4px 0 4px 0;
  border-style: solid;
  border-color: #444;
  max-width: 940px;
  width: 100%;
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
    /* border-color: rgb(255, 162, 22); */
    /* border-color: #ba1a3e; */
    border-color: #107135;
  }

  @media (min-width: 941px) {
    width: 80vw;
    border-width: 4px;
    border-radius: 12px;

    &:hover {
      /* border: 2px solid rgb(255, 162, 22); */
      /* border: 4px solid #ba1a3e; */
      border-color: #107135;
    }
    &:active {
      transform: scale(0.98);
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
    /* color: #ba1a3e; */
    /* color: #107135; */
    /* color: #2ecc71; */
    /* color: rgb(255, 162, 22); */
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
