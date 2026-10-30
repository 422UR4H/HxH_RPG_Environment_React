import styled from "styled-components";
import type { Match } from "../../types/campaign";
import { colors } from "../../styles/tokens";
import { formatDateBR } from "../../utils/date";

interface MatchItemProps {
  match: Match;
  onClick: () => void;
}

export default function MatchItem({ match, onClick }: MatchItemProps) {
  return (
    <MatchContainer onClick={onClick}>
      <MatchDate>
        {(() => {
          const [year, month, day] = match.storyStartAt.split("-");
          return `${day}/${month}/${year}`;
        })()}
      </MatchDate>
      <MatchTitle>{match.title}</MatchTitle>
      <MatchDescription>{match.briefInitialDescription}</MatchDescription>

      {match.briefFinalDescription && (
        <MatchFinalDescription>
          {match.briefFinalDescription}
        </MatchFinalDescription>
      )}

      {match.storyEndAt && (
        <MatchEndDate>
          Fim: {formatDateBR(match.storyEndAt)}
        </MatchEndDate>
      )}
    </MatchContainer>
  );
}

const MatchContainer = styled.div`
  background-color: ${colors.surfaceTabItem};
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s;
  /* Os filhos consultam a largura útil do card (não da tela; sem o padding) para decidir
     onde a data fica. */
  container-type: inline-size;

  &:hover {
    background-color: ${colors.surfaceTabItemHover};
  }
`;

const MatchTitle = styled.h3`
  font-weight: 700;
  font-size: 24px;
  margin-bottom: 10px;
  padding-right: 100px;

  @container (max-width: 320px) {
    padding-right: 0;
  }
`;

const MatchDate = styled.div`
  position: absolute;
  right: 20px;
  top: 20px;

  font-weight: 400;
  font-size: 16px;
  color: ${colors.textPrimary};

  /* Card estreito: a data vira sobretítulo, no fluxo, antes do título. */
  @container (max-width: 320px) {
    position: static;
    font-size: 14px;
    margin-bottom: 4px;
  }
`;

const MatchEndDate = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;

  font-weight: 400;
  font-size: 16px;
  color: ${colors.textPrimary};

  /* Card estreito: "Fim:" segue o fluxo, depois da descrição final. */
  @container (max-width: 320px) {
    position: static;
    margin-top: 10px;
  }
`;

const MatchDescription = styled.p`
  font-weight: 300;
  font-size: 18px;
  line-height: 1.5;
  margin-bottom: 15px;
`;

const MatchFinalDescription = styled.p`
  font-weight: 400;
  font-size: 18px;
  line-height: 1.5;
  font-style: italic;
  color: ${colors.textMuted};
  border-top: 1px solid ${colors.borderMuted};
  padding-top: 15px;
  padding-right: 140px;

  @container (max-width: 320px) {
    padding-right: 0;
  }
`;
