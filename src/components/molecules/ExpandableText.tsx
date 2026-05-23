import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import ExpandButton from "../ions/ExpandButton";
import { colors } from "../../styles/tokens";

interface ExpandableTextProps {
  children: React.ReactNode;
  backgroundColor?: string;
  onToggle?: () => void;
}

export default function ExpandableText({
  children,
  backgroundColor = colors.surfaceInput,
  onToggle,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!children || !textRef.current) return;
    const el = textRef.current;
    const orig = el.style.maxHeight;
    el.style.maxHeight = "none";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    const actualHeight = el.scrollHeight;
    el.style.maxHeight = orig;
    setShowButton(actualHeight > lineHeight * 5);
  }, [children, expanded]);

  if (!children) return null;

  const handleToggle = () => {
    setExpanded((prev) => !prev);
    onToggle?.();
  };

  return (
    <Container
      $expanded={expanded}
      $showButton={showButton}
      $backgroundColor={backgroundColor}
    >
      <p ref={textRef}>{children}</p>
      {showButton && (
        <ButtonContainer>
          <ExpandButton isExpanded={expanded} setIsExpanded={handleToggle} />
        </ButtonContainer>
      )}
    </Container>
  );
}

const Container = styled.div<{
  $expanded: boolean;
  $showButton: boolean;
  $backgroundColor: string;
}>`
  font-family: "Roboto", sans-serif;
  font-weight: 300;
  font-size: 18px;
  background-color: ${({ $backgroundColor }) => $backgroundColor};
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  position: relative;
  display: flex;
  flex-direction: column;

  p {
    line-height: 1.6;
    color: ${colors.textPrimary};
    max-height: ${({ $expanded }) => ($expanded ? "none" : "calc(1.6em * 5)")};
    overflow: hidden;
    position: relative;

    ${({ $expanded, $showButton }) =>
      !$expanded &&
      $showButton &&
      `
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 50px;
        box-shadow: inset 0 -40px 50px 0 ${colors.fadeSurfaceInput};
        pointer-events: none;
      }
    `}
  }
`;

const ButtonContainer = styled.div`
  position: absolute;
  left: 50%;
  bottom: -22px;
  transform: translateX(-50%);
  width: 54px;
`;
