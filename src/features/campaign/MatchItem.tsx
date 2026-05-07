import styled from "styled-components";
import type { Match } from "../../types/campaign";
import EnrollmentStatusBadge from "../../components/atoms/EnrollmentStatusBadge";

type MatchStatus = "scheduled" | "ongoing" | "ended";

function getMatchStatus(match: Match): MatchStatus {
  if (!match.gameStartAt) return "scheduled";
  if (!match.storyEndAt) return "ongoing";
  return "ended";
}

const statusLabels: Record<MatchStatus, string> = {
  scheduled: "AGENDADA",
  ongoing: "EM ANDAMENTO",
  ended: "ENCERRADA",
};

interface MatchItemProps {
  match: Match;
  onClick: () => void;
}

export default function MatchItem({ match, onClick }: MatchItemProps) {
  const status = getMatchStatus(match);
  return (
    <MatchContainer onClick={onClick}>
      <MatchHeader>
        <MatchTitle>{match.title}</MatchTitle>
        <RightColumn>
          <MatchDate>
            {(() => {
              const [year, month, day] = match.storyStartAt.split("-");
              return `${day}/${month}/${year}`;
            })()}
          </MatchDate>
          <StatusPill $status={status}>{statusLabels[status]}</StatusPill>
          {match.myEnrollmentStatus && (
            <EnrollmentStatusBadge status={match.myEnrollmentStatus} />
          )}
        </RightColumn>
      </MatchHeader>

      <MatchDescription>{match.briefInitialDescription}</MatchDescription>

      {match.briefFinalDescription && (
        <MatchFinalDescription>
          {match.briefFinalDescription}
        </MatchFinalDescription>
      )}

      {match.storyEndAt && (
        <MatchEndDate>
          Fim: {new Date(match.storyEndAt).toLocaleDateString("pt-BR")}
        </MatchEndDate>
      )}
    </MatchContainer>
  );
}

const MatchContainer = styled.div`
  background-color: #493823;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s;

  &:hover {
    background-color: #382a1a;
  }
`;

const MatchHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 10px;
`;

const MatchTitle = styled.h3`
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: 24px;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
`;

const MatchDate = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 16px;
  color: white;
`;

const StatusPill = styled.span<{ $status: MatchStatus }>`
  font-family: "Roboto", sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 3px 8px;
  border-radius: 20px;
  background-color: ${({ $status }) =>
    $status === "scheduled"
      ? "#b8860b"
      : $status === "ongoing"
      ? "#27ae60"
      : "#7d3030"};
  color: white;
`;

const MatchEndDate = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 16px;
  color: white;
  text-align: right;
  margin-top: 8px;
`;

const MatchDescription = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 300;
  font-size: 18px;
  line-height: 1.5;
  margin-bottom: 15px;
`;

const MatchFinalDescription = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 18px;
  line-height: 1.5;
  font-style: italic;
  color: #e0e0e0;
  border-top: 1px solid #555;
  padding-top: 15px;
`;
