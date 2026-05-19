import styled from "styled-components";

interface CharacterExpBarProps {
  currExp: number;
  maxExp: number;
}

export default function CharacterExpBar({ currExp, maxExp }: CharacterExpBarProps) {
  const percentage = maxExp > 0 ? Math.min((currExp / maxExp) * 100, 100) : 0;

  return (
    <Container>
      {maxExp > 0 && <ExpLabel>{currExp}/{maxExp}</ExpLabel>}
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
  bottom: calc(100% + 3px);
  right: 1cqi;
  color: white;
  font-family: "Roboto", sans-serif;
  font-size: 4cqi;
  font-weight: 600;
  text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
`;

const BarBorder = styled.div`
  width: 100%;
  border: 3px solid black;

  @media (max-width: 609px) {
    border-width: 0.6cqi;
  }
`;

const BarBackground = styled.div`
  width: 100%;
  height: 1.3cqi;
  background-color: #444;
  overflow: hidden;
`;

const BarFill = styled.div<{ $percentage: number }>`
  width: ${({ $percentage }) => $percentage}%;
  height: 100%;
  background-color: #d4af37;
  transition: width 0.3s ease;
`;
