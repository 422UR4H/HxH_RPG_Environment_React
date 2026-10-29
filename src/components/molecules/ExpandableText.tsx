import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import ExpandButton from "../ions/ExpandButton";
import { COLLAPSE_DURATION, COLLAPSE_EASING } from "../atoms/Collapse";
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
  const [fullHeight, setFullHeight] = useState(0);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Mede o texto inteiro (scrollHeight vale mesmo com max-height) para animar o max-height
  // entre a altura recolhida (5 linhas) e a total, nos dois sentidos. O ResizeObserver remede
  // quando a largura muda sem resize de janela (sidebar, container query, fonte tardia), para o
  // texto aberto nunca ficar cortado por um max-height velho.
  useEffect(() => {
    if (!children || !textRef.current) return;
    const el = textRef.current;
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      setFullHeight(el.scrollHeight);
      setShowButton(el.scrollHeight > lineHeight * 5);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);

  if (!children) return null;

  const handleToggle = () => {
    setExpanded((prev) => !prev);
    onToggle?.();
  };

  return (
    <Container
      $expanded={expanded}
      $fullHeight={fullHeight}
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
  $fullHeight: number;
  $showButton: boolean;
  $backgroundColor: string;
}>`
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
    max-height: ${({ $expanded, $fullHeight }) =>
      $expanded && $fullHeight ? `${$fullHeight}px` : "calc(1.6em * 5)"};
    overflow: hidden;
    position: relative;
    transition: max-height ${COLLAPSE_DURATION} ${COLLAPSE_EASING};

    /* O degradê some ao abrir e volta ao fechar, na mesma curva da altura. */
    ${({ $showButton }) =>
      $showButton &&
      `
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 50px;
        box-shadow: inset 0 -40px 50px 0 ${colors.surfaceFade};
        pointer-events: none;
        transition: opacity ${COLLAPSE_DURATION} ${COLLAPSE_EASING};
      }
    `}
    ${({ $expanded }) => $expanded && "&::after { opacity: 0; }"}

    @media (prefers-reduced-motion: reduce) {
      transition: none;
      &::after {
        transition: none;
      }
    }
  }
`;

const ButtonContainer = styled.div`
  position: absolute;
  left: 50%;
  bottom: -22px;
  transform: translateX(-50%);
  width: 54px;
`;
