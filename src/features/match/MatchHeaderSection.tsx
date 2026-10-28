// src/features/match/MatchHeaderSection.tsx
import SignNotice from "../../components/atoms/SignNotice";
import styled from "styled-components";
import Tooltip from "../../components/ions/Tooltip";
import Badge from "../../components/ions/Badge";
import type { BadgeTone } from "../../components/ions/Badge";
import type { Match, MatchStatus } from "../../types/match";
import ExpandableText from "../../components/molecules/ExpandableText";
import { colors } from "../../styles/tokens";
import {
  HeaderBox,
  SubtitleBox,
  headerBadge,
  headerDate,
  headerDateValue,
  headerRow,
  headerSubtitle,
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
          <MatchBadge tone={statusTones[status]}>
            {statusLabels[status]}
          </MatchBadge>
          <MatchTitle>{match.title.toUpperCase()}</MatchTitle>
          {status === "scheduled" ? (
            <DateLabel>
              Agendada para:{" "}
              <DateValue>{formatDateTimeBR(match.gameScheduledAt)}</DateValue>
            </DateLabel>
          ) : (
            <DateLabel>
              Iniciada em:{" "}
              <Tooltip
                label={`Agendada para: ${formatDateTimeBR(match.gameScheduledAt)}`}
              >
                <StartedAtValue tabIndex={0}>
                  {formatDateTimeBR(match.gameStartAt!)}
                </StartedAtValue>
              </Tooltip>
            </DateLabel>
          )}
        </MatchHeader>
      </HeaderBox>

      <StoryDate>Início na história: {formatDateBR(match.storyStartAt)}</StoryDate>

      <SubtitleBox>
        <MatchBriefDescription>
          {match.briefInitialDescription}
        </MatchBriefDescription>
      </SubtitleBox>

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
        <SignNotice
          tone="dark"
          message="O mestre ainda não abriu o lobby. Tente de novo daqui a pouco."
        />
      )}
    </>
  );
}

const MatchHeader = styled.div`
  ${headerRow}
`;

const MatchTitle = styled.h1`
  ${headerTitle}
`;

const MatchBadge = styled(Badge)`
  ${headerBadge}
`;

const DateLabel = styled.div`
  ${headerDate}
  font-weight: 400;
  font-size: 18px;
  color: ${colors.textPrimary};
`;

const DateValue = styled.span`
  ${headerDateValue}
`;

// O sublinhado pontilhado avisa que há mais informação (o balão com a data agendada).
const StartedAtValue = styled(DateValue)`
  text-decoration: underline dotted;
`;

const StoryDate = styled.div`
  font-weight: 400;
  font-size: 18px;
  color: ${colors.textPrimary};
  margin-bottom: 20px;
`;

const MatchBriefDescription = styled.p`
  ${headerSubtitle}
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

