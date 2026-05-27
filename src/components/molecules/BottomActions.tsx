import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import ManageButton from "./ManageButton";
import PlusIcon from "../ions/PlusIcon";
import styled from "styled-components";
import { colors } from "../../styles/tokens";

interface BottomActionsProps {
  containerRef: RefObject<HTMLDivElement | null>;
  contentChangeSignal?: unknown;
  manage?: {
    isFree: boolean;
    deleteDisabledReason?: string;
    onEdit: () => void;
    onDelete: () => void;
    confirmMessage: string;
  };
  primaryButton?: {
    label: string;
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
            <FloatingPrimary onClick={primaryButton.onClick}>
              <PlusIcon />
              <span>{primaryButton.label}</span>
            </FloatingPrimary>
          )}
        </FloatingGroup>
      </FloatingWrapper>
    );
  }

  return (
    <AnchoredWrapper>
      {manage && <ManageButton {...manage} isFloating={false} />}
      {primaryButton && (
        <PrimaryButton onClick={primaryButton.onClick}>
          <PlusIcon />
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
`;

const FloatingPrimary = styled.button`
  border: none;
  border-radius: 50px;
  padding: 15px 30px 15px 26px;
  background-color: ${colors.brandAccent};
  color: ${colors.textPrimary};
  font-family: "Roboto", sans-serif;
  font-size: 26px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 4px 10px ${colors.shadowSoft};
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
    box-shadow: 0 8px 15px ${colors.shadowStrong};
  }
  &:active {
    transform: scale(0.98);
  }
`;

const AnchoredWrapper = styled.div`
  container-type: inline-size;
  position: absolute;
  bottom: 22px;
  left: 0;
  z-index: 10;
  height: 91px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 20px;

  @media (max-width: 609px) {
    gap: 15px;
  }

  @media (max-width: 440px) {
    height: 70px;
  }
`;

const PrimaryButton = styled.button`
  flex: 1;
  height: 100%;
  border: none;
  border-radius: 8px;
  background-color: ${colors.brandAccent};
  color: ${colors.textPrimary};
  font-family: "Roboto", sans-serif;
  font-size: min(26px, 5cqi);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: min(15px, 2cqi);
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;
