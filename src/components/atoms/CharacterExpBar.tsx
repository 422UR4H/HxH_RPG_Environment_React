import styled from "styled-components";
import { colors } from "../../styles/tokens";

interface CharacterExpBarProps {
  currExp: number;
  maxExp: number;
}

export default function CharacterExpBar({ currExp, maxExp }: CharacterExpBarProps) {
  const percentage = maxExp > 0 ? Math.min((currExp / maxExp) * 100, 100) : 0;

  return (
    <Container>
      {maxExp > 0 && <ExpLabel>{currExp} / {maxExp}</ExpLabel>}
      <BarBorder>
        <BarBackground>
          <BarFill $percentage={percentage} />
        </BarBackground>
      </BarBorder>
    </Container>
  );
}

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const ExpLabel = styled.span`
  position: absolute;
  bottom: calc(100% + 2px);
  right: 12px;
  color: ${colors.textPrimary};
  font-family: "Roboto", sans-serif;
  font-size: 3cqi;
  font-weight: 600;
  text-shadow: 1px 1px 4px ${colors.shadowText};
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;

  @container (max-width: 609px) {
    right: 3%;
    font-size: 4cqi;
  }
`;

const BarBorder = styled.div`
  width: 100%;
  border: 3px solid ${colors.textOnLight};

  @container (max-width: 609px) {
    border-width: 0.6cqi;
    bottom: calc(100% + 1px);
  }
`;

const BarBackground = styled.div`
  width: 100%;
  height: 1.3cqi;
  background-color: ${colors.surfaceControl};
  overflow: hidden;
`;

const BarFill = styled.div<{ $percentage: number }>`
  width: ${({ $percentage }) => $percentage}%;
  height: 100%;
  background-color: ${colors.goldExp};
  transition: width 0.3s ease;
`;
