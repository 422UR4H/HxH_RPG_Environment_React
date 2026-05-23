import styled from "styled-components";
import type { Match } from "../../types/campaign";
import { colors } from "../../styles/tokens";

interface MatchItemProps {
  match: Match;
  onClick: () => void;
}

export default function MatchItem({ match, onClick }: MatchItemProps) {
  return (
    <MatchContainer onClick={onClick}>
      <MatchTitle>{match.title}</MatchTitle>
      <MatchDate>
        {(() => {
          const [year, month, day] = match.storyStartAt.split("-");
          return `${day}/${month}/${year}`;
        })()}
      </MatchDate>
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
  background-color: ${colors.surfaceInput};
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${colors.surfaceInputHover};
  }
`;

const MatchTitle = styled.h3`
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: 24px;
  margin-bottom: 10px;
  padding-right: 100px;
`;

const MatchDate = styled.div`
  position: absolute;
  right: 20px;
  top: 20px;

  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 16px;
  color: ${colors.textPrimary};
`;

const MatchEndDate = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;

  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 16px;
  color: ${colors.textPrimary};
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
  color: ${colors.textMuted};
  border-top: 1px solid ${colors.grayMid};
  padding-top: 15px;
  padding-right: 140px;
`;
