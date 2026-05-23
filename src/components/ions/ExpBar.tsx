import { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { colors } from "../../styles/tokens";

interface ExpBarProps {
  currExp: number;
  maxExp: number;
  color?: string;
  tooltipAlign?: "center" | "right";
}

export default function ExpBar({ currExp, maxExp, color = colors.redExpDefault, tooltipAlign = "center" }: ExpBarProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const showTooltip = () => {
    if (currExp > 0) setTooltipVisible(true);
  };

  const hideTooltip = () => {
    setTooltipVisible(false);
  };

  const startLongPress = () => {
    timerRef.current = setTimeout(() => {
      if (currExp > 0) setTooltipVisible(true);
    }, 400);
  };

  const cancelLongPress = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTooltipVisible(false);
  };

  const percentage = maxExp > 0 ? Math.min((currExp / maxExp) * 100, 100) : 0;

  return (
    <BarContainer
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
    >
      {tooltipVisible && <Tooltip $align={tooltipAlign}>{currExp}/{maxExp}</Tooltip>}
      <BarTrack
        role="progressbar"
        aria-valuenow={currExp}
        aria-valuemin={0}
        aria-valuemax={maxExp}
      >
        <BarFill $percentage={percentage} $color={color} />
      </BarTrack>
    </BarContainer>
  );
}

const BarContainer = styled.div`
  position: relative;
  width: 100%;
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    inset: -10px 0 0 0;
  }
`;

const Tooltip = styled.div<{ $align: "center" | "right" }>`
  position: absolute;
  bottom: calc(100% + 4px);
  ${({ $align }) =>
    $align === "right"
      ? "right: 1cqi;"
      : "left: 50%; transform: translateX(-50%);"}
  background: ${colors.grayBgDark};
  color: ${colors.textPrimary};
  font-family: "Roboto", sans-serif;
  font-size: 5cqi;
  font-weight: 600;
  padding: 1.8cqi 3cqi;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
`;

const BarTrack = styled.div`
  width: 100%;
  height: 4px;
  background: ${colors.grayMid};
`;

const BarFill = styled.div<{ $percentage: number; $color: string }>`
  width: ${({ $percentage }) => $percentage}%;
  height: 100%;
  background-color: ${({ $color }) => $color};
  transition: width 0.3s ease;
`;
