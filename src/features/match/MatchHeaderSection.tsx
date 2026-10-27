// src/features/match/MatchHeaderSection.tsx
import styled from "styled-components";
import Badge from "../../components/ions/Badge";
import type { BadgeTone } from "../../components/ions/Badge";
import type { Match, MatchStatus } from "../../types/match";
import ExpandableText from "../../components/molecules/ExpandableText";
import { colors } from "../../styles/tokens";
import {
  HeaderBox,
  headerAside,
  headerRow,
  headerTitle,
} from "../../styles/pageHeader";
import { formatDateBR, formatDateTimeBR } from "../../utils/date";

const statusLabels: Record<MatchStatus, string> = {
  scheduled: "AGENDADA",
  ongoing: "EM ANDAMENTO",
  ended: "ENCERRADA",
};

const statusTones: Record<MatchStatus, BadgeTone> = {
  scheduled: "scheduled",
  ongoing: "ongoing",
  ended: "ended",
};

interface MatchHeaderSectionProps {
  match: Match;
  status: MatchStatus;
  lobbyNotOpen: boolean;
  onDescriptionToggle: () => void;
}

export default function MatchHeaderSection({
  match,
  status,
  lobbyNotOpen,
  onDescriptionToggle,
}: MatchHeaderSectionProps) {
  return (
    <>
      <HeaderBox>
        <MatchHeader>
          <MatchTitle>{match.title.toUpperCase()}</MatchTitle>
          <DateSection>
            <Badge tone={statusTones[status]}>{statusLabels[status]}</Badge>
            {status === "scheduled" ? (
              <DateLabel>
                Agendada para:{" "}
                <span>{formatDateTimeBR(match.gameScheduledAt)}</span>
              </DateLabel>
            ) : (
              <DateLabel>
                Iniciada em:{" "}
                <DateValueWithTooltip
                  title={`Agendada para: ${formatDateTimeBR(match.gameScheduledAt)}`}
                >
                  {formatDateTimeBR(match.gameStartAt!)}
                </DateValueWithTooltip>
              </DateLabel>
            )}
          </DateSection>
        </MatchHeader>
      </HeaderBox>

      <StoryDate>Início na história: {formatDateBR(match.storyStartAt)}</StoryDate>

      <MatchBriefDescription>
        {match.briefInitialDescription}
      </MatchBriefDescription>

      <ExpandableText onToggle={onDescriptionToggle}>
        {match.description}
      </ExpandableText>

      {match.briefFinalDescription && (
        <MatchFinalDescription>
          {match.briefFinalDescription}
        </MatchFinalDescription>
      )}

      {match.storyEndAt && (
        <StoryDate>Fim na história: {formatDateBR(match.storyEndAt)}</StoryDate>
      )}

      {lobbyNotOpen && (
        <LobbyNotOpenBanner>
          O lobby ainda não foi aberto pelo mestre.
        </LobbyNotOpenBanner>
      )}
    </>
  );
}

const MatchHeader = styled.div`
  ${headerRow}
  align-items: flex-start;
`;

const MatchTitle = styled.h1`
  ${headerTitle}
`;

const DateSection = styled.div`
  ${headerAside}
  display: flex;
  flex-direction: column;
  /* Selo e data sempre alinhados entre si à esquerda do bloco: o CSS não sabe quando a linha
     quebrou, e alinhar à direita deixava o selo solto quando o bloco desce para baixo do título. */
  align-items: flex-start;
  gap: 8px;
`;

const DateLabel = styled.div`
  font-weight: 400;
  font-size: 18px;
  color: ${colors.textPrimary};
  text-align: left;
`;

const DateValueWithTooltip = styled.span`
  text-decoration: underline dotted;
  cursor: help;
`;

const StoryDate = styled.div`
  font-weight: 400;
  font-size: 18px;
  color: ${colors.textPrimary};
  margin-bottom: 20px;
`;

const MatchBriefDescription = styled.p`
  font-weight: 400;
  font-size: 26px;
  line-height: 1.5;
  margin-bottom: 20px;
  color: ${colors.textPrimary};
  font-style: italic;
`;

const MatchFinalDescription = styled.p`
  font-weight: 400;
  font-size: 18px;
  line-height: 1.5;
  font-style: italic;
  color: ${colors.textMuted};
  border-top: 1px solid ${colors.statusLeft};
  padding-top: 15px;
  margin-bottom: 20px;
`;

const LobbyNotOpenBanner = styled.div`
  font-size: 16px;
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  background-color: ${colors.overlayMedium};
  color: ${colors.textMuted};
  border: 1px solid ${colors.borderDivider};
`;
