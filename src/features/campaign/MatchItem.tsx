import styled from "styled-components";
import type { Match } from "../../types/campaign";

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
  background-color: #3a3a3a;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s;

  &:hover {
    background-color: #444;
  }
`;

const MatchTitle = styled.h3`
  font-family: "Oswald", sans-serif;
  font-size: 24px;
  margin-bottom: 10px;
  padding-right: 100px;
`;

const MatchDate = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  color: #9f9f9f;
  font-size: 14px;
`;

const MatchEndDate = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  color: #9f9f9f;
  font-size: 14px;
`;

const MatchDescription = styled.p`
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 15px;
`;

const MatchFinalDescription = styled.p`
  font-size: 16px;
  line-height: 1.5;
  font-style: italic;
  color: #e0e0e0;
  border-top: 1px solid #555;
  padding-top: 15px;
`;
