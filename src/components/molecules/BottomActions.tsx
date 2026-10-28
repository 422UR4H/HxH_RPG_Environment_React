import { useEffect, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import ManageButton from "./ManageButton";
import type { ManageActions } from "./ManageButton";
import styled from "styled-components";
import { colors } from "../../styles/tokens";
import { floatingElevation } from "../../styles/bottomBar";

interface BottomActionsProps {
  containerRef: RefObject<HTMLDivElement | null>;
  contentChangeSignal?: unknown;
  manage?: ManageActions;
  primaryButton?: {
    label: string;
    /** "+" (`<PlusIcon />`) só em ação que cria algo; navegar vai sem ícone. */
    icon?: ReactNode;
    onClick: () => void;
  };
}

export default function BottomActions({
  containerRef,
  contentChangeSignal,
  manage,
  primaryButton,
}: BottomActionsProps) {
  const [isFloating, setIsFloating] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const debouncedScroll = useDebounce(scrollPosition, 50);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const checkScroll = () => setScrollPosition(el.scrollTop);
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [containerRef]);

  useEffect(() => {
    if (contentChangeSignal === undefined) return;
    const timers = [50, 150, 300, 500].map((t) =>
      setTimeout(() => {
        const el = containerRef.current;
        if (!el) return;
        setScrollPosition(el.scrollTop);
        setIsFloating(el.scrollTop + el.clientHeight < el.scrollHeight - 30);
      }, t),
    );
    return () => timers.forEach(clearTimeout);
  }, [contentChangeSignal, containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setIsFloating(debouncedScroll + el.clientHeight < el.scrollHeight - 30);
  }, [debouncedScroll, containerRef]);

  if (isFloating) {
    return (
      <FloatingWrapper>
        <FloatingGroup>
          {manage && <ManageButton {...manage} isFloating={true} />}
          {primaryButton && (
            <PrimaryButton $isFloating onClick={primaryButton.onClick}>
              {primaryButton.icon}
              <span>{primaryButton.label}</span>
            </PrimaryButton>
          )}
        </FloatingGroup>
      </FloatingWrapper>
    );
  }

  return (
    <AnchoredWrapper>
      {manage && <ManageButton {...manage} isFloating={false} />}
      {primaryButton && (
        <PrimaryButton $isFloating={false} onClick={primaryButton.onClick}>
          {primaryButton.icon}
          <span>{primaryButton.label}</span>
        </PrimaryButton>
      )}
    </AnchoredWrapper>
  );
}

const FloatingWrapper = styled.div`
  container-type: inline-size;
`;

const FloatingGroup = styled.div`
  position: fixed;
  bottom: 20px;
  left: 340px;
  z-index: 10;
  display: flex;
  gap: 12px;
  align-items: center;

  @media (max-width: 749px) {
    left: 40px;
  }
`;

const AnchoredWrapper = styled.div`
  container-type: inline-size;
  position: absolute;
  bottom: var(--bottom-bar-offset, 22px);
  left: 0;
  z-index: 10;
  height: var(--bottom-bar-height, 91px);
  width: 100%;
  display: flex;
  align-items: center;
  gap: 20px;

  @media (max-width: 609px) {
    gap: 15px;
  }
`;

// Um desenho só: encaixado ou flutuando, é a mesma pílula (CON-09). Muda a sombra e a largura.
const PrimaryButton = styled.button<{ $isFloating: boolean }>`
  border: none;
  border-radius: 50px;
  padding: 15px 30px 15px 26px;
  background-color: ${colors.brandAccent};
  color: ${colors.textPrimary};
  font-size: min(26px, 5cqi);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  ${({ $isFloating }) =>
    $isFloating
      ? `box-shadow: ${floatingElevation(colors.shadowFloating, colors.borderFloating, colors.borderFloatingHighlight)};`
      : `
        flex: 1;
        justify-content: center;
        /* A faixa encaixada é mais estreita que a área do flutuante: o recuo cede para o rótulo não quebrar. */
        white-space: nowrap;
        padding-inline: min(26px, 4cqi) min(30px, 4cqi);
      `}
  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;
