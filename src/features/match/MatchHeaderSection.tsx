// src/features/match/MatchHeaderSection.tsx
import styled from "styled-components";
import type { Match } from "../../types/match";
import type { MatchStatus } from "../../pages/MatchPage.styles";
import ExpandableText from "../../components/molecules/ExpandableText";
import { colors, fonts } from "../../styles/tokens";
import { formatDateBR, formatDateTimeBR } from "../../utils/date";

const statusLabels: Record<MatchStatus, string> = {
  scheduled: "AGENDADA",
  ongoing: "EM ANDAMENTO",
  ended: "ENCERRADA",
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
      <MatchHeader>
        <MatchTitle>{match.title.toUpperCase()}</MatchTitle>
        <DateSection>
          <StatusPill $status={status}>{statusLabels[status]}</StatusPill>
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
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 750px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const MatchTitle = styled.h1`
  font-family: ${fonts.sans};
  font-size: 42px;
  font-weight: 900;
  color: ${colors.textPrimary};
  flex: 1;
  min-width: 0;
  overflow-wrap: break-word;
`;

const DateSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
`;

const StatusPill = styled.span<{ $status: MatchStatus }>`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 4px 12px;
  border-radius: 20px;
  background-color: ${({ $status }) =>
    $status === "scheduled"
      ? colors.statusScheduled
      : $status === "ongoing"
      ? colors.statusOngoing
      : colors.statusEnded};
  color: ${colors.textPrimary};
`;

const DateLabel = styled.div`
  font-family: ${fonts.sans};
  font-weight: 400;
  font-size: 18px;
  color: ${colors.textPrimary};
  text-align: right;
`;

const DateValueWithTooltip = styled.span`
  text-decoration: underline dotted;
  cursor: help;
`;

const StoryDate = styled.div`
  font-family: ${fonts.sans};
  font-weight: 400;
  font-size: 18px;
  color: ${colors.textPrimary};
  margin-bottom: 20px;
`;

const MatchBriefDescription = styled.p`
  font-family: ${fonts.sans};
  font-weight: 400;
  font-size: 26px;
  line-height: 1.5;
  margin-bottom: 20px;
  color: ${colors.textPrimary};
  font-style: italic;
`;

const MatchFinalDescription = styled.p`
  font-family: ${fonts.sans};
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
  font-family: ${fonts.sans};
  font-size: 16px;
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  background-color: ${colors.overlayMedium};
  color: ${colors.textMuted};
  border: 1px solid ${colors.borderDivider};
`;
