import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import styled from "styled-components";
import { colors } from "../../styles/tokens";

/** O card que tem texto de outro tamanho define esta variável com o tamanho do próprio texto. */
export const BAR_BUBBLE_FONT_SIZE = "--bar-bubble-font-size";

interface BarBubbleProps {
  label: string;
  align?: "center" | "right";
  children: ReactNode;
}

export default function BarBubble({ label, align = "center", children }: BarBubbleProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const show = () => {
    setVisible(true);
  };

  const hide = () => {
    setVisible(false);
  };

  const startLongPress = () => {
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, 400);
  };

  const cancelLongPress = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  return (
    <Wrapper
      onMouseEnter={show}
      onMouseLeave={hide}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
    >
      {visible && <Bubble $align={align}>{label}</Bubble>}
      {children}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    inset: -10px 0 0 0;
  }
`;

const Bubble = styled.div<{ $align: "center" | "right" }>`
  position: absolute;
  bottom: calc(100% + 4px);
  ${({ $align }) =>
    $align === "right"
      ? "right: 1cqi;"
      : "left: 50%; transform: translateX(-50%);"}
  background: ${colors.surfaceBar};
  color: ${colors.textPrimary};
  font-size: var(${BAR_BUBBLE_FONT_SIZE}, 5cqi);
  font-weight: 600;
  padding: 0.36em 0.6em;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
`;
