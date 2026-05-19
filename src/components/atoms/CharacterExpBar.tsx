import styled from "styled-components";

interface CharacterExpBarProps {
  currExp: number;
  maxExp: number;
}

export default function CharacterExpBar({ currExp, maxExp }: CharacterExpBarProps) {
  const percentage = maxExp > 0 ? Math.min((currExp / maxExp) * 100, 100) : 0;

  return (
    <BarBorder>
      <BarBackground>
        <BarFill $percentage={percentage} />
      </BarBackground>
    </BarBorder>
  );
}

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
