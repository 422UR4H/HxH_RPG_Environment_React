import styled from "styled-components";
import { colors } from "../../styles/tokens";
import BarBubble from "./BarBubble";

interface ExpBarProps {
  currExp: number;
  maxExp: number;
  color?: string;
  tooltipAlign?: "center" | "right";
}

export default function ExpBar({ currExp, maxExp, color = colors.vitalSkillExp, tooltipAlign = "center" }: ExpBarProps) {
  const percentage = maxExp > 0 ? Math.min((currExp / maxExp) * 100, 100) : 0;

  return (
    <BarBubble label={`${currExp}/${maxExp}`} align={tooltipAlign}>
      <BarTrack
        role="progressbar"
        aria-valuenow={currExp}
        aria-valuemin={0}
        aria-valuemax={maxExp}
      >
        <BarFill $percentage={percentage} $color={color} />
      </BarTrack>
    </BarBubble>
  );
}

const BarTrack = styled.div`
  width: 100%;
  height: 4px;
  background: ${colors.surfaceNeutral};
`;

const BarFill = styled.div<{ $percentage: number; $color: string }>`
  width: ${({ $percentage }) => $percentage}%;
  height: 100%;
  background-color: ${({ $color }) => $color};
  transition: width 0.3s ease;
`;
