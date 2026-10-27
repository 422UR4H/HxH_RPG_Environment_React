import styled from "styled-components";
import { colors } from "../../styles/tokens";
import Tooltip from "./Tooltip";

interface ExpBarProps {
  currExp: number;
  maxExp: number;
  color?: string;
}

export default function ExpBar({ currExp, maxExp, color = colors.vitalSkillExp }: ExpBarProps) {
  const percentage = maxExp > 0 ? Math.min((currExp / maxExp) * 100, 100) : 0;

  return (
    <Tooltip label={`${currExp}/${maxExp}`} placement="bottom" stretch>
      <BarTrack
        role="progressbar"
        tabIndex={0}
        aria-valuenow={currExp}
        aria-valuemin={0}
        aria-valuemax={maxExp}
      >
        <BarFill $percentage={percentage} $color={color} />
      </BarTrack>
    </Tooltip>
  );
}

// A área de toque/hover é maior que a barra de 4px (o pseudo-elemento sobe 10px).
const BarTrack = styled.div`
  position: relative;
  width: 100%;
  height: 4px;
  background: ${colors.surfaceNeutral};
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    inset: -10px 0 0 0;
  }
`;

const BarFill = styled.div<{ $percentage: number; $color: string }>`
  width: ${({ $percentage }) => $percentage}%;
  height: 100%;
  background-color: ${({ $color }) => $color};
  transition: width 0.3s ease;
`;
